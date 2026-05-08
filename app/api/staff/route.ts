import { UserRole } from "@prisma/client";
import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/api";
import { ensureDatabaseConnection, prisma } from "@/lib/prisma";
import { hashPassword, publicUser, requireApiUser } from "@/lib/server-auth";

const StaffSchema = z.object({
  name: z.string().min(2).max(80),
  username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_-]+$/),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  zoneId: z.string().min(1).optional()
});

async function resolveOwnerZone(ownerId: string, zoneId?: string) {
  const zone = await prisma.zone.findFirst({
    where: zoneId ? { id: zoneId, ownerId } : { ownerId },
    orderBy: { createdAt: "asc" }
  });

  if (!zone) {
    throw new Response(JSON.stringify({ error: "Zone not found for this owner" }), { status: 404 });
  }

  return zone;
}

export async function GET(request: NextRequest) {
  try {
    await ensureDatabaseConnection();
    const auth = await requireApiUser(request, [UserRole.zone_owner, UserRole.admin]);
    const url = new URL(request.url);
    const zoneId = url.searchParams.get("zoneId") ?? undefined;
    const zone = auth.role === UserRole.admin && zoneId ? await prisma.zone.findUnique({ where: { id: zoneId } }) : await resolveOwnerZone(auth.id, zoneId);

    if (!zone) {
      return Response.json({ error: "Zone not found" }, { status: 404 });
    }

    const staff = await prisma.user.findMany({
      where: { role: UserRole.manager, staffZoneId: zone.id },
      orderBy: { name: "asc" }
    });

    return jsonOk({ staff: staff.map(publicUser), zoneId: zone.id });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureDatabaseConnection();
    const auth = await requireApiUser(request, [UserRole.zone_owner, UserRole.admin]);
    const input = StaffSchema.parse(await request.json());
    const zone = auth.role === UserRole.admin && input.zoneId ? await prisma.zone.findUnique({ where: { id: input.zoneId } }) : await resolveOwnerZone(auth.id, input.zoneId);

    if (!zone) {
      return Response.json({ error: "Zone not found" }, { status: 404 });
    }

    const email = input.email.toLowerCase().trim();
    const username = input.username.toLowerCase().trim();
    const existing = await prisma.user.findFirst({ where: { OR: [{ email }, { username }] } });

    if (existing) {
      return Response.json({ error: "Email or username is already registered" }, { status: 409 });
    }

    const manager = await prisma.user.create({
      data: {
        name: input.name.trim(),
        username,
        email,
        password: await hashPassword(input.password),
        role: UserRole.manager,
        membership: "Zone Manager",
        emailVerified: true,
        staffZoneId: zone.id
      }
    });

    return jsonOk({ manager: publicUser(manager), zoneId: zone.id });
  } catch (error) {
    return jsonError(error);
  }
}
