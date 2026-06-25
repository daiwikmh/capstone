import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
import BN from "bn.js";
import { QUOTE_MINT, baseVaultPda, quoteVaultPda, shareMintPda, vaultPda } from "./config";
import { getProgram } from "./program";

type SignerWallet = {
  publicKey: PublicKey;
  signTransaction: <T extends Transaction>(tx: T) => Promise<T>;
  signAllTransactions: <T extends Transaction>(txs: T[]) => Promise<T[]>;
};

function accounts(depositor: PublicKey) {
  const vault = vaultPda();
  const shareMint = shareMintPda(vault);
  return {
    depositor,
    vault,
    quoteMint: QUOTE_MINT,
    shareMint,
    quoteVault: quoteVaultPda(vault),
    baseVault: baseVaultPda(vault),
    depositorQuote: getAssociatedTokenAddressSync(QUOTE_MINT, depositor),
    depositorShare: getAssociatedTokenAddressSync(shareMint, depositor),
    tokenProgram: TOKEN_PROGRAM_ID,
  };
}

async function ensureShareAta(
  connection: Connection,
  depositor: PublicKey,
  shareMint: PublicKey,
  shareAta: PublicKey,
): Promise<Transaction | null> {
  const info = await connection.getAccountInfo(shareAta);
  if (info) return null;
  const tx = new Transaction().add(
    createAssociatedTokenAccountInstruction(depositor, shareAta, depositor, shareMint),
  );
  return tx;
}

export async function deposit(
  connection: Connection,
  wallet: SignerWallet,
  amountUi: number,
  quoteDecimals: number,
): Promise<string> {
  const program = getProgram(connection, wallet);
  const acc = accounts(wallet.publicKey);
  const amount = new BN(Math.round(amountUi * 10 ** quoteDecimals));

  const pre = await ensureShareAta(connection, wallet.publicKey, acc.shareMint, acc.depositorShare);
  if (pre) {
    pre.feePayer = wallet.publicKey;
    pre.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    const signed = await wallet.signTransaction(pre);
    const sig = await connection.sendRawTransaction(signed.serialize());
    await connection.confirmTransaction(sig, "confirmed");
  }

  return program.methods.deposit(amount).accountsPartial(acc).rpc();
}

export async function withdraw(
  connection: Connection,
  wallet: SignerWallet,
  sharesUi: number,
  shareDecimals: number,
): Promise<string> {
  const program = getProgram(connection, wallet);
  const acc = accounts(wallet.publicKey);
  const shares = new BN(Math.round(sharesUi * 10 ** shareDecimals));
  return program.methods.withdraw(shares).accountsPartial(acc).rpc();
}
