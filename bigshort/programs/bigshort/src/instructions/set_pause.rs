use anchor_lang::prelude::*;

use crate::error::VaultError;
use crate::state::Vault;

#[derive(Accounts)]
pub struct SetPause<'info> {
    pub authority: Signer<'info>,

    #[account(mut, has_one = authority @ VaultError::Unauthorized)]
    pub vault: Account<'info, Vault>,
}

pub fn handler(ctx: Context<SetPause>, paused: bool) -> Result<()> {
    ctx.accounts.vault.paused = paused;
    Ok(())
}
