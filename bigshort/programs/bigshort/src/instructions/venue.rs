use anchor_lang::prelude::*;

use crate::error::VaultError;
use crate::integrations;
use crate::state::Vault;

#[derive(Accounts)]
pub struct KeeperVenue<'info> {
    pub keeper: Signer<'info>,

    #[account(has_one = keeper @ VaultError::Unauthorized)]
    pub vault: Account<'info, Vault>,
}

pub fn initialize_meteora_position<'info>(
    ctx: Context<'info, KeeperVenue<'info>>,
    lower_bin_id: i32,
    width: i32,
) -> Result<()> {
    require!(!ctx.accounts.vault.paused, VaultError::Paused);

    let accounts = ctx.remaining_accounts;
    require!(accounts.len() >= 9, VaultError::CpiAccountsMissing);
    require_keys_eq!(
        accounts[2].key(),
        ctx.accounts.vault.meteora_position,
        VaultError::Unauthorized
    );
    require_keys_eq!(
        accounts[4].key(),
        ctx.accounts.vault.key(),
        VaultError::Unauthorized
    );

    let quote_mint = ctx.accounts.vault.quote_mint;
    let seeds = ctx.accounts.vault.signer_seeds(&quote_mint);
    integrations::meteora::initialize_position(&accounts[0], &accounts[1..], lower_bin_id, width, &[&seeds])
}

pub fn add_liquidity_to_meteora<'info>(
    ctx: Context<'info, KeeperVenue<'info>>,
    param: integrations::meteora::LiquidityParameterByStrategy,
) -> Result<()> {
    require!(!ctx.accounts.vault.paused, VaultError::Paused);

    let accounts = ctx.remaining_accounts;
    require!(accounts.len() >= 17, VaultError::CpiAccountsMissing);
    require_keys_eq!(
        accounts[1].key(),
        ctx.accounts.vault.meteora_position,
        VaultError::Unauthorized
    );
    require_keys_eq!(
        accounts[4].key(),
        ctx.accounts.vault.base_vault,
        VaultError::Unauthorized
    );
    require_keys_eq!(
        accounts[5].key(),
        ctx.accounts.vault.quote_vault,
        VaultError::Unauthorized
    );

    let quote_mint = ctx.accounts.vault.quote_mint;
    let seeds = ctx.accounts.vault.signer_seeds(&quote_mint);
    integrations::meteora::add_liquidity_by_strategy(&accounts[0], &accounts[1..], param, &[&seeds])
}

pub fn remove_liquidity_from_meteora<'info>(
    ctx: Context<'info, KeeperVenue<'info>>,
    from_bin_id: i32,
    to_bin_id: i32,
    bps_to_remove: u16,
) -> Result<()> {
    require!(!ctx.accounts.vault.paused, VaultError::Paused);

    let accounts = ctx.remaining_accounts;
    require!(accounts.len() >= 17, VaultError::CpiAccountsMissing);
    require_keys_eq!(
        accounts[1].key(),
        ctx.accounts.vault.meteora_position,
        VaultError::Unauthorized
    );
    require_keys_eq!(
        accounts[4].key(),
        ctx.accounts.vault.base_vault,
        VaultError::Unauthorized
    );
    require_keys_eq!(
        accounts[5].key(),
        ctx.accounts.vault.quote_vault,
        VaultError::Unauthorized
    );

    let quote_mint = ctx.accounts.vault.quote_mint;
    let seeds = ctx.accounts.vault.signer_seeds(&quote_mint);
    integrations::meteora::remove_liquidity_by_range(
        &accounts[0],
        &accounts[1..],
        from_bin_id,
        to_bin_id,
        bps_to_remove,
        &[&seeds],
    )
}

pub fn deposit_to_drift<'info>(
    ctx: Context<'info, KeeperVenue<'info>>,
    market_index: u16,
    amount: u64,
) -> Result<()> {
    require!(!ctx.accounts.vault.paused, VaultError::Paused);

    let accounts = ctx.remaining_accounts;
    require!(accounts.len() >= 8, VaultError::CpiAccountsMissing);
    require_keys_eq!(
        accounts[2].key(),
        ctx.accounts.vault.drift_user,
        VaultError::Unauthorized
    );
    require_keys_eq!(
        accounts[4].key(),
        ctx.accounts.vault.key(),
        VaultError::Unauthorized
    );
    require_keys_eq!(
        accounts[6].key(),
        ctx.accounts.vault.quote_vault,
        VaultError::Unauthorized
    );

    let quote_mint = ctx.accounts.vault.quote_mint;
    let seeds = ctx.accounts.vault.signer_seeds(&quote_mint);
    integrations::drift::deposit(
        &accounts[0],
        &accounts[1..],
        market_index,
        amount,
        false,
        &[&seeds],
    )
}

pub fn place_drift_perp_order<'info>(
    ctx: Context<'info, KeeperVenue<'info>>,
    is_short: bool,
    base_asset_amount: u64,
    market_index: u16,
    reduce_only: bool,
) -> Result<()> {
    require!(!ctx.accounts.vault.paused, VaultError::Paused);

    let accounts = ctx.remaining_accounts;
    require!(accounts.len() >= 4, VaultError::CpiAccountsMissing);
    require_keys_eq!(
        accounts[2].key(),
        ctx.accounts.vault.drift_user,
        VaultError::Unauthorized
    );
    require_keys_eq!(
        accounts[3].key(),
        ctx.accounts.vault.key(),
        VaultError::Unauthorized
    );

    let direction = if is_short {
        integrations::drift::DriftPositionDirection::Short
    } else {
        integrations::drift::DriftPositionDirection::Long
    };
    let params =
        integrations::drift::perp_market_order(direction, base_asset_amount, market_index, reduce_only);

    let quote_mint = ctx.accounts.vault.quote_mint;
    let seeds = ctx.accounts.vault.signer_seeds(&quote_mint);
    integrations::drift::place_perp_order(&accounts[0], &accounts[1..], params, &[&seeds])
}
