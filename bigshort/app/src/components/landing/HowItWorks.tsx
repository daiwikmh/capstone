import { Container } from "./Container";

const STEPS = [
  { n: "01", t: "You deposit", b: "Put USDC into the vault and receive shares — your fair, NAV-priced receipt of ownership." },
  { n: "02", t: "Keeper deploys", b: "Liquidity goes into a Meteora concentrated position (the fee engine), and a matching short opens on Drift." },
  { n: "03", t: "Price wiggles", b: "When price trends, the LP would normally bleed to impermanent loss — the short gains and cancels it out." },
  { n: "04", t: "Rehedge", b: "The keeper rebalances the short to track the LP's risky-token amount. Every rebalance is checked on-chain." },
  { n: "05", t: "You withdraw", b: "Hand back shares, get your slice of (fees earned − hedging cost) at the current NAV." },
];

export function HowItWorks() {
  return (
    <section id="how" className="border-t border-white/5 py-28">
      <Container>
        <div className="max-w-2xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#9aa8f0]">How it works</p>
          <h2 className="mt-3 font-display text-4xl tracking-tight text-white sm:text-5xl">
            Fees in the front door. <br className="hidden sm:block" />
            Risk out the back, hedged.
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-white/55">
            Providing concentrated liquidity earns fees but quietly loses to impermanent loss. The
            vault opens an opposite bet on Drift so the price risk nets to roughly zero — leaving
            mostly the fees.
          </p>
        </div>

        <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/5 sm:grid-cols-2 lg:grid-cols-5">
          {STEPS.map((s) => (
            <div key={s.n} className="flex flex-col bg-[#0a0b0e] p-6">
              <span className="font-mono text-sm text-[#9aa8f0]">{s.n}</span>
              <h3 className="mt-3 text-base font-semibold text-white">{s.t}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-white/45">{s.b}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
