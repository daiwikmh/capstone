import { Connection, PublicKey } from "@solana/web3.js";
import { getAccount } from "@solana/spl-token";
import {
  PRICE_PRECISION,
  QUOTE_DECIMALS,
  SHARE_DECIMALS,
  baseVaultPda,
  quoteVaultPda,
  shareMintPda,
  vaultPda,
} from "./config";
import { getReadProgram } from "./program";

export type VaultState = {
  authority: string;
  keeper: string;
  paused: boolean;
  deltaToleranceBps: number;
  minMarginRatioBps: number;
  maxFundingRateBps: number;

  totalShares: bigint;
  lastPrice: bigint;
  positionBaseQty: bigint;
  shortBaseQty: bigint;
  lpValueQuote: bigint;
  driftCollateralQuote: bigint;
  driftPnlQuote: bigint;

  idleQuote: bigint;
  idleBase: bigint;

  navQuote: number;
  pricePerShare: number;
  deltaBase: number;
};

const toBig = (v: { toString(): string }) => BigInt(v.toString());

export async function fetchVaultState(connection: Connection): Promise<VaultState | null> {
  const vault = vaultPda();
  const info = await connection.getAccountInfo(vault);
  if (!info) return null;

  const program = getReadProgram(connection);
  const v = await program.account.vault.fetch(vault);

  const qv = await safeTokenAmount(connection, quoteVaultPda(vault));
  const bv = await safeTokenAmount(connection, baseVaultPda(vault));

  const totalShares = toBig(v.totalShares);
  const lastPrice = toBig(v.lastPrice);
  const lpValueQuote = toBig(v.lpValueQuote);
  const driftCollateralQuote = toBig(v.driftCollateralQuote);
  const driftPnlQuote = toBig(v.driftPnlQuote);
  const positionBaseQty = toBig(v.positionBaseQty);
  const shortBaseQty = toBig(v.shortBaseQty);

  const baseValue = (bv * lastPrice) / BigInt(PRICE_PRECISION);
  const navRaw = qv + baseValue + lpValueQuote + driftCollateralQuote + driftPnlQuote;

  const navQuote = Number(navRaw) / 10 ** QUOTE_DECIMALS;
  const sharesHuman = Number(totalShares) / 10 ** SHARE_DECIMALS;
  const pricePerShare = sharesHuman > 0 ? navQuote / sharesHuman : 1;

  return {
    authority: v.authority.toBase58(),
    keeper: v.keeper.toBase58(),
    paused: v.paused,
    deltaToleranceBps: v.deltaToleranceBps,
    minMarginRatioBps: v.minMarginRatioBps,
    maxFundingRateBps: v.maxFundingRateBps,
    totalShares,
    lastPrice,
    positionBaseQty,
    shortBaseQty,
    lpValueQuote,
    driftCollateralQuote,
    driftPnlQuote,
    idleQuote: qv,
    idleBase: bv,
    navQuote,
    pricePerShare,
    deltaBase: Number(positionBaseQty - shortBaseQty) / 10 ** QUOTE_DECIMALS,
  };
}

async function safeTokenAmount(connection: Connection, addr: PublicKey): Promise<bigint> {
  try {
    const acc = await getAccount(connection, addr);
    return acc.amount;
  } catch {
    return 0n;
  }
}

export { shareMintPda };
