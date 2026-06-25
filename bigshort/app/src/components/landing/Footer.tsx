import Link from "next/link";
import { Container } from "./Container";
import { site } from "@/lib/site";

export function Footer() {
  return (
    <footer className="border-t border-white/10 py-14">
      <Container className="flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-[#9aa8f0] font-display text-sm font-bold text-[#14152b]">
              S
            </span>
            <span className="text-sm font-semibold tracking-tight">The Big Short</span>
          </div>
          <p className="mt-3 max-w-xs text-[13px] leading-relaxed text-white/40">
            Delta-neutral LP yield on Solana. Meteora fees, Drift hedge, on-chain safety.
          </p>
        </div>

        <div className="flex items-center gap-6 text-[13px] text-white/45">
          <Link href="/dashboard" className="transition hover:text-white">
            Open Vault
          </Link>
          <a href={site.github} target="_blank" rel="noreferrer" className="transition hover:text-white">
            GitHub
          </a>
        </div>
      </Container>
      <Container className="mt-10 text-[12px] text-white/25">
        Not investment advice. Experimental software — use at your own risk.
      </Container>
    </footer>
  );
}
