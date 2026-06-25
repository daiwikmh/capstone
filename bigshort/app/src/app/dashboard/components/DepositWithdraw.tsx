"use client";

import { useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { deposit, withdraw } from "@/lib/actions";
import { QUOTE_DECIMALS, SHARE_DECIMALS } from "@/lib/config";
import { useShareBalance } from "@/hooks/useShareBalance";

type Mode = "deposit" | "withdraw";

export function DepositWithdraw({ onDone }: { onDone?: () => void }) {
  const { connection } = useConnection();
  const wallet = useWallet();
  const { shares, usdc, refresh } = useShareBalance();
  const [mode, setMode] = useState<Mode>("deposit");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const connected = wallet.connected && wallet.publicKey;
  const max = mode === "deposit" ? usdc : shares;
  const num = parseFloat(amount);
  const valid = connected && num > 0 && num <= max + 1e-9;

  async function submit() {
    if (!valid || !wallet.publicKey) return;
    setBusy(true);
    setMsg(null);
    try {
      const signer = {
        publicKey: wallet.publicKey,
        signTransaction: wallet.signTransaction!,
        signAllTransactions: wallet.signAllTransactions!,
      };
      const sig =
        mode === "deposit"
          ? await deposit(connection, signer, num, QUOTE_DECIMALS)
          : await withdraw(connection, signer, num, SHARE_DECIMALS);
      setMsg({ kind: "ok", text: `${mode === "deposit" ? "Deposited" : "Withdrew"} — ${sig.slice(0, 8)}…` });
      setAmount("");
      await refresh();
      onDone?.();
    } catch (e) {
      setMsg({ kind: "err", text: (e as Error).message.slice(0, 140) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
      <div className="flex rounded-lg border border-white/10 bg-white/[0.03] p-1">
        {(["deposit", "withdraw"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => {
              setMode(m);
              setAmount("");
              setMsg(null);
            }}
            className={`flex-1 rounded-md py-1.5 text-sm font-medium capitalize transition ${
              mode === m ? "bg-white/[0.08] text-white" : "text-white/40 hover:text-white/70"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between text-[12px] text-white/40">
          <span>{mode === "deposit" ? "Amount (USDC)" : "Shares"}</span>
          <button
            onClick={() => setAmount(String(max))}
            className="font-mono text-white/45 transition hover:text-[#9aa8f0]"
          >
            max {max.toLocaleString(undefined, { maximumFractionDigits: 4 })}
          </button>
        </div>
        <input
          type="number"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          className="mt-2 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-lg tabular-nums text-white outline-none focus:border-[#9aa8f0]/50"
        />
      </div>

      <button
        onClick={submit}
        disabled={!valid || busy}
        className="mt-5 w-full rounded-lg bg-[#9aa8f0] px-4 py-2.5 text-sm font-medium text-[#14152b] transition hover:bg-[#aeb9f4] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy
          ? "Confirming…"
          : !connected
            ? "Connect wallet"
            : mode === "deposit"
              ? "Deposit"
              : "Withdraw"}
      </button>

      {msg && (
        <p className={`mt-3 text-[12.5px] ${msg.kind === "ok" ? "text-emerald-400" : "text-red-400"}`}>
          {msg.text}
        </p>
      )}
    </div>
  );
}
