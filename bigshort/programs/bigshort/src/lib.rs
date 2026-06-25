pub mod constants;
pub mod dlmm;
pub mod error;
pub mod instructions;
pub mod integrations;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("GZ87THAUf9rWVyoLmVUR2DDYtaNr9fzvEkwxFurERrE8");

#[program]
pub mod bigshort {
    use super::*;

    pub fn initialize_vault(
        ctx: Context<InitializeVault>,
        keeper: Pubkey,
        meteora_position: Pubkey,
        drift_user: Pubkey,
        delta_tolerance_bps: u16,
        min_margin_ratio_bps: u16,
        max_funding_rate_bps: i32,
    ) -> Result<()> {
        initialize_vault::handler(
            ctx,
            keeper,
            meteora_position,
            drift_user,
            delta_tolerance_bps,
            min_margin_ratio_bps,
            max_funding_rate_bps,
        )
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        deposit::handler(ctx, amount)
    }

    pub fn withdraw(ctx: Context<Withdraw>, shares: u64) -> Result<()> {
        withdraw::handler(ctx, shares)
    }

    pub fn rehedge<'info>(
        ctx: Context<'info, Rehedge<'info>>,
        params: RehedgeParams,
    ) -> Result<()> {
        rehedge::handler(ctx, params)
    }

    pub fn set_pause(ctx: Context<SetPause>, paused: bool) -> Result<()> {
        set_pause::handler(ctx, paused)
    }

    pub fn meteora_init_position<'info>(
        ctx: Context<'info, KeeperVenue<'info>>,
        lower_bin_id: i32,
        width: i32,
    ) -> Result<()> {
        venue::initialize_meteora_position(ctx, lower_bin_id, width)
    }

    pub fn meteora_add_liquidity<'info>(
        ctx: Context<'info, KeeperVenue<'info>>,
        param: integrations::meteora::LiquidityParameterByStrategy,
    ) -> Result<()> {
        venue::add_liquidity_to_meteora(ctx, param)
    }

    pub fn meteora_remove_liquidity<'info>(
        ctx: Context<'info, KeeperVenue<'info>>,
        from_bin_id: i32,
        to_bin_id: i32,
        bps_to_remove: u16,
    ) -> Result<()> {
        venue::remove_liquidity_from_meteora(ctx, from_bin_id, to_bin_id, bps_to_remove)
    }

    pub fn drift_deposit<'info>(
        ctx: Context<'info, KeeperVenue<'info>>,
        market_index: u16,
        amount: u64,
    ) -> Result<()> {
        venue::deposit_to_drift(ctx, market_index, amount)
    }

    pub fn drift_place_perp_order<'info>(
        ctx: Context<'info, KeeperVenue<'info>>,
        is_short: bool,
        base_asset_amount: u64,
        market_index: u16,
        reduce_only: bool,
    ) -> Result<()> {
        venue::place_drift_perp_order(ctx, is_short, base_asset_amount, market_index, reduce_only)
    }
}
