"use client";

import { useVault } from "@/hooks/useVault";

const usd = (n: number) => `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const base = (n: bigint) => (Number(n) / 1e6).toLocaleString(undefined, { maximumFractionDigits: 4 });

export default function Positions() {
  const { state, loading } = useVault();

  if (loading && !state) return <div className="px-8 py-10 text-sm text-white/40">Loading…</div>;
  if (!state) return <div className="px-8 py-10 text-sm text-white/40">No vault found.</div>;

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <h1 className="text-xl font-semibold tracking-tight">Positions</h1>
      <p className="mt-1 text-sm text-white/45">The two legs the vault holds at all times.</p>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-7">
          <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-emerald-300/80">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> LP leg · Meteora
          </div>
          <h2 className="mt-4 text-lg font-semibold">Earns the fees</h2>
          <dl className="mt-5 space-y-3 text-sm">
            <Row k="LP value" v={usd(Number(state.lpValueQuote) / 1e6)} />
            <Row k="Base held (delta)" v={base(state.positionBaseQty)} />
            <Row k="Last marked price" v={usd(Number(state.lastPrice) / 1e6)} />
          </dl>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-7">
          <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-[#9aa8f0]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#9aa8f0]" /> Hedge leg · Drift
          </div>
          <h2 className="mt-4 text-lg font-semibold">Cancels the risk</h2>
          <dl className="mt-5 space-y-3 text-sm">
            <Row k="Short base qty" v={base(state.shortBaseQty)} />
            <Row k="Collateral" v={usd(Number(state.driftCollateralQuote) / 1e6)} />
            <Row
              k="Unrealized PnL"
              v={usd(Number(state.driftPnlQuote) / 1e6)}
              tint={state.driftPnlQuote >= 0n ? "#34d399" : "#f87171"}
            />
          </dl>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-[#9aa8f0]/20 bg-[#9aa8f0]/[0.05] p-6 text-sm">
        <span className="font-mono text-[11px] uppercase tracking-wider text-[#9aa8f0]">Net delta</span>
        <p className="mt-2 text-white/80">
          {state.deltaBase.toLocaleString(undefined, { maximumFractionDigits: 4 })} base · the LP&apos;s
          risky-token amount minus the short. The keeper rehedges to drive this toward zero, within a{" "}
          {state.deltaToleranceBps} bps tolerance.
        </p>
      </div>
    </div>
  );
}

function Row({ k, v, tint }: { k: string; v: string; tint?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-white/5 pb-2">
      <dt className="text-white/45">{k}</dt>
      <dd className="tabular-nums" style={tint ? { color: tint } : undefined}>
        {v}
      </dd>
    </div>
  );
}
