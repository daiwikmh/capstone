import { Container } from "./Container";

const RULES = [
  {
    t: "Stay balanced",
    b: "The short must closely match the LP's risky-token amount. The keeper can't leave the vault directionally exposed.",
  },
  {
    t: "Keep a margin",
    b: "The hedge can never be pushed close to liquidation. A minimum margin ratio is enforced on every rehedge.",
  },
  {
    t: "Funding brake",
    b: "If holding the short gets too expensive, the keeper may only shrink it — never grow it into a costly position.",
  },
];

export function Safety() {
  return (
    <section id="safety" className="border-t border-white/5 py-28">
      <Container>
        <div className="max-w-2xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#9aa8f0]">The trust model</p>
          <h2 className="mt-3 font-display text-4xl tracking-tight text-white sm:text-5xl">
            Keeper proposes. Contract constrains.
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-white/55">
            Solana contracts can&apos;t run on a timer, so an off-chain keeper triggers rebalances.
            But we don&apos;t trust it — every move passes through a locked rulebook. The worst a
            broken keeper can do is <span className="text-white">nothing</span>, never something
            harmful.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {RULES.map((r, i) => (
            <div key={r.t} className="rounded-2xl border border-white/10 bg-white/[0.02] p-7">
              <span className="font-mono text-sm text-[#9aa8f0]">Rule {i + 1}</span>
              <h3 className="mt-3 text-lg font-semibold text-white">{r.t}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-white/50">{r.b}</p>
            </div>
          ))}
        </div>

        <p className="mt-8 text-sm text-white/40">
          If any rule fails, the whole transaction is rejected and nothing changes. The vault — not
          any human wallet — owns the money.
        </p>
      </Container>
    </section>
  );
}
