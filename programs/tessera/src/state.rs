use anchor_lang::prelude::*;

#[account]
pub struct TesseraState {
    pub admin: Pubkey,
    pub fee_lamports: u64,
    pub total_credentials_issued: u64,
    pub merkle_tree: Pubkey,
    pub bump: u8,
}

impl TesseraState {
    pub const LEN: usize = 8 + 32 + 8 + 8 + 32 + 1;
    pub const SEED: &'static [u8] = b"tessera_state";
}

#[account]
pub struct Credential {
    pub owner: Pubkey,
    pub income_above_threshold: bool,
    pub threshold: u64,
    pub start_ts: i64,
    pub end_ts: i64,
    pub date_range_hash: [u8; 32],
    pub merkle_root: [u8; 32],
    pub employer_commitment: [u8; 32],
    pub proof_hash: [u8; 32],
    pub nullifier_hashes: [[u8; 32]; 32],
    pub issued_at: i64,
    pub expires_at: i64,
    pub issuer: Pubkey,
    pub cnft_asset_id: Pubkey,
    pub bump: u8,
}

impl Credential {
    pub const LEN: usize =
        8 + 32 + 1 + 8 + 8 + 8 + 32 + 32 + 32 + 32 + (32 * 32) + 8 + 8 + 32 + 32 + 1;
    pub const SEED: &'static [u8] = b"credential";
}

#[account]
pub struct NullifierRecord {
    pub nullifier_hash: [u8; 32],
    pub credential_pda: Pubkey,
    pub consumed_at: i64,
    pub bump: u8,
}

impl NullifierRecord {
    pub const LEN: usize = 8 + 32 + 32 + 8 + 1;
    pub const SEED: &'static [u8] = b"nullifier";
}

/// Staged public-signal buffer. Solana's 1232-byte tx limit prevents passing
/// the v2 circuit's 39 × 32-byte public signals as instruction data; the user
/// stages them across two cheap `append_public_inputs` calls before invoking
/// `verify_income_proof`. The buffer is closed (rent refunded) on a successful
/// verify; on failure the buffer remains for retry without re-staging.
///
/// `#[account(zero_copy)]` keeps the 1.3 KB struct off the stack during
/// `try_accounts` deserialization. The 39 signals live as one `[[u8; 32]; 39]`
/// array — zero-copy bypasses the borsh derive that lacks a 39-arity impl.
#[account(zero_copy(unsafe))]
#[repr(C)]
pub struct PublicInputBuffer {
    pub owner: Pubkey,
    pub batch_id: [u8; 32],
    pub created_at: i64,
    pub expected_count: u16,
    pub written_count: u16,
    pub finalized: u8,
    pub bump: u8,
    pub _padding: [u8; 4],
    pub signals: [[u8; 32]; 39],
}

impl PublicInputBuffer {
    pub const LEN: usize = 8 + std::mem::size_of::<Self>();
    pub const SEED: &'static [u8] = b"public_input_buffer";
    pub const EXPECTED_COUNT: u16 = 39;
}
