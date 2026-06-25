use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, MintTo, Token, TokenAccount, Transfer};

use crate::constants::{BASE_SEED, QUOTE_SEED, SHARE_SEED};
use crate::error::VaultError;
use crate::state::Vault;

#[derive(Accounts)]
pub struct Deposit<'info> {
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

pub fn handler(ctx: Context<Deposit>, amount: u64) -> Result<()> {
    let vault = &ctx.accounts.vault;
    require!(!vault.paused, VaultError::Paused);
    require!(amount > 0, VaultError::ZeroAmount);

    let idle = ctx.accounts.quote_vault.amount;
    let idle_base = ctx.accounts.base_vault.amount;

    let shares = if vault.total_shares == 0 {
        amount
    } else {
        let nav = vault.nav(idle, idle_base)?;
        u64::try_from(
            (amount as u128)
                .checked_mul(vault.total_shares as u128)
                .ok_or(VaultError::MathOverflow)?
                .checked_div(nav as u128)
                .ok_or(VaultError::MathOverflow)?,
        )
        .map_err(|_| VaultError::MathOverflow)?
    };
    require!(shares > 0, VaultError::ZeroAmount);

    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.key(),
            Transfer {
                from: ctx.accounts.depositor_quote.to_account_info(),
                to: ctx.accounts.quote_vault.to_account_info(),
                authority: ctx.accounts.depositor.to_account_info(),
            },
        ),
        amount,
    )?;

    let quote_mint = ctx.accounts.quote_mint.key();
    let seeds = ctx.accounts.vault.signer_seeds(&quote_mint);
    token::mint_to(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.key(),
            MintTo {
                mint: ctx.accounts.share_mint.to_account_info(),
                to: ctx.accounts.depositor_share.to_account_info(),
                authority: ctx.accounts.vault.to_account_info(),
            },
            &[&seeds],
        ),
        shares,
    )?;

    let vault = &mut ctx.accounts.vault;
    vault.total_shares = vault
        .total_shares
        .checked_add(shares)
        .ok_or(VaultError::MathOverflow)?;

    Ok(())
}
