"use client";

import { useCallback, useEffect, useState } from "react";
import { getAssociatedTokenAddressSync, getAccount } from "@solana/spl-token";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { SHARE_DECIMALS, QUOTE_DECIMALS, QUOTE_MINT, shareMintPda, vaultPda } from "@/lib/config";

export function useShareBalance() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [shares, setShares] = useState<number>(0);
  const [usdc, setUsdc] = useState<number>(0);

  const refresh = useCallback(async () => {
    if (!publicKey) {
      setShares(0);
      setUsdc(0);
      return;
    }
    const shareMint = shareMintPda(vaultPda());
    try {
      const ata = getAssociatedTokenAddressSync(shareMint, publicKey);
      const acc = await getAccount(connection, ata);
      setShares(Number(acc.amount) / 10 ** SHARE_DECIMALS);
    } catch {
      setShares(0);
    }
    try {
      const ata = getAssociatedTokenAddressSync(QUOTE_MINT, publicKey);
      const acc = await getAccount(connection, ata);
      setUsdc(Number(acc.amount) / 10 ** QUOTE_DECIMALS);
    } catch {
      setUsdc(0);
    }
  }, [connection, publicKey]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { shares, usdc, refresh };
}
