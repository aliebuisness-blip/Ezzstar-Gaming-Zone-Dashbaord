import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api";
import { ensureDatabaseConnection, prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/server-auth";
import { expireSessions, getRemainingTime } from "@/lib/session-service";

export async function GET(request: NextRequest) {
  try {
    await ensureDatabaseConnection();
    const auth = await requireApiUser(request);
    await expireSessions();

    const sessions = await prisma.session.findMany({
      where:
        auth.role === "player"
          ? { playerId: auth.id }
          : auth.role === "zone_owner"
            ? { zone: { ownerId: auth.id } }
            : auth.role === "manager"
              ? { zone: { staff: { some: { id: auth.id } } } }
            : undefined,
      include: {
        player: { select: { id: true, name: true, email: true } },
        zone: true,
        pc: true,
        settlement: true
      },
      orderBy: { createdAt: "desc" }
    });

    return jsonOk({
      sessions: sessions.map((session) => ({
        ...session,
        remainingMs: session.status === "active" ? getRemainingTime(session.startTime, session.durationSeconds) : 0
      }))
    });
  } catch (error) {
    return jsonError(error);
  }
}
