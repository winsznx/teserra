use anchor_lang::prelude::*;

use crate::state::Credential;

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct VerifyCredentialResult {
    pub valid: bool,
    pub threshold: u64,
    pub expires_at: i64,
    /// 0 = valid, 1 = expired, 2 = below threshold
    pub reason: u8,
}

#[derive(Accounts)]
pub struct VerifyCredential<'info> {
    pub credential: Account<'info, Credential>,
}

pub fn handler(
    ctx: Context<VerifyCredential>,
    required_threshold: u64,
) -> Result<VerifyCredentialResult> {
    let credential = &ctx.accounts.credential;
    let now = Clock::get()?.unix_timestamp;

    if credential.expires_at < now {
        return Ok(VerifyCredentialResult {
            valid: false,
            threshold: credential.threshold,
            expires_at: credential.expires_at,
            reason: 1,
        });
    }

    if credential.threshold < required_threshold {
        return Ok(VerifyCredentialResult {
            valid: false,
            threshold: credential.threshold,
            expires_at: credential.expires_at,
            reason: 2,
        });
    }

    Ok(VerifyCredentialResult {
        valid: true,
        threshold: credential.threshold,
        expires_at: credential.expires_at,
        reason: 0,
    })
}
