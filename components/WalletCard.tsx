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
};

export function WalletCard({ players, selectedPlayerId, onPlayerChange, onBuySpica, onRequestWithdrawal }: WalletCardProps) {
  const [buyAmount, setBuyAmount] = useState(1000);
  const [withdrawAmount, setWithdrawAmount] = useState(250);
  const selectedPlayer = players.find((player) => player.id === selectedPlayerId) ?? players[0];

  function handleBuy(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onBuySpica(selectedPlayer.id, Math.max(1, buyAmount));
  }

  function handleWithdrawal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onRequestWithdrawal(selectedPlayer.id, Math.max(1, withdrawAmount), "Player");
  }

  return (
    <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
      <article className="rounded-2xl border border-white/10 bg-white/[0.055] p-5 shadow-nebula backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl border border-cyan-300/25 bg-cyan-300/10 p-3 text-cyan-100">
            <WalletCards className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm text-slate-500">Global Ezzstar Player Wallet</p>
            <h3 className="text-xl font-semibold text-white">{selectedPlayer.name}</h3>
            <p className="mt-1 text-xs text-cyan-100">@{selectedPlayer.username ?? "player"} - {selectedPlayer.membership ?? "Starter"}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 rounded-2xl border border-white/10 bg-black/30 p-5 md:grid-cols-[1fr_auto] md:items-end">
          <div>
          <p className="text-sm text-slate-500">Available balance</p>
          <p className="mt-2 text-4xl font-bold tracking-tight text-cyan-100 drop-shadow-[0_0_18px_rgba(34,211,238,0.45)]">
            {formatSpica(selectedPlayer.balance)}
          </p>
          </div>
          <div className="text-sm text-slate-400">
            <p>{selectedPlayer.email ?? "Global account"}</p>
            <p className="mt-1">Favorites: {selectedPlayer.favoriteZones?.join(", ") || "None yet"}</p>
          </div>
        </div>

        <form className="mt-5 grid gap-3 md:grid-cols-[1fr_1fr_auto]" onSubmit={handleBuy}>
          <select
            className="rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-200/50"
            onChange={(event) => onPlayerChange(event.target.value)}
            value={selectedPlayerId}
          >
            {players.map((player) => (
              <option key={player.id} value={player.id}>
                {player.name}
              </option>
            ))}
          </select>
          <input
            className="rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-200/50"
            min={1}
            onChange={(event) => setBuyAmount(Number(event.target.value))}
            type="number"
            value={buyAmount}
          />
          <button className="inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-300/25 bg-cyan-300/15 px-5 py-3 text-sm font-semibold text-cyan-50 transition hover:border-cyan-100/60 hover:shadow-[0_0_28px_rgba(34,211,238,0.22)]" type="submit">
            <Coins className="h-4 w-4" />
            Buy SPICA
          </button>
        </form>
      </article>

      <article className="rounded-2xl border border-white/10 bg-white/[0.055] p-5 shadow-nebula backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl border border-purple-300/25 bg-purple-300/10 p-3 text-purple-100">
            <WalletCards className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm text-slate-500">Player wallet request</p>
            <h3 className="text-xl font-semibold text-white">Mock withdrawal</h3>
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
          <button className="w-full rounded-2xl border border-purple-300/25 bg-purple-300/15 px-5 py-3 text-sm font-semibold text-purple-50 transition hover:border-purple-100/60 hover:shadow-[0_0_28px_rgba(168,85,247,0.22)]" type="submit">
            Request Withdrawal
          </button>
        </form>
      </article>
    </section>
  );
}
