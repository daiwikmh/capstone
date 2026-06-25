export function Stat({
  label,
  value,
  sub,
  tint,
}: {
  label: string;
  value: string | number;
  sub?: string;
  tint?: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="text-[11px] uppercase tracking-wide text-white/35">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums" style={tint ? { color: tint } : undefined}>
        {value}
      </div>
      {sub && <div className="mt-0.5 text-[12px] text-white/35">{sub}</div>}
    </div>
  );
}
