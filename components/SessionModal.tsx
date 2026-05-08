"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Rocket, X } from "lucide-react";
import { GamingPc, Player, Zone, calculateSessionCost, formatSpica } from "@/lib/spica";
import { AppButton } from "@/components/ui/AppButton";

type SessionModalProps = {
  open: boolean;
  pc: GamingPc | null;
  zone: Zone | null;
  players: Player[];
  selectedPlayerId: string;
  onPlayerChange: (playerId: string) => void;
  onClose: () => void;
  onStart: (playerId: string, durationMinutes: number) => void;
};

export function SessionModal({ open, pc, zone, players, selectedPlayerId, onPlayerChange, onClose, onStart }: SessionModalProps) {
  const [duration, setDuration] = useState(60);

  useEffect(() => {
    if (open) {
      setDuration(60);
    }
  }, [open]);

  const selectedPlayer = players.find((player) => player.id === selectedPlayerId) ?? players[0];
  const cost = useMemo(() => (pc ? calculateSessionCost(pc.ratePerHour, duration) : 0), [duration, pc]);
  const canAfford = selectedPlayer.balance >= cost;

  if (!open || !pc || !zone) {
    return null;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (canAfford) {
      onStart(selectedPlayer.id, Math.max(1, duration));
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-xl">
      <div className="w-full max-w-lg animate-notification-in rounded-2xl border border-white/10 bg-[#0b0c12] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.65),0_0_42px_rgba(168,85,247,0.18)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-cyan-200">Start Cross-Zone Session</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">
              {pc.name} / {zone.name}
            </h3>
          </div>
          <button
            aria-label="Close modal"
            className="rounded-full border border-white/10 bg-white/[0.04] p-2 text-slate-300 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
            onClick={onClose}
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-slate-300">Player</span>
              <select
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-200/50"
                onChange={(event) => onPlayerChange(event.target.value)}
                value={selectedPlayerId}
              >
                {players.map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-300">Duration minutes</span>
              <input
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-200/50"
                min={1}
                onChange={(event) => setDuration(Number(event.target.value))}
                type="number"
                value={duration}
              />
            </label>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[30, 60, 120].map((preset) => (
              <button
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-300 transition hover:border-purple-200/40 hover:bg-purple-300/10 hover:text-white"
                key={preset}
                onClick={() => setDuration(preset)}
                type="button"
              >
                {preset}m
              </button>
            ))}
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="text-slate-400">Session cost</span>
              <span className="font-semibold text-cyan-100">{formatSpica(cost)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-4 text-sm">
              <span className="text-slate-400">Player balance</span>
              <span className="font-semibold text-white">{formatSpica(selectedPlayer.balance)}</span>
            </div>
          </div>

          <AppButton
            className="w-full py-3"
            disabled={!canAfford}
            type="submit"
          >
            <Rocket className="h-4 w-4" />
            {canAfford ? "Start Session" : "Insufficient SPICA"}
          </AppButton>
        </form>
      </div>
    </div>
  );
}
