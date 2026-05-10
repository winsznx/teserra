use anchor_lang::prelude::*;

#[event]
pub struct ProofVerified {
    pub owner: Pubkey,
    pub threshold: u64,
    pub merkle_root: [u8; 32],
    pub timestamp: i64,
}

#[event]
pub struct CredentialMinted {
    pub credential_pda: Pubkey,
    pub owner: Pubkey,
    pub cnft_asset_id: Pubkey,
    pub issued_at: i64,
    pub expires_at: i64,
}

#[event]
pub struct NullifierConsumed {
    pub nullifier_hash: [u8; 32],
    pub credential_pda: Pubkey,
}
