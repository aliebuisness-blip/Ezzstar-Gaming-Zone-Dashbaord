import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/api";
import { ensureDatabaseConnection, prisma } from "@/lib/prisma";
import { sendPcCommand } from "@/lib/realtime-client";
import { requireApiUser } from "@/lib/server-auth";
import { startSession } from "@/lib/session-service";

const StartSessionSchema = z.object({
  zoneId: z.string().min(1),
  pcId: z.string().min(1),
  playerId: z.string().min(1).optional(),
  durationMinutes: z.number().int().positive().max(24 * 60)
});

async function resolvePcId(zoneId: string, pcIdOrName: string) {
  const direct = await prisma.pC.findUnique({ where: { id: pcIdOrName }, select: { id: true } });

  if (direct) {
    return direct.id;
  }

  const byName = await prisma.pC.findUnique({
    where: { zoneId_name: { zoneId, name: pcIdOrName } },
    select: { id: true }
  });

  if (byName) {
    console.log(`Mapped PC display name ${pcIdOrName} to database id ${byName.id}`);
    return byName.id;
  }

  const connectedDevPc = await prisma.pC.findFirst({
    where: {
      zoneId,
      id: "pc-01",
      lastHeartbeat: { gte: new Date(Date.now() - 30_000) }
    },
    select: { id: true }
  });

  if (connectedDevPc) {
    console.log(`Mapped stale PC id ${pcIdOrName} to currently connected PC ${connectedDevPc.id}`);
    return connectedDevPc.id;
  }

  return pcIdOrName;
}

export async function POST(request: NextRequest) {
  try {
    console.log("START SESSION API HIT");
    const body = await request.json();
    console.log("BODY:", body);
    await ensureDatabaseConnection();
    const auth = await requireApiUser(request, [UserRole.player, UserRole.zone_owner, UserRole.manager, UserRole.admin]);
    const input = StartSessionSchema.parse(body);
    const resolvedPcId = await resolvePcId(input.zoneId, input.pcId);
    console.log(`selected pcId ${resolvedPcId}`);
    const playerId = auth.role === UserRole.player ? auth.id : input.playerId ?? auth.id;
    const session = await startSession(playerId, input.zoneId, resolvedPcId, input.durationMinutes);
    const commandPcId = session.pc.id;
    console.log(`session created id ${session.id}`);

    if (!commandPcId || commandPcId === session.pc.name) {
      throw new Error("Cannot route PC command: expected database PC id, received PC display name.");
    }

    console.log(`Attempting command dispatch to ${commandPcId}`);
    const commandSent = await sendPcCommand(commandPcId, "command:start-session", {
      sessionId: session.id,
      playerName: session.player.name,
      playerBalance: session.player.spica_balance,
      zoneName: session.zone.name,
      pcName: session.pc.name,
      startTime: session.startTime.toISOString(),
      durationSeconds: session.durationSeconds,
      remainingSeconds: Math.max(0, Math.ceil((session.startTime.getTime() + session.durationSeconds * 1000 - Date.now()) / 1000)),
      serverTime: new Date().toISOString()
    });

    if (!commandSent) {
      console.warn(`start-session command dispatch failed for ${commandPcId}`);
    }

    return jsonOk({ session });
  } catch (error) {
    return jsonError(error);
  }
}
