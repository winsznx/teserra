use anchor_lang::prelude::*;

use crate::state::PublicInputBuffer;

#[derive(Accounts)]
#[instruction(batch_id: [u8; 32])]
pub struct InitProofStaging<'info> {
    #[account(
        init,
        seeds = [PublicInputBuffer::SEED, owner.key().as_ref(), batch_id.as_ref()],
        bump,
        payer = owner,
        space = PublicInputBuffer::LEN,
    )]
    pub buffer: AccountLoader<'info, PublicInputBuffer>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitProofStaging>, batch_id: [u8; 32]) -> Result<()> {
    let mut buffer = ctx.accounts.buffer.load_init()?;
    buffer.owner = ctx.accounts.owner.key();
    buffer.batch_id = batch_id;
    buffer.created_at = Clock::get()?.unix_timestamp;
    buffer.expected_count = PublicInputBuffer::EXPECTED_COUNT;
    buffer.written_count = 0;
    buffer.finalized = 0;
    buffer.bump = ctx.bumps.buffer;
    buffer._padding = [0; 4];
    // signals zeroed by AccountLoader::load_init
    Ok(())
}
