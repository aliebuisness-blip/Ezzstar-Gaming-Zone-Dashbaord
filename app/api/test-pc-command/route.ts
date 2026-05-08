import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import { jsonError, jsonOk } from "@/lib/api";
import { ensureDatabaseConnection } from "@/lib/prisma";
import { sendPcCommand } from "@/lib/realtime-client";
import { requireApiUser } from "@/lib/server-auth";

export async function POST(request: NextRequest) {
  try {
    await ensureDatabaseConnection();
    await requireApiUser(request, [UserRole.zone_owner, UserRole.manager, UserRole.admin]);
    const body = await request.json().catch(() => ({}));
    const pcId = typeof body.pcId === "string" ? body.pcId : "pc-01";
    const message = typeof body.message === "string" ? body.message : "Dashboard command test";
    console.log(`Attempting test command dispatch to ${pcId}`);
    const sent = await sendPcCommand(pcId, "command:show-message", { message });

    if (!sent) {
      throw new Error(`Test command failed: ${pcId} not connected`);
    }

    return jsonOk({ ok: true, pcId, message });
  } catch (error) {
    return jsonError(error);
  }
}
