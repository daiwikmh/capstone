"use client";

import { useVault } from "@/hooks/useVault";

export default function Safety() {
  const { state, loading } = useVault();

  if (loading && !state) return <div className="px-8 py-10 text-sm text-white/40">Loading…</div>;
  if (!state) return <div className="px-8 py-10 text-sm text-white/40">No vault found.</div>;

  const rules = [
    {
      t: "Stay balanced",
      v: `${state.deltaToleranceBps} bps`,
      d: "Max allowed gap between the short and the LP's risky-token amount on every rehedge.",
    },
    {
      t: "Keep a margin",
      v: `${state.minMarginRatioBps} bps`,
      d: "Minimum margin ratio the hedge must keep — guards against forced liquidation.",
    },
    {
      t: "Funding brake",
      v: `${state.maxFundingRateBps} bps`,
      d: "Above this funding rate the keeper may only shrink the short, never grow it.",
    },
  ];

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <h1 className="text-xl font-semibold tracking-tight">Safety</h1>
      <p className="mt-1 text-sm text-white/45">
        Keeper proposes, contract constrains. These limits are enforced on-chain in every rehedge.
      </p>

      <div className="mt-8 grid gap-6 md:grid-cols-3">
        {rules.map((r, i) => (
          <div key={r.t} className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <span className="font-mono text-sm text-[#9aa8f0]">Rule {i + 1}</span>
            <h3 className="mt-3 text-lg font-semibold">{r.t}</h3>
            <div className="mt-1 text-2xl font-semibold tabular-nums text-white">{r.v}</div>
            <p className="mt-2 text-[13px] leading-relaxed text-white/50">{r.d}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-sm">
          <div className="text-[11px] uppercase tracking-wide text-white/35">Authority</div>
          <div className="mt-1 break-all font-mono text-[12px] text-white/70">{state.authority}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-sm">
          <div className="text-[11px] uppercase tracking-wide text-white/35">Keeper</div>
          <div className="mt-1 break-all font-mono text-[12px] text-white/70">{state.keeper}</div>
        </div>
      </div>

      <p className="mt-6 text-sm text-white/40">
        If any rule fails, the whole transaction reverts and nothing changes. The vault PDA — not any
        human wallet — owns the funds.
      </p>
    </div>
  );
}
