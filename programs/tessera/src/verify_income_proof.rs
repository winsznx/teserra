use anchor_lang::prelude::*;
use anchor_lang::solana_program::keccak;
use groth16_solana::groth16::Groth16Verifier;
use mpl_bubblegum::types::{Creator, MetadataArgs, TokenProgramVersion, TokenStandard};

use crate::errors::TesseraError;
use crate::events::{CredentialMinted, NullifierConsumed, ProofVerified};
use crate::state::{Credential, NullifierRecord, PublicInputBuffer, TesseraState};
use crate::verifier_constants::VERIFYING_KEY;

pub const PUBLIC_SIGNALS_COUNT: usize = 39;
// snarkjs publicSignals layout: output (validProof) first, then public inputs in
// circuit declaration order:
//   [0]      validProof
//   [1]      threshold
//   [2]      startTs
//   [3]      endTs
//   [4]      merkleRoot
//   [5]      employerCommitment
//   [6..38]  nullifierHash[0..32]
//   [38]     dateRangeHash
pub const IDX_VALID_PROOF: usize = 0;
pub const IDX_THRESHOLD: usize = 1;
pub const IDX_START_TS: usize = 2;
pub const IDX_END_TS: usize = 3;
pub const IDX_MERKLE_ROOT: usize = 4;
pub const IDX_EMPLOYER_COMMITMENT: usize = 5;
pub const NULLIFIER_BASE_OFFSET: usize = 6;
pub const NULLIFIER_COUNT: usize = 32;
pub const IDX_DATE_RANGE_HASH: usize = NULLIFIER_BASE_OFFSET + NULLIFIER_COUNT; // 38
pub const CREDENTIAL_VALIDITY_SECS: i64 = 90 * 24 * 60 * 60;
pub const MAX_METADATA_URI_LEN: usize = 200;

pub fn derive_proof_hash(a: &[u8; 64], b: &[u8; 128], c: &[u8; 64]) -> [u8; 32] {
    let mut data = Vec::with_capacity(256);
    data.extend_from_slice(a);
    data.extend_from_slice(b);
    data.extend_from_slice(c);
    keccak::hash(&data).to_bytes()
}

#[inline]
fn u64_be32(bytes: &[u8; 32]) -> u64 {
    let mut buf = [0u8; 8];
    buf.copy_from_slice(&bytes[24..32]);
    u64::from_be_bytes(buf)
}

#[inline]
fn i64_be32(bytes: &[u8; 32]) -> i64 {
    u64_be32(bytes) as i64
}

#[derive(Accounts)]
#[instruction(
    proof_a: [u8; 64],
    proof_b: [u8; 128],
    proof_c: [u8; 64],
    batch_id: [u8; 32],
)]
pub struct VerifyIncomeProof<'info> {
    #[account(
        mut,
        seeds = [TesseraState::SEED],
        bump = state.bump,
    )]
    pub state: Box<Account<'info, TesseraState>>,

    /// Public-input buffer staged by `init_proof_staging` + `append_public_inputs`.
    /// Closed (rent refunded) on a successful verify; left intact on failure so
    /// the user can retry without re-staging 1.2 KB of data.
    #[account(
        mut,
        seeds = [PublicInputBuffer::SEED, owner.key().as_ref(), batch_id.as_ref()],
        bump = buffer.load()?.bump,
        close = owner,
    )]
    pub buffer: AccountLoader<'info, PublicInputBuffer>,

    #[account(
        init,
        seeds = [
            Credential::SEED,
            owner.key().as_ref(),
            &derive_proof_hash(&proof_a, &proof_b, &proof_c),
        ],
        bump,
        payer = owner,
        space = Credential::LEN,
    )]
    pub credential: Box<Account<'info, Credential>>,

    #[account(mut)]
    pub owner: Signer<'info>,

    /// CHECK: must match state.merkle_tree
    #[account(mut, address = state.merkle_tree)]
    pub merkle_tree: UncheckedAccount<'info>,

    /// CHECK: bubblegum tree authority PDA
    #[account(
        mut,
        seeds = [merkle_tree.key().as_ref()],
        seeds::program = mpl_bubblegum::ID,
        bump,
    )]
    pub tree_authority: UncheckedAccount<'info>,

    /// CHECK: SPL Noop logging program; bubblegum validates
    pub log_wrapper: UncheckedAccount<'info>,
    /// CHECK: SPL Account Compression program; bubblegum validates
    pub compression_program: UncheckedAccount<'info>,
    /// CHECK: bubblegum program id
    #[account(address = mpl_bubblegum::ID)]
    pub bubblegum_program: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

