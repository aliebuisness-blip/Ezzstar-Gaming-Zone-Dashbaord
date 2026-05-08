import { Withdrawal, formatSpica } from "@/lib/spica";

type WithdrawalTableProps = {
  withdrawals: Withdrawal[];
};

export function WithdrawalTable({ withdrawals }: WithdrawalTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.055] shadow-nebula backdrop-blur-xl">
      <div className="border-b border-white/10 px-5 py-4">
        <h3 className="text-lg font-semibold text-white">Withdrawal Requests</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-white/[0.04] text-xs uppercase tracking-[0.16em] text-slate-500">
            <tr>
              <th className="px-5 py-4">Request</th>
              <th className="px-5 py-4">User</th>
              <th className="px-5 py-4">Type</th>
              <th className="px-5 py-4">Amount</th>
              <th className="px-5 py-4">Fee</th>
              <th className="px-5 py-4">Net</th>
              <th className="px-5 py-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {withdrawals.map((withdrawal) => (
              <tr className="text-slate-300 transition hover:bg-white/[0.035]" key={withdrawal.id}>
                <td className="px-5 py-4 font-mono text-cyan-100">{withdrawal.id}</td>
                <td className="px-5 py-4">{withdrawal.userName}</td>
                <td className="px-5 py-4">{withdrawal.type}</td>
                <td className="px-5 py-4">{formatSpica(withdrawal.amount)}</td>
                <td className="px-5 py-4 text-purple-100">{formatSpica(withdrawal.fee)}</td>
                <td className="px-5 py-4 text-emerald-100">{formatSpica(withdrawal.netAmount)}</td>
                <td className="px-5 py-4">
                  <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs font-semibold text-amber-200">
                    {withdrawal.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
