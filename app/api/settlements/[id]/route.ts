import { NextRequest } from "next/server";
import { SettlementStatus, UserRole } from "@prisma/client";
import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/api";
import { ensureDatabaseConnection, prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/server-auth";

const SettlementActionSchema = z.object({
  status: z.nativeEnum(SettlementStatus),
  payoutMethod: z.enum(["PKR", "SPICA", "hybrid"]).optional()
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensureDatabaseConnection();
    await requireApiUser(request, [UserRole.admin]);
    const { id } = await params;
    const input = SettlementActionSchema.parse(await request.json());
    const settlement = await prisma.settlement.update({
      where: { id },
      data: {
        status: input.status,
        payoutMethod: input.payoutMethod,
        approvedAt: input.status === SettlementStatus.approved ? new Date() : undefined,
        paidAt: input.status === SettlementStatus.paid ? new Date() : undefined
      },
      include: { zone: true, session: { include: { player: true, pc: true } } }
    });

    return jsonOk({ settlement });
  } catch (error) {
    return jsonError(error);
  }
}
