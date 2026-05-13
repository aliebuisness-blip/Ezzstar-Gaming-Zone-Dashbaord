import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import { jsonError, jsonOk } from "@/lib/api";
import { ensureDatabaseConnection, prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/server-auth";

async function ownerZoneFilter(userId: string, role: UserRole) {
  if (role === UserRole.admin) {
    return {};
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { staffZoneId: true } });

  if (role === UserRole.manager) {
    return { OR: [{ zoneId: user?.staffZoneId ?? "__none__" }, { zoneId: null }] };
  }

  const zones = await prisma.zone.findMany({ where: { ownerId: userId }, select: { id: true } });
  return { OR: [{ zoneId: { in: zones.map((zone) => zone.id) } }, { zoneId: null }] };
}

export async function GET(request: NextRequest) {
  try {
    await ensureDatabaseConnection();
    const auth = await requireApiUser(request, [UserRole.zone_owner, UserRole.manager, UserRole.admin]);
    const pairingRequests = await prisma.pCPairingRequest.findMany({
      where: await ownerZoneFilter(auth.id, auth.role),
      orderBy: { createdAt: "desc" },
      take: 50
    });

    console.log(`Loaded pairing requests count: ${pairingRequests.length}`);

    return jsonOk({ requests: pairingRequests, pairingRequests });
  } catch (error) {
    return jsonError(error);
  }
}
