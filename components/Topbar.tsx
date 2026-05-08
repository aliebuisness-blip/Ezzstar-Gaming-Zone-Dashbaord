import { Coins, Network, ShieldCheck } from "lucide-react";
import { formatSpica } from "@/lib/spica";

type TopbarProps = {
  title: string;
  activeZones: number;
  playerBalance: number;
  commissionEarned: number;
  eyebrow?: string;
};

export function Topbar({ title, activeZones, playerBalance, commissionEarned, eyebrow = "SPICA Arena OS" }: TopbarProps) {
  return (
    <header className="sticky top-0 z-10 border-b border-white/10 bg-[#050508]/78 px-5 py-4 backdrop-blur-2xl md:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-purple-200/80">{eyebrow}</p>
          <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-white sm:text-2xl">{title}</h2>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-sm text-emerald-100 shadow-[0_0_22px_rgba(52,211,153,0.12)]">
            <Network className="h-4 w-4" />
            <span>{activeZones} Active Zones</span>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-sm text-cyan-100 shadow-[0_0_22px_rgba(34,211,238,0.12)]">
            <Coins className="h-4 w-4" />
            <span>{formatSpica(playerBalance)}</span>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-purple-300/20 bg-purple-300/10 px-3 py-2 text-sm text-purple-100 shadow-[0_0_22px_rgba(168,85,247,0.12)]">
            <ShieldCheck className="h-4 w-4" />
            <span>{formatSpica(commissionEarned)} Fee</span>
          </div>
        </div>
      </div>
    </header>
  );
}
