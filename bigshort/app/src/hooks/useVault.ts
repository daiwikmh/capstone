"use client";

import { useCallback, useEffect, useState } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { fetchVaultState, type VaultState } from "@/lib/vault";

export function useVault() {
  const { connection } = useConnection();
  const [state, setState] = useState<VaultState | null>(null);
  const [online, setOnline] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const s = await fetchVaultState(connection);
      setState(s);
      setOnline(true);
    } catch {
      setState(null);
      setOnline(false);
    } finally {
      setLoading(false);
    }
  }, [connection]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 10_000);
    return () => clearInterval(id);
  }, [refresh]);

  return { state, online, loading, refresh };
}
