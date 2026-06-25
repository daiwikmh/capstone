use anchor_lang::prelude::*;

use crate::integrations::invoke_layout;
use crate::error::VaultError;

pub const PLACE_PERP_ORDER_DISC: [u8; 8] = [69, 161, 93, 202, 120, 126, 76, 185];
pub const DEPOSIT_DISC: [u8; 8] = [242, 35, 198, 137, 82, 225, 242, 182];

const PLACE_PERP_ORDER_FLAGS: [(bool, bool); 3] =
    [(false, false), (true, false), (false, true)];

const DEPOSIT_FLAGS: [(bool, bool); 7] = [
    (false, false),
    (true, false),
    (true, false),
    (false, true),
    (true, false),
    (true, false),
    (false, false),
];

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum DriftOrderType {
    Market,
    Limit,
    TriggerMarket,
    TriggerLimit,
    Oracle,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum DriftMarketType {
    Spot,
    Perp,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum DriftPositionDirection {
    Long,
    Short,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum DriftOrderTriggerCondition {
    Above,
    Below,
    TriggeredAbove,
    TriggeredBelow,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum DriftPostOnlyParam {
    None,
    MustPostOnly,
    TryPostOnly,
    Slide,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct OrderParams {
    pub order_type: DriftOrderType,
    pub market_type: DriftMarketType,
    pub direction: DriftPositionDirection,
    pub user_order_id: u8,
    pub base_asset_amount: u64,
    pub price: u64,
    pub market_index: u16,
    pub reduce_only: bool,
    pub post_only: DriftPostOnlyParam,
    pub bit_flags: u8,
    pub max_ts: Option<i64>,
    pub trigger_price: Option<u64>,
    pub trigger_condition: DriftOrderTriggerCondition,
    pub oracle_price_offset: Option<i32>,
    pub auction_duration: Option<u8>,
    pub auction_start_price: Option<i64>,
    pub auction_end_price: Option<i64>,
}

pub fn perp_market_order(
    direction: DriftPositionDirection,
    base_asset_amount: u64,
    market_index: u16,
    reduce_only: bool,
) -> OrderParams {
    OrderParams {
        order_type: DriftOrderType::Market,
        market_type: DriftMarketType::Perp,
        direction,
        user_order_id: 0,
        base_asset_amount,
        price: 0,
        market_index,
        reduce_only,
        post_only: DriftPostOnlyParam::None,
        bit_flags: 0,
        max_ts: None,
        trigger_price: None,
        trigger_condition: DriftOrderTriggerCondition::Above,
        oracle_price_offset: None,
        auction_duration: None,
        auction_start_price: None,
        auction_end_price: None,
    }
}

pub fn place_perp_order<'info>(
    program: &AccountInfo<'info>,
    accounts: &[AccountInfo<'info>],
    params: OrderParams,
    signer_seeds: &[&[&[u8]]],
) -> Result<()> {
    let mut data = PLACE_PERP_ORDER_DISC.to_vec();
    params
        .serialize(&mut data)
        .map_err(|_| error!(VaultError::CpiSerialization))?;
    invoke_layout(program, accounts, &PLACE_PERP_ORDER_FLAGS, data, signer_seeds)
}

pub fn deposit<'info>(
    program: &AccountInfo<'info>,
    accounts: &[AccountInfo<'info>],
    market_index: u16,
    amount: u64,
    reduce_only: bool,
    signer_seeds: &[&[&[u8]]],
) -> Result<()> {
    let mut data = DEPOSIT_DISC.to_vec();
    data.extend_from_slice(&market_index.to_le_bytes());
    data.extend_from_slice(&amount.to_le_bytes());
    data.push(reduce_only as u8);
    invoke_layout(program, accounts, &DEPOSIT_FLAGS, data, signer_seeds)
}
