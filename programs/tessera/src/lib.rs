use anchor_lang::prelude::*;

declare_id!("9jCxFKjcwt7uYZtPwfEh2gPt7BdKxW6qEwuwbFStWCKd");

pub mod append_public_inputs;
pub mod errors;
pub mod events;
pub mod init_proof_staging;
pub mod initialize;
pub mod state;
pub mod verifier_constants;
pub mod verify_credential;
pub mod verify_income_proof;

use append_public_inputs::*;
use init_proof_staging::*;
use initialize::*;
use verify_credential::*;
use verify_income_proof::*;

#[program]
pub mod tessera {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        initialize::handler(ctx)
    }

    pub fn init_proof_staging(
        ctx: Context<InitProofStaging>,
        batch_id: [u8; 32],
    ) -> Result<()> {
        init_proof_staging::handler(ctx, batch_id)
    }

    pub fn append_public_inputs(
        ctx: Context<AppendPublicInputs>,
        batch_id: [u8; 32],
        offset: u16,
        inputs: Vec<[u8; 32]>,
    ) -> Result<()> {
        append_public_inputs::handler(ctx, batch_id, offset, inputs)
    }

    pub fn verify_income_proof<'info>(
        ctx: Context<'_, '_, '_, 'info, VerifyIncomeProof<'info>>,
        proof_a: [u8; 64],
        proof_b: [u8; 128],
        proof_c: [u8; 64],
        batch_id: [u8; 32],
        metadata_uri: String,
    ) -> Result<()> {
        verify_income_proof::handler(ctx, proof_a, proof_b, proof_c, batch_id, metadata_uri)
    }

    pub fn verify_credential(
        ctx: Context<VerifyCredential>,
        required_threshold: u64,
    ) -> Result<VerifyCredentialResult> {
        verify_credential::handler(ctx, required_threshold)
    }
}
