import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import { jsonError, jsonOk } from "@/lib/api";
import { ensureDatabaseConnection, prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/server-auth";

export async function GET(request: NextRequest) {
  try {
    await ensureDatabaseConnection();
    await requireApiUser(request, [UserRole.admin, UserRole.zone_owner]);

    const { searchParams } = new URL(request.url);
    const pcId = searchParams.get("pcId");
    const zoneId = searchParams.get("zoneId");
    const authToken = searchParams.get("authToken");

    if (!pcId) {
      throw new Error("pcId is required");
    }

    const pc = await prisma.pC.findUnique({
      where: { id: pcId },
      include: { client: true, zone: { select: { id: true, name: true, ownerId: true } } }
    });

    const tokenMatches = Boolean(pc?.client && authToken && pc.client.authToken === authToken);
    const zoneMatches = Boolean(pc && zoneId && pc.zoneId === zoneId);
    const realtimeValidationWouldPass = Boolean(pc && pc.client && (!zoneId || pc.zoneId === zoneId) && (!authToken || pc.client.authToken === authToken));

    return jsonOk({
      pcId,
      supplied: {
        zoneId,
        authTokenPresent: Boolean(authToken)
      },
      pc: pc
        ? {
            id: pc.id,
            name: pc.name,
            zoneId: pc.zoneId,
            authToken: pc.authToken,
            trustedFingerprint: pc.trustedFingerprint,
            status: pc.status,
            zone: pc.zone
          }
        : null,
      pcClient: pc?.client
        ? {
            id: pc.client.id,
            pcId: pc.client.pcId,
            authToken: pc.client.authToken,
            trustedFingerprint: pc.client.trustedFingerprint,
            pairedAt: pc.client.pairedAt,
            lastSeen: pc.client.lastSeen,
            installedVersion: pc.client.installedVersion
          }
        : null,
      comparison: {
        pcFound: Boolean(pc),
        pcClientFound: Boolean(pc?.client),
        zoneMatches,
        tokenMatches,
        realtimeValidationWouldPass
      }
    });
  } catch (error) {
    return jsonError(error);
  }
}
