import { Container } from "./Container";

export function TwoLegs() {
  return (
    <section id="legs" className="border-t border-white/5 py-28">
      <Container>
        <div className="max-w-2xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#9aa8f0]">The two legs</p>
          <h2 className="mt-3 font-display text-4xl tracking-tight text-white sm:text-5xl">
            One vault, two positions, always balanced.
          </h2>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8">
            <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-emerald-300/80">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> LP leg · Meteora
            </div>
            <h3 className="mt-4 text-xl font-semibold text-white">Earns the fees</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-white/55">
              A concentrated-liquidity position collects trading fees but carries price exposure —
              the source of impermanent loss.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8">
            <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-[#9aa8f0]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#9aa8f0]" /> Hedge leg · Drift
            </div>
            <h3 className="mt-4 text-xl font-semibold text-white">Cancels the risk</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-white/55">
              A perp short sized to the LP&apos;s risky-token amount. When the LP loses to price, the
              short gains — they offset.
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-[#9aa8f0]/20 bg-[#9aa8f0]/[0.05] p-8">
          <p className="font-mono text-[11px] uppercase tracking-wider text-[#9aa8f0]">The key trick</p>
          <p className="mt-3 text-lg leading-relaxed text-white/80">
            An LP position&apos;s price risk equals{" "}
            <span className="text-white">how much of the risky token it currently holds</span>. Hold
            10 SOL inside Meteora → short 10 SOL on Drift. And that number is something the{" "}
            <span className="text-white">contract reads and verifies itself</span> — it never trusts
            the keeper&apos;s word.
          </p>
        </div>
      </Container>
    </section>
  );
}
