"use client";

import { useVault } from "@/hooks/useVault";
import { useShareBalance } from "@/hooks/useShareBalance";
import { Stat } from "./components/Stat";
import { DepositWithdraw } from "./components/DepositWithdraw";
import { Donut } from "./components/Donut";
import { PRICE_PRECISION } from "@/lib/config";

const usd = (n: number) => `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

export default function Overview() {
  const { state, online, loading, refresh } = useVault();
  const { shares } = useShareBalance();

  if (loading && !state) {
    return <div className="px-8 py-10 text-sm text-white/40">Loading vault…</div>;
  }

  if (online === false || !state) {
    return (
      <div className="mx-auto max-w-5xl px-8 py-10">
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8">
          <h2 className="text-lg font-semibold">Can&apos;t reach the vault</h2>
          <p className="mt-1 max-w-md text-sm text-white/45">
            No vault was found on this RPC, or the node is unreachable. Make sure your surfnet /
            cluster is running and the program is deployed.
          </p>
          <button
            onClick={refresh}
            className="mt-6 rounded-lg bg-[#9aa8f0] px-4 py-2 text-sm font-medium text-[#14152b] transition hover:bg-[#aeb9f4]"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const yourValue = shares * state.pricePerShare;

  const idleBaseValue = (Number(state.idleBase) * Number(state.lastPrice)) / PRICE_PRECISION / 1e6;
  const composition = [
    { label: "Idle USDC", value: Number(state.idleQuote) / 1e6, color: "#9aa8f0" },
    { label: "Idle wSOL", value: idleBaseValue, color: "#60a5fa" },
    { label: "Meteora LP leg", value: Number(state.lpValueQuote) / 1e6, color: "#34d399" },
    { label: "Drift collateral", value: Number(state.driftCollateralQuote) / 1e6, color: "#a78bfa" },
  ];

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Overview</h1>
          <p className="mt-1 text-sm text-white/45">
            Delta-neutral USDC vault ·{" "}
            <span className={state.paused ? "text-amber-400" : "text-emerald-400"}>
              {state.paused ? "paused" : "active"}
            </span>
          </p>
        </div>
      </div>

      {state.paused && (
        <div className="mt-6 rounded-xl border border-amber-400/30 bg-amber-400/[0.06] px-4 py-3 text-sm text-amber-200/90">
          The vault is paused by the authority. Deposits are rejected until it resumes.
        </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-4">
        <Stat label="NAV" value={usd(state.navQuote)} sub="total vault value" />
        <Stat
          label="Price / share"
          value={state.pricePerShare.toLocaleString(undefined, { maximumFractionDigits: 4 })}
          sub="USDC per share"
        />
        <Stat
          label="Your shares"
          value={shares.toLocaleString(undefined, { maximumFractionDigits: 4 })}
          sub={`≈ ${usd(yourValue)}`}
          tint={shares > 0 ? "#9aa8f0" : undefined}
        />
        <Stat
          label="Net delta"
          value={`${state.deltaBase.toLocaleString(undefined, { maximumFractionDigits: 4 })}`}
          sub="base exposure (target ≈ 0)"
          tint={Math.abs(state.deltaBase) < 0.01 ? "#34d399" : "#f59e0b"}
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <h2 className="text-sm font-medium text-white/70">Vault composition</h2>
          <div className="mt-5">
            <Donut data={composition} centerLabel="NAV" centerValue={usd(state.navQuote)} />
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 border-t border-white/5 pt-5 text-sm">
            <Field label="LP base qty" value={(Number(state.positionBaseQty) / 1e6).toFixed(4)} />
            <Field label="Short base qty" value={(Number(state.shortBaseQty) / 1e6).toFixed(4)} />
            <Field label="Last marked price" value={usd(Number(state.lastPrice) / 1e6)} />
            <Field
              label="Drift PnL"
              value={usd(Number(state.driftPnlQuote) / 1e6)}
              tint={state.driftPnlQuote >= 0n ? "#34d399" : "#f87171"}
            />
          </div>
        </div>

        <DepositWithdraw onDone={refresh} />
      </div>
    </div>
  );
}

function Field({ label, value, tint }: { label: string; value: string; tint?: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-white/35">{label}</div>
      <div className="mt-0.5 tabular-nums" style={tint ? { color: tint } : undefined}>
        {value}
      </div>
    </div>
  );
}
