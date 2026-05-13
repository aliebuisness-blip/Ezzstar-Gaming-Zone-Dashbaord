import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import { jsonError, jsonOk } from "@/lib/api";
import { ensureDatabaseConnection, prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/server-auth";

export async function GET(request: NextRequest) {
  try {
    await ensureDatabaseConnection();
    await requireApiUser(request, [UserRole.admin, UserRole.zone_owner]);

    const requests = await prisma.pCPairingRequest.findMany({
      orderBy: { createdAt: "desc" },
      take: 100
    });

    return jsonOk({ requests });
  } catch (error) {
    return jsonError(error);
  }
}
