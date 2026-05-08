import { NextRequest } from "next/server";
import crypto from "node:crypto";
import { PCCategory, PCStatus, UserRole } from "@prisma/client";
import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/api";
import { ensureDatabaseConnection, prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/server-auth";

const RegisterPcSchema = z.object({
  name: z.string().min(2).max(32),
  zoneId: z.string().min(1).optional(),
  category: z.nativeEnum(PCCategory).default(PCCategory.standard),
  ratePerHour: z.number().int().positive().max(5000).default(100)
});

function slugPcId(name: string) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function resolveOwnerZone(userId: string, requestedZoneId?: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, staffZoneId: true } });
  const staffZoneId = user?.role === UserRole.manager ? user.staffZoneId : undefined;
  const zone = await prisma.zone.findFirst({
    where: staffZoneId ? { id: requestedZoneId ?? staffZoneId } : requestedZoneId ? { id: requestedZoneId } : { ownerId: userId },
    orderBy: { createdAt: "asc" }
  });

  if (!zone) {
    throw new Error("Zone not found for this owner");
  }

  return zone;
}

async function uniquePcId(baseId: string) {
  let pcId = baseId || `pc-${crypto.randomBytes(3).toString("hex")}`;
  let suffix = 2;

  while (await prisma.pC.findUnique({ where: { id: pcId } })) {
    pcId = `${baseId}-${suffix}`;
    suffix += 1;
  }

  return pcId;
}

export async function GET(request: NextRequest) {
  try {
    await ensureDatabaseConnection();
    const auth = await requireApiUser(request, [UserRole.zone_owner, UserRole.manager, UserRole.admin]);
    const { searchParams } = new URL(request.url);
    const zoneId = searchParams.get("zoneId") ?? undefined;

    const user = await prisma.user.findUnique({ where: { id: auth.id }, select: { staffZoneId: true } });
    const pcs = await prisma.pC.findMany({
      where:
        auth.role === UserRole.admin
          ? zoneId
            ? { zoneId }
            : {}
          : auth.role === UserRole.manager
            ? { zoneId: zoneId ?? user?.staffZoneId ?? "__none__" }
            : { zone: { ownerId: auth.id }, ...(zoneId ? { zoneId } : {}) },
      include: {
        client: { select: { id: true, pcId: true, lastSeen: true, installedVersion: true } },
        sessions: {
          where: { status: "active" },
          include: { player: { select: { id: true, name: true } } },
          orderBy: { startTime: "desc" },
          take: 1
        }
      },
      orderBy: { name: "asc" }
    });

    return jsonOk({ pcs });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureDatabaseConnection();
    const auth = await requireApiUser(request, [UserRole.zone_owner, UserRole.manager, UserRole.admin]);
    const input = RegisterPcSchema.parse(await request.json());
    const zone = await resolveOwnerZone(auth.id, input.zoneId);
    const pcId = await uniquePcId(slugPcId(input.name));
    const authToken = `pc-token-${zone.id}-${pcId}-${crypto.randomBytes(12).toString("hex")}`;

    const pc = await prisma.pC.create({
      data: {
        id: pcId,
        name: input.name.trim(),
        zoneId: zone.id,
        authToken,
        status: PCStatus.offline,
        category: input.category,
        ratePerHour: input.ratePerHour,
        client: {
          create: { authToken }
        }
      },
      include: { client: true, zone: true }
    });

    return jsonOk({
      pc,
      setupConfig: {
        VITE_SERVER_WS_URL: `ws://spica-host.local:4001`,
        VITE_PC_ID: pc.id,
        VITE_ZONE_ID: pc.zoneId,
        VITE_PC_AUTH_TOKEN: authToken
      },
      setupCommand: `setx VITE_SERVER_WS_URL "ws://spica-host.local:4001" && setx VITE_PC_ID "${pc.id}" && setx VITE_ZONE_ID "${pc.zoneId}" && setx VITE_PC_AUTH_TOKEN "${authToken}"`
    });
  } catch (error) {
    return jsonError(error);
  }
}
