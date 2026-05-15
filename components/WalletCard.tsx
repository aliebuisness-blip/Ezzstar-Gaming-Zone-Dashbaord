"use client";

import { FormEvent, useState } from "react";
import { Coins, WalletCards } from "lucide-react";
import { Player, WithdrawalType, formatSpica } from "@/lib/spica";

type WalletCardProps = {
  players: Player[];
  selectedPlayerId: string;
  onPlayerChange: (playerId: string) => void;
  onBuySpica: (playerId: string, amount: number) => void;
  onRequestWithdrawal: (userId: string, amount: number, type: WithdrawalType) => void;
  showWithdrawal?: boolean;
};

export function WalletCard({ players, selectedPlayerId, onPlayerChange, onBuySpica, onRequestWithdrawal, showWithdrawal = false }: WalletCardProps) {
  const [buyAmount, setBuyAmount] = useState(1000);
  const [withdrawAmount, setWithdrawAmount] = useState(250);
  const selectedPlayer = players.find((player) => player.id === selectedPlayerId) ?? players[0] ?? {
    id: "",
    name: "Player",
    username: "player",
    email: "",
    membership: "Starter",
    favoriteZones: [],
    balance: 0
  };
  const selectedPlayerName = selectedPlayer.name || selectedPlayer.username || selectedPlayer.email || "Player";
  const canTransact = Boolean(selectedPlayer.id);

  function handleBuy(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canTransact) {
      return;
    }
    onBuySpica(selectedPlayer.id, Math.max(1, buyAmount));
  }

  function handleWithdrawal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canTransact) {
      return;
    }
    onRequestWithdrawal(selectedPlayer.id, Math.max(1, withdrawAmount), "Player");
  }

  return (
    <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
      <article className="player-card-in player-card-hover rounded-2xl border border-white/10 bg-white/[0.055] p-4 shadow-nebula sm:p-5">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl border border-cyan-300/25 bg-cyan-300/10 p-2.5 text-cyan-100 sm:p-3">
            <WalletCards className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm text-slate-500">Global Ezzstar Player Wallet</p>
            <h3 className="truncate text-lg font-semibold text-white sm:text-xl">{selectedPlayerName}</h3>
            <p className="mt-1 truncate text-xs text-cyan-100">@{selectedPlayer.username ?? "player"} - {selectedPlayer.membership ?? "Starter"}</p>
          </div>
        </div>

        <div className="player-balance-attention mt-5 grid gap-3 rounded-2xl border border-white/10 bg-black/30 p-4 md:grid-cols-[1fr_auto] md:items-end md:p-5">
          <div className="min-w-0">
            <p className="text-sm text-slate-500">Available balance</p>
            <p className="mt-2 break-words text-3xl font-bold tracking-tight text-cyan-100 drop-shadow-[0_0_18px_rgba(34,211,238,0.35)] sm:text-4xl">
              {formatSpica(selectedPlayer.balance)}
            </p>
          </div>
          <div className="min-w-0 text-sm text-slate-400">
            <p className="truncate">{selectedPlayer.email ?? "Global account"}</p>
            <p className="mt-1 truncate">Favorites: {selectedPlayer.favoriteZones?.join(", ") || "None yet"}</p>
          </div>
        </div>

        <form className="mt-5 grid gap-3 md:grid-cols-[1fr_1fr_auto]" onSubmit={handleBuy}>
          <select
            className="rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-200/50"
            onChange={(event) => onPlayerChange(event.target.value)}
            value={selectedPlayer.id}
          >
            {players.length ? players.map((player) => (
              <option key={player.id} value={player.id}>
                {player.name || player.username || player.email || "Player"}
              </option>
            )) : <option value="">Player profile loading</option>}
          </select>
          <input
            className="rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-200/50"
            min={1}
            onChange={(event) => setBuyAmount(Number(event.target.value))}
            type="number"
            value={buyAmount}
          />
          <button className="inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-300/25 bg-cyan-300/15 px-5 py-3 text-sm font-semibold text-cyan-50 transition hover:border-cyan-100/60 hover:shadow-[0_0_28px_rgba(34,211,238,0.22)] disabled:cursor-not-allowed disabled:opacity-50" disabled={!canTransact} type="submit">
            <Coins className="h-4 w-4" />
            Buy SPICA
          </button>
        </form>
      </article>

      {showWithdrawal ? (
        <article className="player-card-in player-card-hover rounded-2xl border border-white/10 bg-white/[0.055] p-4 shadow-nebula sm:p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-purple-300/25 bg-purple-300/10 p-3 text-purple-100">
              <WalletCards className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Payout request</p>
              <h3 className="text-xl font-semibold text-white">Request settlement</h3>
            </div>
          </div>
          <form className="mt-6 space-y-3" onSubmit={handleWithdrawal}>
            <input
              className="w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none transition focus:border-purple-200/50"
              min={1}
              onChange={(event) => setWithdrawAmount(Number(event.target.value))}
              type="number"
              value={withdrawAmount}
            />
            <button className="w-full rounded-2xl border border-purple-300/25 bg-purple-300/15 px-5 py-3 text-sm font-semibold text-purple-50 transition hover:border-purple-100/60 hover:shadow-[0_0_28px_rgba(168,85,247,0.22)] disabled:cursor-not-allowed disabled:opacity-50" disabled={!canTransact} type="submit">
              Request Payout
            </button>
          </form>
        </article>
      ) : (
        <article className="player-card-in player-card-hover rounded-2xl border border-white/10 bg-white/[0.055] p-4 shadow-nebula sm:p-5">
          <p className="text-sm text-slate-500">Top-up history</p>
          <h3 className="mt-2 text-xl font-semibold text-white">No top-ups yet</h3>
          <p className="mt-3 text-sm leading-6 text-slate-500">Mock SPICA purchases will appear here with receipts, source, and balance changes.</p>
        </article>
      )}
    </section>
  );
}
