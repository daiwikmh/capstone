"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { dashboardNav } from "../config";
import { useVault } from "@/hooks/useVault";

function Icon({ name }: { name: string }) {
  const paths: Record<string, string> = {
    grid: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z",
    layers: "M12 2 2 7l10 5 10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
    shield: "M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z",
  };
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[20px] w-[20px] shrink-0"
    >
      <path d={paths[name]} />
    </svg>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { online } = useVault();

  return (
    <aside className="relative flex w-60 shrink-0 flex-col border-r border-white/10 bg-[#0a0b0e]">
      <div className="flex items-center justify-between px-5 py-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-[#9aa8f0] font-display text-sm font-bold text-[#14152b]">
            S
          </span>
          <span className="text-sm font-semibold tracking-tight">The Big Short</span>
        </Link>
      </div>

      <div className="px-5 pb-3 pt-1">
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.15em] text-white/30">
          <span className={`h-1.5 w-1.5 rounded-full ${online ? "bg-emerald-400" : "bg-red-500"}`} />
          {online === null ? "connecting…" : online ? "vault online" : "vault offline"}
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 px-3 pt-2">
        {dashboardNav.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] transition ${
                isActive ? "bg-white/[0.07] text-white" : "text-white/50 hover:bg-white/[0.04] hover:text-white/80"
              }`}
            >
              <Icon name={item.icon} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/5 px-5 py-4 text-[11px] leading-relaxed text-white/30">
        Non-custodial · the vault PDA owns all funds.
      </div>
    </aside>
  );
}
