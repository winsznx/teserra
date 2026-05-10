use anchor_lang::prelude::*;

use crate::state::TesseraState;

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        seeds = [TesseraState::SEED],
        bump,
        payer = admin,
        space = TesseraState::LEN,
    )]
    pub state: Account<'info, TesseraState>,

    #[account(mut)]
    pub admin: Signer<'info>,

    /// CHECK: validated as the merkle tree we'll mint cnfts under
    pub merkle_tree: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<Initialize>) -> Result<()> {
    let state = &mut ctx.accounts.state;
    state.admin = ctx.accounts.admin.key();
    state.fee_lamports = 0;
    state.total_credentials_issued = 0;
    state.merkle_tree = ctx.accounts.merkle_tree.key();
    state.bump = ctx.bumps.state;
    Ok(())
}
