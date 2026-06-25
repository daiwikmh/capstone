import { PublicKey } from "@solana/web3.js";
import idl from "./bigshort.json";

export const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL ?? "http://127.0.0.1:8899";

export const PROGRAM_ID = new PublicKey(idl.address);

export const QUOTE_MINT = new PublicKey(
  process.env.NEXT_PUBLIC_QUOTE_MINT ?? "EgPeELtihTzKeLCYwWnpeE8azeqJTJrL5kmow9Fw6hgd",
);
export const BASE_MINT = new PublicKey("So11111111111111111111111111111111111111112");

export const QUOTE_DECIMALS = 6;
export const SHARE_DECIMALS = 6;
export const PRICE_PRECISION = 1_000_000;

const enc = (s: string) => Buffer.from(s);

export function vaultPda() {
  return PublicKey.findProgramAddressSync([enc("vault"), QUOTE_MINT.toBuffer()], PROGRAM_ID)[0];
}
export function shareMintPda(vault: PublicKey) {
  return PublicKey.findProgramAddressSync([enc("share"), vault.toBuffer()], PROGRAM_ID)[0];
}
export function quoteVaultPda(vault: PublicKey) {
  return PublicKey.findProgramAddressSync([enc("quote"), vault.toBuffer()], PROGRAM_ID)[0];
}
export function baseVaultPda(vault: PublicKey) {
  return PublicKey.findProgramAddressSync([enc("base"), vault.toBuffer()], PROGRAM_ID)[0];
}

export { idl };