pub fn handler<'info>(
    ctx: Context<'_, '_, '_, 'info, VerifyIncomeProof<'info>>,
    proof_a: [u8; 64],
    proof_b: [u8; 128],
    proof_c: [u8; 64],
    batch_id: [u8; 32],
    metadata_uri: String,
) -> Result<()> {
    // ── F.0 buffer gating ────────────────────────────────────────────────
    let buffer = ctx.accounts.buffer.load()?;
    require!(buffer.owner == ctx.accounts.owner.key(), TesseraError::BufferWrongOwner);
    require!(buffer.batch_id == batch_id, TesseraError::BatchIdMismatch);
    require!(buffer.finalized != 0, TesseraError::BufferNotFinalized);
    require!(
        buffer.written_count == buffer.expected_count,
        TesseraError::BufferCountMismatch
    );

    require!(
        metadata_uri.len() <= MAX_METADATA_URI_LEN && !metadata_uri.is_empty(),
        TesseraError::InvalidPublicInput
    );

    let signals = &buffer.signals;

    // ── F.2 parse signals (snarkjs layout: validProof first, then inputs) ─
    let valid_proof_signal = u64_be32(&signals[IDX_VALID_PROOF]);
    require!(valid_proof_signal == 1, TesseraError::InvalidProofSignal);

    let threshold = u64_be32(&signals[IDX_THRESHOLD]);
    let start_ts = i64_be32(&signals[IDX_START_TS]);
    let end_ts = i64_be32(&signals[IDX_END_TS]);
    let merkle_root = signals[IDX_MERKLE_ROOT];
    let employer_commitment = signals[IDX_EMPLOYER_COMMITMENT];
    let date_range_hash = signals[IDX_DATE_RANGE_HASH];

    // ── F.3 date range ────────────────────────────────────────────────────
    require!(start_ts < end_ts, TesseraError::InvalidDateRange);

    // ── F.4 Groth16 verification ──────────────────────────────────────────
    let mut verifier =
        Groth16Verifier::new(&proof_a, &proof_b, &proof_c, signals, &VERIFYING_KEY)
            .map_err(|_| error!(TesseraError::ProofVerificationFailed))?;
    verifier
        .verify()
        .map_err(|_| error!(TesseraError::ProofVerificationFailed))?;

    // ── F.5 capture nullifier list BEFORE dropping the buffer borrow ──────
    let mut nullifier_array = [[0u8; 32]; NULLIFIER_COUNT];
    let mut active_nullifiers: Vec<[u8; 32]> = Vec::with_capacity(NULLIFIER_COUNT);
    for i in 0..NULLIFIER_COUNT {
        let nh = signals[NULLIFIER_BASE_OFFSET + i];
        nullifier_array[i] = nh;
        if nh.iter().any(|b| *b != 0) {
            active_nullifiers.push(nh);
        }
    }
    drop(buffer);

    let proof_hash = derive_proof_hash(&proof_a, &proof_b, &proof_c);
    let credential_pda = ctx.accounts.credential.key();
    let now = Clock::get()?.unix_timestamp;

    require_eq!(
        ctx.remaining_accounts.len(),
        active_nullifiers.len(),
        TesseraError::NullifierAccountCountMismatch
    );

    for (idx, nh) in active_nullifiers.iter().enumerate() {
        let acct_info = &ctx.remaining_accounts[idx];

        let seeds: &[&[u8]] = &[NullifierRecord::SEED, nh.as_ref()];
        let (expected_pda, bump) = Pubkey::find_program_address(seeds, ctx.program_id);
        require_keys_eq!(*acct_info.key, expected_pda, TesseraError::InvalidPublicInput);

        if !acct_info.data_is_empty() {
            return err!(TesseraError::NullifierAlreadyConsumed);
        }

        let rent = Rent::get()?;
        let lamports = rent.minimum_balance(NullifierRecord::LEN);
        let signer_seeds: &[&[&[u8]]] = &[&[NullifierRecord::SEED, nh.as_ref(), &[bump]]];

        anchor_lang::system_program::create_account(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                anchor_lang::system_program::CreateAccount {
                    from: ctx.accounts.owner.to_account_info(),
                    to: acct_info.clone(),
                },
                signer_seeds,
            ),
            lamports,
            NullifierRecord::LEN as u64,
            ctx.program_id,
        )?;

        let record = NullifierRecord {
            nullifier_hash: *nh,
            credential_pda,
            consumed_at: now,
            bump,
        };
        let mut data = acct_info.try_borrow_mut_data()?;
        let disc = <NullifierRecord as anchor_lang::Discriminator>::DISCRIMINATOR;
        data[..8].copy_from_slice(&disc);
        let mut writer = &mut data[8..];
        record.serialize(&mut writer)?;

        emit!(NullifierConsumed {
            nullifier_hash: *nh,
            credential_pda,
        });
    }

    // ── F.6 populate credential ───────────────────────────────────────────
    let credential = &mut ctx.accounts.credential;
    credential.owner = ctx.accounts.owner.key();
    credential.income_above_threshold = true;
    credential.threshold = threshold;
    credential.start_ts = start_ts;
    credential.end_ts = end_ts;
    credential.date_range_hash = date_range_hash;
    credential.merkle_root = merkle_root;
    credential.employer_commitment = employer_commitment;
    credential.proof_hash = proof_hash;
    credential.nullifier_hashes = nullifier_array;
    credential.issued_at = now;
    credential.expires_at = now + CREDENTIAL_VALIDITY_SECS;
    credential.issuer = ctx.accounts.state.key();
    credential.cnft_asset_id = Pubkey::default();
    credential.bump = ctx.bumps.credential;

    emit!(ProofVerified {
        owner: credential.owner,
        threshold,
        merkle_root,
        timestamp: now,
    });

    // ── F.7 Bubblegum CPI mint ────────────────────────────────────────────
    let metadata = MetadataArgs {
        name: "TESSERA Credential".to_string(),
        symbol: "TSRA".to_string(),
        uri: metadata_uri,
        seller_fee_basis_points: 0,
        primary_sale_happened: false,
        is_mutable: false,
        edition_nonce: None,
        token_standard: Some(TokenStandard::NonFungible),
        collection: None,
        uses: None,
        token_program_version: TokenProgramVersion::Original,
        creators: vec![Creator {
            address: ctx.accounts.state.key(),
            verified: false,
            share: 100,
        }],
    };

    let cpi_accounts = mpl_bubblegum::instructions::MintV1CpiAccounts {
        tree_config: &ctx.accounts.tree_authority.to_account_info(),
        leaf_owner: &ctx.accounts.owner.to_account_info(),
        leaf_delegate: &ctx.accounts.owner.to_account_info(),
        merkle_tree: &ctx.accounts.merkle_tree.to_account_info(),
        payer: &ctx.accounts.owner.to_account_info(),
        tree_creator_or_delegate: &ctx.accounts.owner.to_account_info(),
        log_wrapper: &ctx.accounts.log_wrapper.to_account_info(),
        compression_program: &ctx.accounts.compression_program.to_account_info(),
        system_program: &ctx.accounts.system_program.to_account_info(),
    };

    mpl_bubblegum::instructions::MintV1Cpi::new(
        &ctx.accounts.bubblegum_program.to_account_info(),
        cpi_accounts,
        mpl_bubblegum::instructions::MintV1InstructionArgs { metadata },
    )
    .invoke()?;

    credential.cnft_asset_id = ctx.accounts.merkle_tree.key();

    ctx.accounts.state.total_credentials_issued = ctx
        .accounts
        .state
        .total_credentials_issued
        .checked_add(1)
        .ok_or(error!(TesseraError::InvalidPublicInput))?;

    emit!(CredentialMinted {
        credential_pda,
        owner: credential.owner,
        cnft_asset_id: credential.cnft_asset_id,
        issued_at: credential.issued_at,
        expires_at: credential.expires_at,
    });

    Ok(())
}
