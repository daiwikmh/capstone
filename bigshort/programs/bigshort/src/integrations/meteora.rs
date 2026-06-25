use anchor_lang::prelude::*;

use crate::integrations::invoke_layout;
use crate::error::VaultError;

pub const ADD_LIQUIDITY_BY_STRATEGY_DISC: [u8; 8] = [7, 3, 150, 127, 148, 40, 61, 200];
pub const REMOVE_LIQUIDITY_BY_RANGE_DISC: [u8; 8] = [26, 82, 102, 152, 240, 74, 105, 26];
pub const INITIALIZE_POSITION_DISC: [u8; 8] = [219, 192, 234, 71, 190, 191, 102, 80];

const INIT_POSITION_FLAGS: [(bool, bool); 8] = [
    (true, true),
    (true, true),
    (false, false),
    (false, true),
    (false, false),
    (false, false),
    (false, false),
    (false, false),
];

const LIQUIDITY_FLAGS: [(bool, bool); 16] = [
    (true, false),
    (true, false),
    (false, false),
    (true, false),
    (true, false),
    (true, false),
    (true, false),
    (false, false),
    (false, false),
    (true, false),
    (true, false),
    (false, true),
    (false, false),
    (false, false),
    (false, false),
    (false, false),
];

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum StrategyType {
    SpotOneSide,
    CurveOneSide,
    BidAskOneSide,
    SpotBalanced,
    CurveBalanced,
    BidAskBalanced,
    SpotImBalanced,
    CurveImBalanced,
    BidAskImBalanced,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct StrategyParameters {
    pub min_bin_id: i32,
    pub max_bin_id: i32,
    pub strategy_type: StrategyType,
    pub parameteres: [u8; 64],
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct LiquidityParameterByStrategy {
    pub amount_x: u64,
    pub amount_y: u64,
    pub active_id: i32,
    pub max_active_bin_slippage: i32,
    pub strategy_parameters: StrategyParameters,
}

pub fn add_liquidity_by_strategy<'info>(
    program: &AccountInfo<'info>,
    accounts: &[AccountInfo<'info>],
    param: LiquidityParameterByStrategy,
    signer_seeds: &[&[&[u8]]],
) -> Result<()> {
    let mut data = ADD_LIQUIDITY_BY_STRATEGY_DISC.to_vec();
    param
        .serialize(&mut data)
        .map_err(|_| error!(VaultError::CpiSerialization))?;
    invoke_layout(program, accounts, &LIQUIDITY_FLAGS, data, signer_seeds)
}

pub fn initialize_position<'info>(
    program: &AccountInfo<'info>,
    accounts: &[AccountInfo<'info>],
    lower_bin_id: i32,
    width: i32,
    signer_seeds: &[&[&[u8]]],
) -> Result<()> {
    let mut data = INITIALIZE_POSITION_DISC.to_vec();
    data.extend_from_slice(&lower_bin_id.to_le_bytes());
    data.extend_from_slice(&width.to_le_bytes());
    invoke_layout(program, accounts, &INIT_POSITION_FLAGS, data, signer_seeds)
}

pub fn remove_liquidity_by_range<'info>(
    program: &AccountInfo<'info>,
    accounts: &[AccountInfo<'info>],
    from_bin_id: i32,
    to_bin_id: i32,
    bps_to_remove: u16,
    signer_seeds: &[&[&[u8]]],
) -> Result<()> {
    let mut data = REMOVE_LIQUIDITY_BY_RANGE_DISC.to_vec();
    data.extend_from_slice(&from_bin_id.to_le_bytes());
    data.extend_from_slice(&to_bin_id.to_le_bytes());
    data.extend_from_slice(&bps_to_remove.to_le_bytes());
    invoke_layout(program, accounts, &LIQUIDITY_FLAGS, data, signer_seeds)
}
