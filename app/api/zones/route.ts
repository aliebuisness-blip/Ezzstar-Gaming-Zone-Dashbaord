import { NextRequest } from "next/server";
import { Prisma, UserRole, ZoneStatus } from "@prisma/client";
import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/api";
import { ensureDatabaseConnection, prisma } from "@/lib/prisma";
import { audit, requireApiUser } from "@/lib/server-auth";

const ZoneSchema = z.object({
  name: z.string().min(2).max(80),
  city: z.string().min(2).max(80),
  branding: z.record(z.unknown()).optional(),
  pricing: z.record(z.unknown()).optional()
});

export async function GET(request: NextRequest) {
  try {
    await ensureDatabaseConnection();
    const auth = await requireApiUser(request);
    const zones = await prisma.zone.findMany({
      where: auth.role === UserRole.zone_owner ? { ownerId: auth.id } : undefined,
      include: {
        owner: { select: { id: true, name: true, email: true } },
        pcs: true
      },
      orderBy: { name: "asc" }
    });

    return jsonOk({ zones });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureDatabaseConnection();
    const auth = await requireApiUser(request, [UserRole.zone_owner, UserRole.admin]);
    const input = ZoneSchema.parse(await request.json());
    const zone = await prisma.zone.create({
      data: {
        name: input.name.trim(),
        city: input.city.trim(),
        ownerId: auth.id,
        status: auth.role === UserRole.admin ? ZoneStatus.active : ZoneStatus.pending,
        branding: (input.branding ?? {}) as Prisma.InputJsonObject,
        pricing: (input.pricing ?? { standard: 100, premium: 150 }) as Prisma.InputJsonObject
      }
    });

    await audit("create_zone", auth.id, { zoneId: zone.id });
    return jsonOk({ zone });
  } catch (error) {
    return jsonError(error);
  }
}
