import { NextRequest } from "next/server";
import { TransactionType, UserRole } from "@prisma/client";
import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/api";
import { ensureDatabaseConnection, prisma } from "@/lib/prisma";
import { audit, requireApiUser } from "@/lib/server-auth";

const WithdrawSchema = z.object({
  amount: z.number().int().positive().max(1_000_000)
});

export async function POST(request: NextRequest) {
  try {
    await ensureDatabaseConnection();
    const auth = await requireApiUser(request, [UserRole.player, UserRole.zone_owner]);
    const input = WithdrawSchema.parse(await request.json());
    const fee = Math.round(input.amount * 0.03);

    const [withdrawal, transaction] = await prisma.$transaction([
      prisma.withdrawal.create({
        data: {
          userId: auth.id,
          amount: input.amount,
          fee,
          status: "pending"
        }
      }),
      prisma.transaction.create({
        data: {
          userId: auth.id,
          type: TransactionType.withdraw,
          amount: input.amount
        }
      })
    ]);

    await audit("request_withdrawal", auth.id, { withdrawalId: withdrawal.id, transactionId: transaction.id });
    return jsonOk({ withdrawal });
  } catch (error) {
    return jsonError(error);
  }
}
