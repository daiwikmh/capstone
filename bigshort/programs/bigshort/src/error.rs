use anchor_lang::prelude::*;

#[error_code]
pub enum VaultError {
    #[msg("Vault is paused")]
    Paused,
    #[msg("Amount must be greater than zero")]
    ZeroAmount,
    #[msg("Signer is not authorized for this action")]
    Unauthorized,
    #[msg("Hedge size is outside the allowed delta tolerance")]
    DeltaOutOfTolerance,
    #[msg("Resulting margin ratio is below the minimum buffer")]
    InsufficientMargin,
    #[msg("Funding breaker active: hedge may only be reduced")]
    FundingBreaker,
    #[msg("Not enough idle quote liquidity to service withdrawal")]
    InsufficientLiquidity,
    #[msg("Net asset value is not positive")]
    NonPositiveNav,
    #[msg("Position has no base exposure to hedge")]
    ZeroPosition,
    #[msg("Arithmetic overflow")]
    MathOverflow,
    #[msg("Meteora account is malformed, wrong type, or not owned by the DLMM program")]
    InvalidMeteoraAccount,
    #[msg("A required bin array account was not supplied")]
    BinArrayMissing,
    #[msg("Failed to serialize CPI instruction data")]
    CpiSerialization,
    #[msg("Not enough accounts supplied for the CPI call")]
    CpiAccountsMissing,
}
