use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

use crate::constants::{BASE_SEED, QUOTE_SEED, SHARE_DECIMALS, SHARE_SEED, VAULT_SEED};
use crate::state::Vault;

#[derive(Accounts)]
pub struct InitializeVault<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    pub quote_mint: Account<'info, Mint>,

    pub base_mint: Account<'info, Mint>,

    #[account(
        init,
        payer = authority,
        space = 8 + Vault::INIT_SPACE,
        seeds = [VAULT_SEED, quote_mint.key().as_ref()],
        bump,
    )]
    pub vault: Account<'info, Vault>,

    #[account(
        init,
        payer = authority,
        seeds = [SHARE_SEED, vault.key().as_ref()],
        bump,
        mint::decimals = SHARE_DECIMALS,
        mint::authority = vault,
    )]
    pub share_mint: Account<'info, Mint>,

    #[account(
        init,
        payer = authority,
        seeds = [QUOTE_SEED, vault.key().as_ref()],
        bump,
        token::mint = quote_mint,
        token::authority = vault,
    )]
    pub quote_vault: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = authority,
        seeds = [BASE_SEED, vault.key().as_ref()],
        bump,
        token::mint = base_mint,
        token::authority = vault,
    )]
    pub base_vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(
    ctx: Context<InitializeVault>,
    keeper: Pubkey,
    meteora_position: Pubkey,
    drift_user: Pubkey,
    delta_tolerance_bps: u16,
    min_margin_ratio_bps: u16,
    max_funding_rate_bps: i32,
) -> Result<()> {
    let vault = &mut ctx.accounts.vault;

    vault.authority = ctx.accounts.authority.key();
    vault.keeper = keeper;
    vault.quote_mint = ctx.accounts.quote_mint.key();
    vault.base_mint = ctx.accounts.base_mint.key();
    vault.share_mint = ctx.accounts.share_mint.key();
    vault.quote_vault = ctx.accounts.quote_vault.key();
    vault.base_vault = ctx.accounts.base_vault.key();
    vault.meteora_position = meteora_position;
    vault.drift_user = drift_user;

    vault.delta_tolerance_bps = delta_tolerance_bps;
    vault.min_margin_ratio_bps = min_margin_ratio_bps;
    vault.max_funding_rate_bps = max_funding_rate_bps;

    vault.position_base_qty = 0;
    vault.short_base_qty = 0;
    vault.lp_value_quote = 0;
    vault.drift_collateral_quote = 0;
    vault.drift_pnl_quote = 0;
    vault.last_price = 0;

    vault.total_shares = 0;
    vault.paused = false;
    vault.bump = ctx.bumps.vault;

    Ok(())
}
