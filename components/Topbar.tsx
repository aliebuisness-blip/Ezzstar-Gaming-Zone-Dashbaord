"use client";

import { Activity, Bell, Coins, Network, ShieldCheck } from "lucide-react";
import { AccountMenu } from "@/components/AccountMenu";
import { formatSpica } from "@/lib/spica";

type TopbarProps = {
  title: string;
  activeZones: number;
  playerBalance: number;
  commissionEarned: number;
  eyebrow?: string;
  unreadCount?: number;
  activityCount?: number;
  onOpenNotifications?: () => void;
  onOpenActivity?: () => void;
};

export function Topbar({
  title,
  activeZones,
  playerBalance,
  commissionEarned,
  eyebrow = "SPICA Arena OS",
  unreadCount = 0,
  activityCount = 0,
  onOpenNotifications,
  onOpenActivity
}: TopbarProps) {
  return (
    <header className="sticky top-0 z-10 border-b border-white/10 bg-[#050508]/90 px-4 py-3 backdrop-blur-xl md:px-8 md:py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-purple-200/80">{eyebrow}</p>
          <h2 className="mt-1 truncate text-lg font-semibold tracking-tight text-white sm:text-2xl">{title}</h2>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <div className="hidden items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-sm text-emerald-100 shadow-[0_0_22px_rgba(52,211,153,0.12)] sm:flex">
            <Network className="h-4 w-4" />
            <span>{activeZones} Active Zones</span>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-sm text-cyan-100 shadow-[0_0_22px_rgba(34,211,238,0.12)]">
            <Coins className="h-4 w-4" />
            <span>{formatSpica(playerBalance)}</span>
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-purple-300/20 bg-purple-300/10 px-3 py-2 text-sm text-purple-100 shadow-[0_0_22px_rgba(168,85,247,0.12)] md:flex">
            <ShieldCheck className="h-4 w-4" />
            <span>{formatSpica(commissionEarned)} Fee</span>
          </div>
          {onOpenActivity ? (
            <button
              aria-label="Open operational activity"
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.045] text-slate-300 transition hover:border-cyan-200/30 hover:bg-white/[0.075] hover:text-white"
              onClick={onOpenActivity}
              type="button"
            >
              <Activity className="h-4 w-4" />
              {activityCount ? <span className="absolute -right-1 -top-1 h-4 min-w-4 rounded-full bg-cyan-300 px-1 text-[10px] font-bold leading-4 text-black">{Math.min(activityCount, 9)}</span> : null}
            </button>
          ) : null}
          <button
            aria-label="Open notifications"
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.045] text-slate-300 transition hover:border-purple-200/30 hover:bg-white/[0.075] hover:text-white"
            onClick={onOpenNotifications}
            type="button"
          >
            <Bell className="h-4 w-4" />
            {unreadCount ? <span className="absolute -right-1 -top-1 h-4 min-w-4 animate-pulse rounded-full bg-purple-300 px-1 text-[10px] font-bold leading-4 text-black">{Math.min(unreadCount, 9)}</span> : null}
          </button>
          <AccountMenu />
        </div>
      </div>
    </header>
  );
}
