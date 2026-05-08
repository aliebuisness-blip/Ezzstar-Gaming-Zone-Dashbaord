import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import { jsonError, jsonOk } from "@/lib/api";
import { ensureDatabaseConnection } from "@/lib/prisma";
import { requireApiUser } from "@/lib/server-auth";
import { cleanupExpiredSessions } from "@/lib/session-service";

export async function POST(request: NextRequest) {
  try {
    await ensureDatabaseConnection();
    await requireApiUser(request, [UserRole.player, UserRole.zone_owner, UserRole.manager, UserRole.admin]);
    const count = await cleanupExpiredSessions();

    return jsonOk({ count });
  } catch (error) {
    return jsonError(error);
  }
}
