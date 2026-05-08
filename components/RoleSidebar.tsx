"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Banknote,
  BarChart3,
  Coins,
  Gamepad2,
  Gauge,
  Landmark,
  Monitor,
  Settings,
  ShieldCheck,
  Sparkles,
  Timer,
  Trophy,
  UserRound,
  Users,
  WalletCards
} from "lucide-react";
import clsx from "clsx";
import { DashboardRole } from "@/lib/spica";

export type RoleNavKey =
  | "Home"
  | "Wallet"
  | "Activity"
  | "Zones"
  | "Tournaments"
  | "Updates"
  | "Profile"
  | "Nearby Zones"
  | "Active Session"
  | "Rewards"
  | "Play History"
  | "PCs"
  | "Customers"
  | "Sessions"
  | "Earnings"
  | "PC Control"
  | "Live Sessions"
  | "Settlements"
  | "Player Activity"
  | "Payout Requests"
  | "Players"
  | "Requests"
  | "System Health"
  | "All Zones"
  | "All Players"
  | "Commissions"
  | "Withdrawal Approvals"
  | "Settlement Approvals"
  | "System Analytics"
  | "Settings";

const roleMeta = {
  player: {
    eyebrow: "Player",
    title: "Arena Wallet",
    href: "/player",
    nav: [
      { label: "Home", href: "/player", icon: Gauge },
      { label: "Wallet", href: "/player/wallet", icon: WalletCards },
      { label: "Activity", href: "/player/activity", icon: Timer },
      { label: "Zones", href: "/player/zones", icon: Landmark },
      { label: "Tournaments", href: "/player/tournaments", icon: Trophy },
      { label: "Updates", href: "/player/updates", icon: Activity },
      { label: "Profile", href: "/player/profile", icon: UserRound }
    ]
  },
  zone: {
    eyebrow: "Owner",
    title: "Zone Console",
    href: "/zone",
    nav: [
      { label: "Home", href: "/zone", icon: Gauge },
      { label: "PCs", href: "/zone/pcs", icon: Monitor },
      { label: "Customers", href: "/zone/customers", icon: Users },
      { label: "Sessions", href: "/zone/sessions", icon: Activity },
      { label: "Earnings", href: "/zone/earnings", icon: Coins },
      { label: "Updates", href: "/zone/updates", icon: Sparkles },
      { label: "Settings", href: "/zone/settings", icon: Settings }
    ]
  },
  admin: {
    eyebrow: "Ezzstar",
    title: "Admin Core",
    href: "/admin",
    nav: [
      { label: "Home", href: "/admin", icon: Gauge },
      { label: "Zones", href: "/admin/zones", icon: Landmark },
      { label: "Players", href: "/admin/players", icon: UserRound },
      { label: "Sessions", href: "/admin/sessions", icon: Timer },
      { label: "Settlements", href: "/admin/settlements", icon: Banknote },
      { label: "Requests", href: "/admin/requests", icon: WalletCards },
      { label: "System Health", href: "/admin/system-health", icon: BarChart3 },
      { label: "Settings", href: "/admin/settings", icon: Settings }
    ]
  }
} satisfies Record<DashboardRole, { eyebrow: string; title: string; href: string; nav: Array<{ label: RoleNavKey; href: string; icon: typeof Gauge }> }>;

type RoleSidebarProps = {
  role: DashboardRole;
  activeView: RoleNavKey;
  onViewChange: (view: RoleNavKey) => void;
};

export function RoleSidebar({ role, activeView, onViewChange }: RoleSidebarProps) {
  const meta = roleMeta[role];
  const pathname = usePathname();

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-72 border-r border-white/10 bg-black/45 px-5 py-6 backdrop-blur-2xl lg:block">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-300/35 bg-cyan-300/10 shadow-glow">
            <Sparkles className="h-5 w-5 text-cyan-200" />
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-200">SPICA</p>
            <h1 className="text-lg font-semibold text-white">Arena OS</h1>
          </div>
        </div>

        <div className="mt-7 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{meta.eyebrow} Dashboard</p>
          <h2 className="mt-2 text-xl font-semibold text-white">{meta.title}</h2>
        </div>

        <nav className="mt-6 space-y-2">
          {meta.nav.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || activeView === item.label;
            return (
              <Link
                className={clsx(
                  "group flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium transition duration-200",
                  isActive
                    ? "border border-purple-300/25 bg-white/[0.08] text-white shadow-glow"
                    : "text-slate-400 hover:bg-white/[0.06] hover:text-slate-100"
                )}
                href={item.href}
                key={item.label}
                onClick={() => onViewChange(item.label)}
              >
                <Icon className={clsx("h-5 w-5", isActive ? "text-cyan-200" : "text-slate-500 group-hover:text-cyan-200")} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <nav className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-4 gap-1 rounded-2xl border border-white/10 bg-black/75 p-2 shadow-nebula backdrop-blur-2xl lg:hidden">
        {meta.nav.slice(0, 4).map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || activeView === item.label;
          return (
            <Link
              className={clsx(
                "flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-semibold transition",
                isActive ? "bg-cyan-300/15 text-cyan-100" : "text-slate-500 hover:bg-white/[0.06] hover:text-white"
              )}
              href={item.href}
              key={item.label}
              onClick={() => onViewChange(item.label)}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
