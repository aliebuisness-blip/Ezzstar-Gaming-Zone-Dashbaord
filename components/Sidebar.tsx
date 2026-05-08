"use client";

import {
  Banknote,
  Cpu,
  Gauge,
  Landmark,
  Monitor,
  Settings,
  ShieldCheck,
  Timer,
  UserRound,
  WalletCards
} from "lucide-react";
import clsx from "clsx";
import { ViewKey } from "@/lib/spica";

const items = [
  { label: "Overview", icon: Gauge },
  { label: "Zones", icon: Landmark },
  { label: "PC Control", icon: Monitor },
  { label: "Players", icon: UserRound },
  { label: "Wallet", icon: WalletCards },
  { label: "Sessions", icon: Timer },
  { label: "Settlements", icon: Banknote },
  { label: "Withdrawals", icon: ShieldCheck },
  { label: "Settings", icon: Settings }
] satisfies Array<{ label: ViewKey; icon: typeof Gauge }>;

type SidebarProps = {
  activeView: ViewKey;
  onViewChange: (view: ViewKey) => void;
};

export function Sidebar({ activeView, onViewChange }: SidebarProps) {
  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-72 border-r border-white/10 bg-black/40 px-5 py-6 backdrop-blur-2xl lg:block">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-300/35 bg-cyan-300/10 shadow-glow">
          <Cpu className="h-5 w-5 text-cyan-200" />
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-200">SPICA</p>
          <h1 className="text-lg font-semibold text-white">Arena OS</h1>
        </div>
      </div>

      <nav className="mt-9 space-y-2">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.label;
          return (
            <button
              key={item.label}
              className={clsx(
                "group flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium transition duration-200",
                isActive
                  ? "border border-purple-300/25 bg-white/[0.08] text-white shadow-glow"
                  : "text-slate-400 hover:bg-white/[0.06] hover:text-slate-100"
              )}
              onClick={() => onViewChange(item.label)}
              type="button"
            >
              <Icon className={clsx("h-5 w-5", isActive ? "text-cyan-200" : "text-slate-500 group-hover:text-cyan-200")} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="absolute bottom-6 left-5 right-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-nebula">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Credit Rail</p>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-sm text-slate-300">Mock Network Live</span>
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.9)]" />
        </div>
      </div>
    </aside>
  );
}
