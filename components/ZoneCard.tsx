import clsx from "clsx";
import { MapPin, MonitorCheck } from "lucide-react";
import { Zone, formatSpica } from "@/lib/spica";

type ZoneCardProps = {
  zone: Zone;
  onSelect?: (zoneId: string) => void;
  selected?: boolean;
};

export function ZoneCard({ zone, onSelect, selected }: ZoneCardProps) {
  const activePcs = zone.pcs.filter((pc) => pc.sessionId || pc.status === "in_use").length;
  const availablePcs = zone.pcs.filter((pc) => pc.status === "available" && !pc.sessionId).length;
  const startingRate = Math.min(...zone.pcs.map((pc) => pc.ratePerHour || 100), 100);

  return (
    <button
      className={clsx(
        "rounded-2xl border bg-white/[0.055] p-5 text-left shadow-nebula backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-cyan-200/30 hover:bg-white/[0.075] hover:shadow-glow",
        selected ? "border-cyan-200/40" : "border-white/10"
      )}
      onClick={() => onSelect?.(zone.id)}
      type="button"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">{zone.name}</h3>
          <p className="mt-2 flex items-center gap-2 text-sm text-slate-500">
            <MapPin className="h-4 w-4" />
            {zone.city}
          </p>
        </div>
        <span
          className={clsx(
            "rounded-full border px-3 py-1 text-xs font-semibold",
            zone.status === "Active" && "border-emerald-300/25 bg-emerald-300/10 text-emerald-200",
            zone.status === "Pending" && "border-amber-300/25 bg-amber-300/10 text-amber-200",
            zone.status === "Suspended" && "border-red-300/25 bg-red-400/10 text-red-200"
          )}
        >
          {zone.status}
        </span>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
          <p className="text-xs text-slate-500">Availability</p>
          <p className="mt-1 flex items-center gap-2 text-lg font-semibold text-white">
            <MonitorCheck className="h-4 w-4 text-cyan-200" />
            {availablePcs} seats
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
          <p className="text-xs text-slate-500">Live Sessions</p>
          <p className="mt-1 text-lg font-semibold text-white">{activePcs}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
          <p className="text-xs text-slate-500">Starting rent</p>
          <p className="mt-1 text-lg font-semibold text-cyan-100">{formatSpica(startingRate)}/h</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
          <p className="text-xs text-slate-500">Access</p>
          <p className="mt-1 text-lg font-semibold text-purple-100">Operator verified</p>
        </div>
      </div>
    </button>
  );
}
