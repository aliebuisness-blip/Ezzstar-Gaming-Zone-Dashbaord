import { NextRequest } from "next/server";
import crypto from "node:crypto";
import { PCCategory, UserRole } from "@prisma/client";
import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/api";
import { ensureDatabaseConnection, prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/server-auth";

const UpdatePcSchema = z.object({
  name: z.string().min(2).max(32).optional(),
  ratePerHour: z.number().int().positive().max(5000).optional(),
  category: z.nativeEnum(PCCategory).optional(),
  maintenanceMode: z.boolean().optional(),
  regenerateAuthToken: z.boolean().optional()
});

async function assertPcAccess(pcId: string, userId: string, role: UserRole) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { staffZoneId: true } });
  const pc = await prisma.pC.findUnique({
    where: { id: pcId },
    include: { zone: true, sessions: { where: { status: "active" }, take: 1 } }
  });

  if (!pc) {
    throw new Error("PC not found");
  }

  if (role !== UserRole.admin && pc.zone.ownerId !== userId && pc.zoneId !== user?.staffZoneId) {
    throw new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
  }

  return pc;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensureDatabaseConnection();
    const auth = await requireApiUser(request, [UserRole.zone_owner, UserRole.manager, UserRole.admin]);
    const { id } = await params;
    await assertPcAccess(id, auth.id, auth.role);
    const input = UpdatePcSchema.parse(await request.json());

    const token = input.regenerateAuthToken ? `pc-token-${id}-${crypto.randomBytes(16).toString("hex")}` : undefined;
    const pc = await prisma.pC.update({
      where: { id },
      data: {
        name: input.name,
        ratePerHour: input.ratePerHour,
        category: input.category,
        maintenanceMode: input.maintenanceMode,
        ...(token ? { authToken: token, client: { upsert: { create: { authToken: token }, update: { authToken: token } } } } : {})
      },
      include: { client: true }
    });

    return jsonOk({
      pc,
      authToken: token,
      setupConfig: token
        ? {
            VITE_SERVER_WS_URL: `ws://spica-host.local:4001`,
            VITE_PC_ID: pc.id,
            VITE_ZONE_ID: pc.zoneId,
            VITE_PC_AUTH_TOKEN: token
          }
        : undefined
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensureDatabaseConnection();
    const auth = await requireApiUser(request, [UserRole.zone_owner, UserRole.admin]);
    const { id } = await params;
    const pc = await assertPcAccess(id, auth.id, auth.role);

    if (pc.sessions.length > 0) {
      throw new Error("Cannot delete a PC with an active session");
    }

    await prisma.pCClient.deleteMany({ where: { pcId: id } });
    await prisma.pC.delete({ where: { id } });

    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
