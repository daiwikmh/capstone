"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { dashboardNav } from "../config";

const WalletMultiButton = dynamic(
  () => import("@solana/wallet-adapter-react-ui").then((m) => m.WalletMultiButton),
  { ssr: false },
);

function pageLabel(pathname: string) {
  return dashboardNav.find((n) => n.href === pathname)?.label ?? "Overview";
}

export function Topbar() {
  const pathname = usePathname();
  const page = pageLabel(pathname);

  return (
    <header className="sticky top-0 z-10 border-b border-white/10 bg-[#0b0c0f]/80 backdrop-blur-xl">
      <div className="flex h-14 items-center justify-between px-6">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-white/40">vault</span>
          <span className="text-white/20">/</span>
          <span className="font-medium text-white">{page}</span>
        </div>
        <WalletMultiButton />
      </div>
    </header>
  );
}
