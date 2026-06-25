use anchor_lang::prelude::*;
use anchor_spl::token::{self, Burn, Mint, Token, TokenAccount, Transfer};

use crate::constants::{BASE_SEED, QUOTE_SEED, SHARE_SEED};
use crate::error::VaultError;
use crate::state::Vault;

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub depositor: Signer<'info>,

    #[account(mut, has_one = quote_mint, has_one = share_mint, has_one = quote_vault)]
    pub vault: Box<Account<'info, Vault>>,

    pub quote_mint: Box<Account<'info, Mint>>,

    #[account(mut, seeds = [SHARE_SEED, vault.key().as_ref()], bump)]
    pub share_mint: Box<Account<'info, Mint>>,

    #[account(mut, seeds = [QUOTE_SEED, vault.key().as_ref()], bump)]
    pub quote_vault: Box<Account<'info, TokenAccount>>,

    #[account(seeds = [BASE_SEED, vault.key().as_ref()], bump)]
    pub base_vault: Box<Account<'info, TokenAccount>>,

    #[account(mut, token::mint = quote_mint, token::authority = depositor)]
    pub depositor_quote: Box<Account<'info, TokenAccount>>,

    #[account(mut, token::mint = share_mint, token::authority = depositor)]
    pub depositor_share: Box<Account<'info, TokenAccount>>,

    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<Withdraw>, shares: u64) -> Result<()> {
    let vault = &ctx.accounts.vault;
    require!(!vault.paused, VaultError::Paused);
    require!(shares > 0, VaultError::ZeroAmount);
    require!(shares <= vault.total_shares, VaultError::ZeroAmount);

    let idle = ctx.accounts.quote_vault.amount;
    let idle_base = ctx.accounts.base_vault.amount;
    let nav = vault.nav(idle, idle_base)?;

    let amount_out = u64::try_from(
        (shares as u128)
            .checked_mul(nav as u128)
            .ok_or(VaultError::MathOverflow)?
            .checked_div(vault.total_shares as u128)
            .ok_or(VaultError::MathOverflow)?,
    )
    .map_err(|_| VaultError::MathOverflow)?;

    require!(amount_out > 0, VaultError::ZeroAmount);
    require!(idle >= amount_out, VaultError::InsufficientLiquidity);

    token::burn(
        CpiContext::new(
            ctx.accounts.token_program.key(),
            Burn {
                mint: ctx.accounts.share_mint.to_account_info(),
                from: ctx.accounts.depositor_share.to_account_info(),
                authority: ctx.accounts.depositor.to_account_info(),
            },
        ),
        shares,
    )?;

    let quote_mint = ctx.accounts.quote_mint.key();
    let seeds = ctx.accounts.vault.signer_seeds(&quote_mint);
    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.key(),
            Transfer {
                from: ctx.accounts.quote_vault.to_account_info(),
                to: ctx.accounts.depositor_quote.to_account_info(),
                authority: ctx.accounts.vault.to_account_info(),
            },
            &[&seeds],
        ),
        amount_out,
    )?;

    let vault = &mut ctx.accounts.vault;
    vault.total_shares = vault
        .total_shares
        .checked_sub(shares)
        .ok_or(VaultError::MathOverflow)?;

    Ok(())
}
