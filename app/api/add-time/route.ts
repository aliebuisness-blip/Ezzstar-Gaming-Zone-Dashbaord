import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/api";
import { ensureDatabaseConnection } from "@/lib/prisma";
import { sendPcCommand } from "@/lib/realtime-client";
import { requireApiUser } from "@/lib/server-auth";
import { addTime } from "@/lib/session-service";

const AddTimeSchema = z.object({
  sessionId: z.string().min(1),
  extraMinutes: z.number().int().positive().max(24 * 60)
});

export async function POST(request: NextRequest) {
  try {
    await ensureDatabaseConnection();
    await requireApiUser(request, [UserRole.player, UserRole.zone_owner, UserRole.manager, UserRole.admin]);
    const input = AddTimeSchema.parse(await request.json());
    const session = await addTime(input.sessionId, input.extraMinutes);
    const commandPcId = session.pc.id;

    if (!commandPcId || commandPcId === session.pc.name) {
      throw new Error("Cannot route PC command: expected database PC id, received PC display name.");
    }

    console.log(`attempting add-time command dispatch to ${commandPcId}`);
    const commandSent = await sendPcCommand(commandPcId, "command:add-time", {
      sessionId: session.id,
      durationSeconds: session.durationSeconds,
      startTime: session.startTime.toISOString(),
      serverTime: new Date().toISOString()
    });

    if (!commandSent) {
      console.warn(`add-time command dispatch failed for ${commandPcId}`);
    }

    return jsonOk({ session });
  } catch (error) {
    return jsonError(error);
  }
}
