import { Settlement, formatSpica } from "@/lib/spica";

type SettlementTableProps = {
  settlements: Settlement[];
};

export function SettlementTable({ settlements }: SettlementTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.055] shadow-nebula backdrop-blur-xl">
      <div className="border-b border-white/10 px-5 py-4">
        <h3 className="text-lg font-semibold text-white">Settlement Ledger</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-white/[0.04] text-xs uppercase tracking-[0.16em] text-slate-500">
            <tr>
              <th className="px-5 py-4">Transaction ID</th>
              <th className="px-5 py-4">Player</th>
              <th className="px-5 py-4">Zone</th>
              <th className="px-5 py-4">PC</th>
              <th className="px-5 py-4">Duration</th>
              <th className="px-5 py-4">Gross</th>
              <th className="px-5 py-4">Ezzstar Fee</th>
              <th className="px-5 py-4">Zone Net</th>
              <th className="px-5 py-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {settlements.length === 0 ? (
              <tr>
                <td className="px-5 py-7 text-center text-slate-500" colSpan={9}>
                  No completed sessions yet.
                </td>
              </tr>
            ) : (
              settlements.map((settlement) => (
                <tr className="text-slate-300 transition hover:bg-white/[0.035]" key={settlement.id}>
                  <td className="px-5 py-4 font-mono text-cyan-100">{settlement.transactionId}</td>
                  <td className="px-5 py-4">{settlement.player}</td>
                  <td className="px-5 py-4">{settlement.zone}</td>
                  <td className="px-5 py-4">{settlement.pc}</td>
                  <td className="px-5 py-4">{settlement.durationMinutes}m</td>
                  <td className="px-5 py-4">{formatSpica(settlement.grossSpica)}</td>
                  <td className="px-5 py-4 text-purple-100">{formatSpica(settlement.ezzstarFee)}</td>
                  <td className="px-5 py-4 text-emerald-100">{formatSpica(settlement.zoneNetAmount)}</td>
                  <td className="px-5 py-4">
                    <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                      {settlement.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
