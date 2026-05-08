import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/api";
import { ensureDatabaseConnection } from "@/lib/prisma";
import { sendPcCommand } from "@/lib/realtime-client";
import { requireApiUser } from "@/lib/server-auth";
import { endSession } from "@/lib/session-service";

const EndSessionSchema = z.object({
  sessionId: z.string().min(1)
});

export async function POST(request: NextRequest) {
  try {
    await ensureDatabaseConnection();
    await requireApiUser(request, [UserRole.player, UserRole.zone_owner, UserRole.manager, UserRole.admin]);
    const input = EndSessionSchema.parse(await request.json());
    const session = await endSession(input.sessionId);
    const commandPcId = session.pc.id;

    if (!commandPcId || commandPcId === session.pc.name) {
      throw new Error("Cannot route PC command: expected database PC id, received PC display name.");
    }

    console.log(`attempting end-session command dispatch to ${commandPcId}`);
    const commandSent = await sendPcCommand(commandPcId, "command:end-session", { sessionId: session.id, reason: "Session ended" });

    if (!commandSent) {
      console.warn(`end-session command dispatch failed for ${commandPcId}`);
    }

    return jsonOk({ session });
  } catch (error) {
    return jsonError(error);
  }
}
