import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/api";
import { insertRow, patchRows, publicProfile, requireWebUser } from "@/lib/supabase/web";

const BuySchema = z.object({
  amount: z.number().int().positive().max(1_000_000)
});

export async function POST(request: Request) {
  try {
    const { profile } = await requireWebUser(["player"]);
    const input = BuySchema.parse(await request.json());
    const nextBalance = Number(profile.spica_balance ?? 0) + input.amount;
    const [user] = await patchRows("profiles", `id=eq.${encodeURIComponent(profile.id)}`, { spica_balance: nextBalance });
    const transaction = await insertRow("wallet_transactions", {
      user_id: profile.id,
      type: "buy",
      amount: input.amount,
      balance_after: nextBalance,
      description: "Mock SPICA top-up"
    }).catch(() => ({ id: `topup-${Date.now()}`, type: "buy", amount: input.amount }));

    return jsonOk({ user: publicProfile((user as typeof profile | undefined) ?? { ...profile, spica_balance: nextBalance }), transaction });
  } catch (error) {
    return jsonError(error);
  }
}
