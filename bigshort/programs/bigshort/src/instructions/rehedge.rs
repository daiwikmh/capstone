use anchor_lang::prelude::*;

use crate::constants::{BPS_DENOMINATOR, PRICE_PRECISION};
use crate::dlmm::{derive_position_amounts, lp_value_quote};
use crate::error::VaultError;
use crate::state::{RehedgeParams, Vault};

#[derive(Accounts)]
pub struct Rehedge<'info> {
    pub keeper: Signer<'info>,

    #[account(mut, has_one = keeper @ VaultError::Unauthorized)]
    pub vault: Account<'info, Vault>,
}

pub fn handler<'info>(
    ctx: Context<'info, Rehedge<'info>>,
    params: RehedgeParams,
) -> Result<()> {
    require!(!ctx.accounts.vault.paused, VaultError::Paused);

    let accounts = ctx.remaining_accounts;
    require!(!accounts.is_empty(), VaultError::InvalidMeteoraAccount);

    let position = &accounts[0];
    require_keys_eq!(
        position.key(),
        ctx.accounts.vault.meteora_position,
        VaultError::Unauthorized
    );

    let (base_qty, quote_qty) = derive_position_amounts(position, &accounts[1..])?;
    require!(base_qty > 0, VaultError::ZeroPosition);

    let delta_diff = params.short_base_qty.abs_diff(base_qty);
    let delta_bps = (delta_diff as u128)
        .checked_mul(BPS_DENOMINATOR)
        .ok_or(VaultError::MathOverflow)?
        .checked_div(base_qty as u128)
        .ok_or(VaultError::MathOverflow)?;
    require!(
        delta_bps <= ctx.accounts.vault.delta_tolerance_bps as u128,
        VaultError::DeltaOutOfTolerance
    );

    let notional = (params.short_base_qty as u128)
        .checked_mul(params.price as u128)
        .ok_or(VaultError::MathOverflow)?
        .checked_div(PRICE_PRECISION)
        .ok_or(VaultError::MathOverflow)?;
    if notional > 0 {
        let margin_bps = (params.drift_collateral_quote as u128)
            .checked_mul(BPS_DENOMINATOR)
            .ok_or(VaultError::MathOverflow)?
            .checked_div(notional)
            .ok_or(VaultError::MathOverflow)?;
        require!(
            margin_bps >= ctx.accounts.vault.min_margin_ratio_bps as u128,
            VaultError::InsufficientMargin
        );
    }

    if params.funding_rate_bps > ctx.accounts.vault.max_funding_rate_bps {
        require!(
            params.short_base_qty <= ctx.accounts.vault.short_base_qty,
            VaultError::FundingBreaker
        );
    }

    let lp_value = lp_value_quote(base_qty, quote_qty, params.price)?;

    let vault = &mut ctx.accounts.vault;
    vault.position_base_qty = base_qty;
    vault.short_base_qty = params.short_base_qty;
    vault.lp_value_quote = lp_value;
    vault.drift_collateral_quote = params.drift_collateral_quote;
    vault.drift_pnl_quote = params.drift_pnl_quote;
    vault.last_price = params.price;

    Ok(())
}
