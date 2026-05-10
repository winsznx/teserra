use anchor_lang::prelude::*;

use crate::errors::TesseraError;
use crate::state::PublicInputBuffer;

#[derive(Accounts)]
#[instruction(batch_id: [u8; 32])]
pub struct AppendPublicInputs<'info> {
    #[account(
        mut,
        seeds = [PublicInputBuffer::SEED, owner.key().as_ref(), batch_id.as_ref()],
        bump = buffer.load()?.bump,
    )]
    pub buffer: AccountLoader<'info, PublicInputBuffer>,

    pub owner: Signer<'info>,
}

pub fn handler(
    ctx: Context<AppendPublicInputs>,
    batch_id: [u8; 32],
    offset: u16,
    inputs: Vec<[u8; 32]>,
) -> Result<()> {
    let mut buffer = ctx.accounts.buffer.load_mut()?;

    require!(buffer.owner == ctx.accounts.owner.key(), TesseraError::BufferWrongOwner);
    require!(buffer.finalized == 0, TesseraError::BufferAlreadyFinalized);
    require!(buffer.batch_id == batch_id, TesseraError::BatchIdMismatch);

    let end = offset
        .checked_add(inputs.len() as u16)
        .ok_or(error!(TesseraError::BufferOffsetOutOfRange))?;
    require!(end <= buffer.expected_count, TesseraError::BufferOffsetOutOfRange);

    for (i, signal) in inputs.iter().enumerate() {
        buffer.signals[(offset as usize) + i] = *signal;
    }

    if end > buffer.written_count {
        buffer.written_count = end;
    }

    if buffer.written_count == buffer.expected_count {
        buffer.finalized = 1;
    }

    Ok(())
}
