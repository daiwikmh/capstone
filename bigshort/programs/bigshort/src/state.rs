use anchor_lang::prelude::*;

use crate::constants::PRICE_PRECISION;
use crate::error::VaultError;

#[account]
#[derive(InitSpace)]
pub struct Vault {
    pub authority: Pubkey,
    pub keeper: Pubkey,
    pub quote_mint: Pubkey,
    pub base_mint: Pubkey,
    pub share_mint: Pubkey,
    pub quote_vault: Pubkey,
    pub base_vault: Pubkey,
    pub meteora_position: Pubkey,
    pub drift_user: Pubkey,

    pub delta_tolerance_bps: u16,
    pub min_margin_ratio_bps: u16,
    pub max_funding_rate_bps: i32,

    pub position_base_qty: u64,
    pub short_base_qty: u64,
    pub lp_value_quote: u64,
    pub drift_collateral_quote: u64,
    pub drift_pnl_quote: i64,
    pub last_price: u64,

    pub total_shares: u64,
    pub paused: bool,
    pub bump: u8,
}

impl Vault {
    pub fn nav(&self, idle_quote: u64, idle_base: u64) -> Result<u64> {
        let idle_base_value = (idle_base as i128)
            .checked_mul(self.last_price as i128)
            .ok_or(VaultError::MathOverflow)?
            .checked_div(PRICE_PRECISION as i128)
            .ok_or(VaultError::MathOverflow)?;

        let assets = (idle_quote as i128)
            .checked_add(idle_base_value)
            .ok_or(VaultError::MathOverflow)?
            .checked_add(self.lp_value_quote as i128)
            .ok_or(VaultError::MathOverflow)?
            .checked_add(self.drift_collateral_quote as i128)
            .ok_or(VaultError::MathOverflow)?
            .checked_add(self.drift_pnl_quote as i128)
            .ok_or(VaultError::MathOverflow)?;

        if assets <= 0 {
            return err!(VaultError::NonPositiveNav);
        }
        Ok(assets as u64)
    }

    pub fn signer_seeds<'a>(&'a self, quote_mint: &'a Pubkey) -> [&'a [u8]; 3] {
        [crate::constants::VAULT_SEED, quote_mint.as_ref(), std::slice::from_ref(&self.bump)]
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct RehedgeParams {
    pub short_base_qty: u64,
    pub drift_collateral_quote: u64,
    pub drift_pnl_quote: i64,
    pub price: u64,
    pub funding_rate_bps: i32,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn vault() -> Vault {
        Vault {
            authority: Pubkey::default(),
            keeper: Pubkey::default(),
            quote_mint: Pubkey::default(),
            base_mint: Pubkey::default(),
            share_mint: Pubkey::default(),
            quote_vault: Pubkey::default(),
            base_vault: Pubkey::default(),
            meteora_position: Pubkey::default(),
            drift_user: Pubkey::default(),
            delta_tolerance_bps: 0,
            min_margin_ratio_bps: 0,
            max_funding_rate_bps: 0,
            position_base_qty: 0,
            short_base_qty: 0,
            lp_value_quote: 0,
            drift_collateral_quote: 0,
            drift_pnl_quote: 0,
            last_price: 0,
            total_shares: 0,
            paused: false,
            bump: 0,
        }
    }

    #[test]
    fn nav_sums_all_legs_and_values_idle_base() {
        let mut v = vault();
        v.lp_value_quote = 1_000_000;
        v.drift_collateral_quote = 500_000;
        v.drift_pnl_quote = 200_000;
        v.last_price = 150_000_000;
        let nav = v.nav(300_000, 2_000_000_000).unwrap();
        assert_eq!(nav, 300_000 + 300_000_000_000 + 1_000_000 + 500_000 + 200_000);
    }

    #[test]
    fn nav_subtracts_negative_pnl() {
        let mut v = vault();
        v.lp_value_quote = 1_000_000;
        v.drift_collateral_quote = 500_000;
        v.drift_pnl_quote = -400_000;
        let nav = v.nav(100_000, 0).unwrap();
        assert_eq!(nav, 100_000 + 1_000_000 + 500_000 - 400_000);
    }

    #[test]
    fn nav_rejects_nonpositive() {
        let mut v = vault();
        v.drift_pnl_quote = -100;
        assert!(v.nav(0, 0).is_err());
    }
}
