export type Segment = { label: string; value: number; color: string };

export function Donut({ data, centerLabel, centerValue }: { data: Segment[]; centerLabel: string; centerValue: string }) {
  const total = data.reduce((a, s) => a + Math.max(s.value, 0), 0) || 1;
  const r = 60;
  const stroke = 22;
  const c = 2 * Math.PI * r;

  let offset = 0;
  const arcs = data
    .filter((s) => s.value > 0)
    .map((s) => {
      const frac = s.value / total;
      const arc = (
        <circle
          key={s.label}
          cx="80"
          cy="80"
          r={r}
          fill="none"
          stroke={s.color}
          strokeWidth={stroke}
          strokeDasharray={`${frac * c} ${c}`}
          strokeDashoffset={-offset * c}
          transform="rotate(-90 80 80)"
        />
      );
      offset += frac;
      return arc;
    });

  return (
    <div className="flex items-center gap-6">
      <svg viewBox="0 0 160 160" className="h-40 w-40 shrink-0">
        <circle cx="80" cy="80" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
        {arcs}
        <text x="80" y="74" textAnchor="middle" className="fill-white/40 text-[9px] uppercase tracking-wide">
          {centerLabel}
        </text>
        <text x="80" y="92" textAnchor="middle" className="fill-white text-[15px] font-semibold tabular-nums">
          {centerValue}
        </text>
      </svg>

      <div className="flex-1 space-y-2.5">
        {data.map((s) => (
          <div key={s.label} className="flex items-center gap-2.5 text-[13px]">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
            <span className="flex-1 text-white/55">{s.label}</span>
            <span className="tabular-nums text-white/75">
              ${s.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </span>
            <span className="w-10 text-right tabular-nums text-white/35">
              {((Math.max(s.value, 0) / total) * 100).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
