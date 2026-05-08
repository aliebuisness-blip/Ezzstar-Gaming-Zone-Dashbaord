import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import { jsonError, jsonOk } from "@/lib/api";
import { ensureDatabaseConnection, prisma } from "@/lib/prisma";
import { audit, requireApiUser } from "@/lib/server-auth";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensureDatabaseConnection();
    const auth = await requireApiUser(request, [UserRole.admin]);
    const { id } = await params;
    const withdrawal = await prisma.withdrawal.update({
      where: { id },
      data: { status: "approved" }
    });

    await audit("approve_withdrawal", auth.id, { withdrawalId: id });
    return jsonOk({ withdrawal });
  } catch (error) {
    return jsonError(error);
  }
}
