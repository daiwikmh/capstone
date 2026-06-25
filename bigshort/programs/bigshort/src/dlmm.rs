use anchor_lang::prelude::*;

use crate::constants::PRICE_PRECISION;
use crate::error::VaultError;

pub const METEORA_DLMM_PROGRAM_ID: Pubkey = Pubkey::new_from_array([
    4, 233, 225, 47, 188, 132, 232, 38, 201, 50, 204, 233, 226, 100, 12, 206, 21, 89, 12, 28, 98,
    115, 176, 146, 87, 8, 186, 59, 133, 32, 176, 188,
]);

pub const POSITION_V2_DISCRIMINATOR: [u8; 8] = [117, 176, 212, 199, 245, 180, 133, 182];
pub const BIN_ARRAY_DISCRIMINATOR: [u8; 8] = [92, 142, 92, 220, 5, 148, 70, 181];

pub const BINS_PER_ARRAY: i32 = 70;
pub const MAX_BINS: usize = 70;

const POS_LBPAIR_OFFSET: usize = 8;
const POS_LIQUIDITY_SHARES_OFFSET: usize = 72;
const POS_LOWER_BIN_ID_OFFSET: usize = 7912;
const POS_UPPER_BIN_ID_OFFSET: usize = 7916;
const POSITION_MIN_LEN: usize = 7920;

const BA_INDEX_OFFSET: usize = 8;
const BA_LBPAIR_OFFSET: usize = 24;
const BA_BINS_OFFSET: usize = 56;
const BIN_SIZE: usize = 144;
const BIN_AMOUNT_X_OFFSET: usize = 0;
const BIN_AMOUNT_Y_OFFSET: usize = 8;
const BIN_LIQUIDITY_SUPPLY_OFFSET: usize = 32;
const BINARRAY_MIN_LEN: usize = BA_BINS_OFFSET + MAX_BINS * BIN_SIZE;

fn rd_u64(data: &[u8], off: usize) -> u64 {
    u64::from_le_bytes(data[off..off + 8].try_into().unwrap())
}

fn rd_u128(data: &[u8], off: usize) -> u128 {
    u128::from_le_bytes(data[off..off + 16].try_into().unwrap())
}

fn rd_i32(data: &[u8], off: usize) -> i32 {
    i32::from_le_bytes(data[off..off + 4].try_into().unwrap())
}

fn rd_i64(data: &[u8], off: usize) -> i64 {
    i64::from_le_bytes(data[off..off + 8].try_into().unwrap())
}

fn rd_pubkey(data: &[u8], off: usize) -> Pubkey {
    Pubkey::new_from_array(data[off..off + 32].try_into().unwrap())
}

pub struct PositionView<'a> {
    data: &'a [u8],
}

impl<'a> PositionView<'a> {
    pub fn load(data: &'a [u8]) -> Result<Self> {
        require!(data.len() >= POSITION_MIN_LEN, VaultError::InvalidMeteoraAccount);
        require!(
            data[..8] == POSITION_V2_DISCRIMINATOR,
            VaultError::InvalidMeteoraAccount
        );
        Ok(Self { data })
    }

    pub fn lb_pair(&self) -> Pubkey {
        rd_pubkey(self.data, POS_LBPAIR_OFFSET)
    }

    pub fn lower_bin_id(&self) -> i32 {
        rd_i32(self.data, POS_LOWER_BIN_ID_OFFSET)
    }

    pub fn upper_bin_id(&self) -> i32 {
        rd_i32(self.data, POS_UPPER_BIN_ID_OFFSET)
    }

    pub fn liquidity_share(&self, index: usize) -> u128 {
        rd_u128(self.data, POS_LIQUIDITY_SHARES_OFFSET + index * 16)
    }
}

pub struct BinArrayView<'a> {
    data: &'a [u8],
}

impl<'a> BinArrayView<'a> {
    pub fn load(data: &'a [u8]) -> Result<Self> {
        require!(data.len() >= BINARRAY_MIN_LEN, VaultError::InvalidMeteoraAccount);
        require!(
            data[..8] == BIN_ARRAY_DISCRIMINATOR,
            VaultError::InvalidMeteoraAccount
        );
        Ok(Self { data })
    }

