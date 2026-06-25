import { Connection, Keypair, PublicKey, Transaction } from "@solana/web3.js";
import * as anchor from "@anchor-lang/core";
import { idl } from "./config";

type SignerWallet = {
  publicKey: PublicKey;
  signTransaction: <T extends Transaction>(tx: T) => Promise<T>;
  signAllTransactions: <T extends Transaction>(txs: T[]) => Promise<T[]>;
};

type LooseProgram = {
  account: { vault: { fetch: (addr: PublicKey) => Promise<VaultAccount> } };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  methods: any;
};

export type VaultAccount = {
  authority: PublicKey;
  keeper: PublicKey;
  quoteMint: PublicKey;
  baseMint: PublicKey;
  shareMint: PublicKey;
  quoteVault: PublicKey;
  baseVault: PublicKey;
  meteoraPosition: PublicKey;
  driftUser: PublicKey;
  deltaToleranceBps: number;
  minMarginRatioBps: number;
  maxFundingRateBps: number;
  positionBaseQty: { toString(): string };
  shortBaseQty: { toString(): string };
  lpValueQuote: { toString(): string };
  driftCollateralQuote: { toString(): string };
  driftPnlQuote: { toString(): string };
  lastPrice: { toString(): string };
  totalShares: { toString(): string };
  paused: boolean;
  bump: number;
};

function makeProgram(connection: Connection, wallet: SignerWallet): LooseProgram {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const provider = new anchor.AnchorProvider(connection, wallet as any, {
    commitment: "confirmed",
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new anchor.Program(idl as any, provider) as unknown as LooseProgram;
}

export function getReadProgram(connection: Connection) {
  const kp = Keypair.generate();
  const dummy: SignerWallet = {
    publicKey: kp.publicKey,
    signTransaction: async (tx) => tx,
    signAllTransactions: async (txs) => txs,
  };
  return makeProgram(connection, dummy);
}

export function getProgram(connection: Connection, wallet: SignerWallet) {
  return makeProgram(connection, wallet);
}

export { anchor };
