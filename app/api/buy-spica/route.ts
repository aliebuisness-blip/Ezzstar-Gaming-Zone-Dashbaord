import { NextRequest } from "next/server";
import { TransactionType, UserRole } from "@prisma/client";
import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/api";
import { ensureDatabaseConnection, prisma } from "@/lib/prisma";
import { audit, requireApiUser } from "@/lib/server-auth";

const BuySchema = z.object({
  amount: z.number().int().positive().max(1_000_000)
});

export async function POST(request: NextRequest) {
  try {
    await ensureDatabaseConnection();
    const auth = await requireApiUser(request, [UserRole.player]);
    const input = BuySchema.parse(await request.json());

    const [user, transaction] = await prisma.$transaction([
      prisma.user.update({
        where: { id: auth.id },
        data: { spica_balance: { increment: input.amount } }
      }),
      prisma.transaction.create({
        data: {
          userId: auth.id,
          type: TransactionType.buy,
          amount: input.amount
        }
      })
    ]);

    await audit("buy_spica", auth.id, { amount: input.amount, transactionId: transaction.id });
    return jsonOk({ user, transaction });
  } catch (error) {
    return jsonError(error);
  }
}
