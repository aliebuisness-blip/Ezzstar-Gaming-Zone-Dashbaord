"use client";

import { FormEvent, useEffect, useState } from "react";
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

  if (!open || !pc || !zone || !selectedPlayer) {
    return null;
  }

  const maxPlayableMinutes = pc && selectedPlayer ? Math.floor((selectedPlayer.balance / pc.ratePerHour) * 60) : 0;
  const safeDuration = Math.min(Math.max(1, duration), Math.max(1, maxPlayableMinutes));
  const cost = calculateSessionCost(pc.ratePerHour, safeDuration);
  const canAfford = selectedPlayer.balance >= cost && maxPlayableMinutes > 0;
  const playerLabel = selectedPlayer.name || selectedPlayer.username || selectedPlayer.email || "Player";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (canAfford) {
      onStart(selectedPlayer.id, safeDuration);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
      <div className="w-full max-w-lg animate-notification-in rounded-2xl border border-white/10 bg-[#0b0c12] p-4 shadow-[0_24px_90px_rgba(0,0,0,0.65)] sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-cyan-200">Operator Session Start</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">
              {pc.name} / {zone.name}
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">Verify the player at the counter or PC client. SPICA time is calculated from the player's balance and this PC's hourly rate.</p>
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

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 p-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-sm font-bold text-cyan-100">
              {selectedPlayer.avatar ? <img alt="" className="h-full w-full object-cover" src={selectedPlayer.avatar} /> : playerLabel.slice(0, 2).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-white">{playerLabel}</span>
              <span className="block truncate text-xs text-slate-500">{selectedPlayer.email ?? selectedPlayer.username ?? selectedPlayer.id}</span>
            </span>
            <span className="shrink-0 text-xs font-semibold text-cyan-100">{formatSpica(selectedPlayer.balance)}</span>
          </div>

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
                max={Math.max(1, maxPlayableMinutes)}
                min={1}
                onChange={(event) => setDuration(Math.min(Number(event.target.value), Math.max(1, maxPlayableMinutes)))}
                type="number"
                value={safeDuration}
              />
            </label>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[30, 60, 120].map((preset) => (
              <button
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-300 transition hover:border-purple-200/40 hover:bg-purple-300/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                disabled={maxPlayableMinutes < preset}
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
            <div className="mt-2 flex items-center justify-between gap-4 text-sm">
              <span className="text-slate-400">Rent / hour</span>
              <span className="font-semibold text-purple-100">{formatSpica(pc.ratePerHour)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-4 text-sm">
              <span className="text-slate-400">Playable time from balance</span>
              <span className="font-semibold text-emerald-100">{maxPlayableMinutes} min</span>
            </div>
          </div>

          <AppButton
            className="w-full py-3"
            disabled={!canAfford}
            type="submit"
          >
            <Rocket className="h-4 w-4" />
            {canAfford ? "Confirm & Start Session" : "Insufficient SPICA"}
          </AppButton>
        </form>
      </div>
    </div>
  );
}