    pub fn index(&self) -> i64 {
        rd_i64(self.data, BA_INDEX_OFFSET)
    }

    pub fn lb_pair(&self) -> Pubkey {
        rd_pubkey(self.data, BA_LBPAIR_OFFSET)
    }

    pub fn bin(&self, offset: usize) -> (u64, u64, u128) {
        let base = BA_BINS_OFFSET + offset * BIN_SIZE;
        (
            rd_u64(self.data, base + BIN_AMOUNT_X_OFFSET),
            rd_u64(self.data, base + BIN_AMOUNT_Y_OFFSET),
            rd_u128(self.data, base + BIN_LIQUIDITY_SUPPLY_OFFSET),
        )
    }
}

pub struct BinShare {
    pub reserve_x: u64,
    pub reserve_y: u64,
    pub bin_liquidity_supply: u128,
    pub position_liquidity_share: u128,
}

pub fn position_amounts(bins: &[BinShare]) -> Result<(u64, u64)> {
    let mut base: u128 = 0;
    let mut quote: u128 = 0;

    for bin in bins {
        if bin.bin_liquidity_supply == 0 || bin.position_liquidity_share == 0 {
            continue;
        }
        let share = bin.position_liquidity_share.min(bin.bin_liquidity_supply);

        let bx = (bin.reserve_x as u128)
            .checked_mul(share)
            .ok_or(VaultError::MathOverflow)?
            .checked_div(bin.bin_liquidity_supply)
            .ok_or(VaultError::MathOverflow)?;
        let by = (bin.reserve_y as u128)
            .checked_mul(share)
            .ok_or(VaultError::MathOverflow)?
            .checked_div(bin.bin_liquidity_supply)
            .ok_or(VaultError::MathOverflow)?;

        base = base.checked_add(bx).ok_or(VaultError::MathOverflow)?;
        quote = quote.checked_add(by).ok_or(VaultError::MathOverflow)?;
    }

    Ok((
        u64::try_from(base).map_err(|_| VaultError::MathOverflow)?,
        u64::try_from(quote).map_err(|_| VaultError::MathOverflow)?,
    ))
}

pub fn lp_value_quote(base: u64, quote: u64, price: u64) -> Result<u64> {
    let base_value = (base as u128)
        .checked_mul(price as u128)
        .ok_or(VaultError::MathOverflow)?
        .checked_div(PRICE_PRECISION)
        .ok_or(VaultError::MathOverflow)?;
    let total = base_value
        .checked_add(quote as u128)
        .ok_or(VaultError::MathOverflow)?;
    Ok(u64::try_from(total).map_err(|_| VaultError::MathOverflow)?)
}

pub fn derive_amounts(position_data: &[u8], bin_array_datas: &[&[u8]]) -> Result<(u64, u64)> {
    let position = PositionView::load(position_data)?;
    let lb_pair = position.lb_pair();
    let lower = position.lower_bin_id();
    let upper = position.upper_bin_id();

    require!(upper >= lower, VaultError::InvalidMeteoraAccount);
    let count = (upper - lower + 1) as usize;
    require!(count <= MAX_BINS, VaultError::InvalidMeteoraAccount);

    let mut arrays: Vec<BinArrayView> = Vec::with_capacity(bin_array_datas.len());
    for data in bin_array_datas {
        arrays.push(BinArrayView::load(data)?);
    }

    let mut bins: Vec<BinShare> = Vec::with_capacity(count);
    for i in 0..count {
        let bin_id = lower + i as i32;
        let target_index = bin_id.div_euclid(BINS_PER_ARRAY) as i64;
        let offset = bin_id.rem_euclid(BINS_PER_ARRAY) as usize;

        let view = arrays
            .iter()
            .find(|v| v.index() == target_index && v.lb_pair() == lb_pair)
            .ok_or(VaultError::BinArrayMissing)?;

        let (reserve_x, reserve_y, bin_liquidity_supply) = view.bin(offset);
        bins.push(BinShare {
            reserve_x,
            reserve_y,
            bin_liquidity_supply,
            position_liquidity_share: position.liquidity_share(i),
        });
    }

    position_amounts(&bins)
}

