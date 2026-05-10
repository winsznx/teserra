use anchor_lang::prelude::*;

#[error_code]
pub enum TesseraError {
    #[msg("Groth16 proof verification failed")]
    ProofVerificationFailed,
    #[msg("Public signals length mismatch")]
    PublicSignalsLengthMismatch,
    #[msg("Nullifier already consumed")]
    NullifierAlreadyConsumed,
    #[msg("Credential already exists for this proof hash")]
    CredentialAlreadyExists,
    #[msg("validProof signal must be 1")]
    InvalidProofSignal,
    #[msg("startTs must be < endTs")]
    InvalidDateRange,
    #[msg("Merkle root does not match a known Umbra pool state")]
    InvalidMerkleRoot,
    #[msg("Credential expired")]
    CredentialExpired,
    #[msg("Credential threshold below required")]
    ThresholdBelowRequired,
    #[msg("Invalid public input encoding")]
    InvalidPublicInput,
    #[msg("Nullifier record account count mismatch")]
    NullifierAccountCountMismatch,
    #[msg("Public input buffer is already finalized")]
    BufferAlreadyFinalized,
    #[msg("Public input buffer is not finalized")]
    BufferNotFinalized,
    #[msg("Public input buffer owner mismatch")]
    BufferWrongOwner,
    #[msg("Append offset is out of range")]
    BufferOffsetOutOfRange,
    #[msg("Public input buffer count mismatch")]
    BufferCountMismatch,
    #[msg("Batch id mismatch")]
    BatchIdMismatch,
}
