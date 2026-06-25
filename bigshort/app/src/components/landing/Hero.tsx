"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import { Container } from "./Container";

const springConfig = { stiffness: 60, damping: 22, mass: 0.6 };

function Content() {
  return (
    <div className="relative flex flex-col items-center text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[150%] w-[160%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] bg-[radial-gradient(ellipse_at_center,rgba(7,8,9,0.92)_0%,rgba(7,8,9,0.55)_42%,transparent_72%)] blur-2xl"
      />

      <span className="mb-7 inline-flex items-center gap-2.5 rounded-full border border-white/20 bg-white/[0.08] px-4 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-white/80 backdrop-blur-md">
        <span className="h-1.5 w-1.5 rounded-full bg-[#9aa8f0] shadow-[0_0_8px_#9aa8f0]" />
        Meteora LP
        <span className="text-white/25">·</span>
        Drift Hedge
        <span className="text-white/25">·</span>
        Delta-Neutral
      </span>

      <h1 className="max-w-4xl font-display text-5xl leading-[1.05] tracking-tight text-white drop-shadow-[0_2px_30px_rgba(0,0,0,0.7)] sm:text-[76px]">
        Earn the fees.
        <br />
        Short the{" "}
        <span className="bg-gradient-to-r from-[#cbd3ff] via-[#9aa8f0] to-[#a78bfa] bg-clip-text text-transparent">
          risk
        </span>
        .
      </h1>

      <p className="mt-7 max-w-xl text-lg font-medium leading-relaxed text-white/80 drop-shadow-[0_1px_14px_rgba(0,0,0,0.85)]">
        A non-custodial vault that LPs into Meteora and opens an offsetting Drift short — so you
        collect trading fees <span className="text-white">without the impermanent-loss bleed.</span>
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 font-mono text-[13px] uppercase tracking-wide text-white/70 drop-shadow-[0_1px_10px_rgba(0,0,0,0.85)]">
        <span>Deposit once</span>
        <span className="text-[#9aa8f0]">/</span>
        <span>Auto-hedged</span>
        <span className="text-[#9aa8f0]">/</span>
        <span className="text-white/90">Keeper can&apos;t steal</span>
      </div>

      <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/dashboard"
          className="rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black transition hover:bg-white/90"
        >
          Open the Vault
        </Link>
        <Link
          href="#how"
          className="rounded-full border border-white/15 bg-white/[0.06] px-5 py-2.5 text-sm text-white/85 backdrop-blur-sm transition hover:border-white/30"
        >
          How it works
        </Link>
      </div>
    </div>
  );
}

export function Hero() {
  const heroRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end end"] });
  const contentY = useSpring(useTransform(scrollYProgress, [0, 0.7], [0, -100]), springConfig);
  const contentScale = useSpring(useTransform(scrollYProgress, [0, 0.7], [1, 0.95]), springConfig);
  const contentOpacity = useSpring(useTransform(scrollYProgress, [0, 0.6], [1, 0]), springConfig);
  const bgScale = useTransform(scrollYProgress, [0, 1], [1.02, 1.15]);
  const overlayOpacity = useTransform(scrollYProgress, [0, 1], [0.3, 0.85]);
  const arrowOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);

  return (
    <div ref={heroRef} className="relative h-[200vh]">
      <section className="sticky top-0 flex h-screen items-center overflow-hidden">
        <motion.div
          className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,#1a1d3a_0%,transparent_55%),radial-gradient(circle_at_75%_70%,#2a1b3d_0%,transparent_50%),#070809]"
          style={{ scale: bgScale }}
        />
        <motion.div className="absolute inset-0 bg-black" style={{ opacity: overlayOpacity }} />

        <motion.div style={{ y: contentY, scale: contentScale, opacity: contentOpacity }} className="relative w-full">
          <Container>
            <Content />
          </Container>
        </motion.div>

        <motion.div
          style={{ opacity: arrowOpacity }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/60"
          aria-hidden
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6 animate-bounce">
            <path d="M12 5v14M19 12l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.div>
      </section>
    </div>
  );
}