pub fn derive_position_amounts<'info>(
    position: &AccountInfo<'info>,
    bin_arrays: &[AccountInfo<'info>],
) -> Result<(u64, u64)> {
    require_keys_eq!(
        *position.owner,
        METEORA_DLMM_PROGRAM_ID,
        VaultError::InvalidMeteoraAccount
    );

    let ba_datas: Vec<_> = bin_arrays
        .iter()
        .map(|acc| {
            require_keys_eq!(
                *acc.owner,
                METEORA_DLMM_PROGRAM_ID,
                VaultError::InvalidMeteoraAccount
            );
            acc.try_borrow_data()
                .map_err(|_| error!(VaultError::InvalidMeteoraAccount))
        })
        .collect::<Result<Vec<_>>>()?;

    let ba_slices: Vec<&[u8]> = ba_datas.iter().map(|r| &r[..]).collect();

    let pos_data = position
        .try_borrow_data()
        .map_err(|_| error!(VaultError::InvalidMeteoraAccount))?;

    derive_amounts(&pos_data, &ba_slices)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn bin(rx: u64, ry: u64, supply: u128, share: u128) -> BinShare {
        BinShare {
            reserve_x: rx,
            reserve_y: ry,
            bin_liquidity_supply: supply,
            position_liquidity_share: share,
        }
    }

    #[test]
    fn below_active_bins_hold_only_quote() {
        let bins = [bin(0, 1_000_000, 1_000, 1_000)];
        let (base, quote) = position_amounts(&bins).unwrap();
        assert_eq!(base, 0);
        assert_eq!(quote, 1_000_000);
    }

    #[test]
    fn above_active_bins_hold_only_base() {
        let bins = [bin(5_000_000_000, 0, 1_000, 1_000)];
        let (base, quote) = position_amounts(&bins).unwrap();
        assert_eq!(base, 5_000_000_000);
        assert_eq!(quote, 0);
    }

    #[test]
    fn partial_share_is_prorata() {
        let bins = [bin(2_000_000_000, 4_000_000, 1_000, 250)];
        let (base, quote) = position_amounts(&bins).unwrap();
        assert_eq!(base, 500_000_000);
        assert_eq!(quote, 1_000_000);
    }

    #[test]
    fn sums_across_bins() {
        let bins = [
            bin(0, 3_000_000, 1_000, 1_000),
            bin(1_000_000_000, 500_000, 1_000, 500),
            bin(4_000_000_000, 0, 2_000, 1_000),
        ];
        let (base, quote) = position_amounts(&bins).unwrap();
        assert_eq!(base, 500_000_000 + 2_000_000_000);
        assert_eq!(quote, 3_000_000 + 250_000);
    }

    #[test]
    fn empty_supply_is_skipped() {
        let bins = [bin(9_999, 9_999, 0, 1_000)];
        let (base, quote) = position_amounts(&bins).unwrap();
        assert_eq!(base, 0);
        assert_eq!(quote, 0);
    }

    #[test]
    fn share_cannot_exceed_supply() {
        let bins = [bin(1_000_000_000, 0, 1_000, 5_000)];
        let (base, _) = position_amounts(&bins).unwrap();
        assert_eq!(base, 1_000_000_000);
    }

    #[test]
    fn value_combines_legs_at_price() {
        let value = lp_value_quote(1_000_000_000, 50_000_000, 150_000_000).unwrap();
        assert_eq!(value, 150_000_000_000 + 50_000_000);
    }

    fn make_position(lb_pair: Pubkey, lower: i32, upper: i32, shares: &[u128]) -> Vec<u8> {
        let mut data = vec![0u8; POSITION_MIN_LEN];
        data[..8].copy_from_slice(&POSITION_V2_DISCRIMINATOR);
        data[POS_LBPAIR_OFFSET..POS_LBPAIR_OFFSET + 32].copy_from_slice(lb_pair.as_ref());
        for (i, s) in shares.iter().enumerate() {
            let off = POS_LIQUIDITY_SHARES_OFFSET + i * 16;
            data[off..off + 16].copy_from_slice(&s.to_le_bytes());
        }
        data[POS_LOWER_BIN_ID_OFFSET..POS_LOWER_BIN_ID_OFFSET + 4]
            .copy_from_slice(&lower.to_le_bytes());
        data[POS_UPPER_BIN_ID_OFFSET..POS_UPPER_BIN_ID_OFFSET + 4]
            .copy_from_slice(&upper.to_le_bytes());
        data
    }

    fn make_bin_array(lb_pair: Pubkey, index: i64, bins: &[(usize, u64, u64, u128)]) -> Vec<u8> {
        let mut data = vec![0u8; BINARRAY_MIN_LEN];
        data[..8].copy_from_slice(&BIN_ARRAY_DISCRIMINATOR);
        data[BA_INDEX_OFFSET..BA_INDEX_OFFSET + 8].copy_from_slice(&index.to_le_bytes());
        data[BA_LBPAIR_OFFSET..BA_LBPAIR_OFFSET + 32].copy_from_slice(lb_pair.as_ref());
        for (offset, ax, ay, supply) in bins {
            let base = BA_BINS_OFFSET + offset * BIN_SIZE;
            data[base..base + 8].copy_from_slice(&ax.to_le_bytes());
            data[base + 8..base + 16].copy_from_slice(&ay.to_le_bytes());
            data[base + BIN_LIQUIDITY_SUPPLY_OFFSET..base + BIN_LIQUIDITY_SUPPLY_OFFSET + 16]
                .copy_from_slice(&supply.to_le_bytes());
        }
        data
    }

    #[test]
    fn derive_single_bin_position() {
        let lb_pair = Pubkey::new_unique();
        let pos = make_position(lb_pair, 0, 0, &[1_000]);
        let ba = make_bin_array(lb_pair, 0, &[(0, 5_000_000_000, 0, 1_000)]);
        let (base, quote) = derive_amounts(&pos, &[&ba]).unwrap();
        assert_eq!(base, 5_000_000_000);
        assert_eq!(quote, 0);
    }

    #[test]
    fn derive_spans_two_bin_arrays() {
        let lb_pair = Pubkey::new_unique();
        let pos = make_position(lb_pair, 69, 70, &[1_000, 500]);
        let ba0 = make_bin_array(lb_pair, 0, &[(69, 2_000_000_000, 0, 1_000)]);
        let ba1 = make_bin_array(lb_pair, 1, &[(0, 0, 8_000_000, 1_000)]);
        let (base, quote) = derive_amounts(&pos, &[&ba0, &ba1]).unwrap();
        assert_eq!(base, 2_000_000_000);
        assert_eq!(quote, 4_000_000);
    }

    #[test]
    fn derive_handles_negative_bin_ids() {
        let lb_pair = Pubkey::new_unique();
        let pos = make_position(lb_pair, -1, -1, &[1_000]);
        let ba = make_bin_array(lb_pair, -1, &[(69, 3_000_000_000, 0, 1_000)]);
        let (base, _) = derive_amounts(&pos, &[&ba]).unwrap();
        assert_eq!(base, 3_000_000_000);
    }

    #[test]
    fn derive_rejects_wrong_discriminator() {
        let lb_pair = Pubkey::new_unique();
        let mut pos = make_position(lb_pair, 0, 0, &[1_000]);
        pos[0] ^= 0xff;
        let ba = make_bin_array(lb_pair, 0, &[(0, 5_000_000_000, 0, 1_000)]);
        assert!(derive_amounts(&pos, &[&ba]).is_err());
    }

    #[test]
    fn derive_rejects_missing_bin_array() {
        let lb_pair = Pubkey::new_unique();
        let pos = make_position(lb_pair, 0, 0, &[1_000]);
        let ba = make_bin_array(lb_pair, 5, &[(0, 5_000_000_000, 0, 1_000)]);
        assert!(derive_amounts(&pos, &[&ba]).is_err());
    }

    #[test]
    fn derive_rejects_foreign_lb_pair() {
        let lb_pair = Pubkey::new_unique();
        let other = Pubkey::new_unique();
        let pos = make_position(lb_pair, 0, 0, &[1_000]);
        let ba = make_bin_array(other, 0, &[(0, 5_000_000_000, 0, 1_000)]);
        assert!(derive_amounts(&pos, &[&ba]).is_err());
    }
}
