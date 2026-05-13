import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import { jsonError, jsonOk } from "@/lib/api";
import { ensureDatabaseConnection, prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/server-auth";

export async function GET(request: NextRequest) {
  try {
    await ensureDatabaseConnection();
    await requireApiUser(request, [UserRole.zone_owner, UserRole.manager, UserRole.admin]);
    const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";

    if (query.length < 2) {
      return jsonOk({ players: [] });
    }

    const players = await prisma.user.findMany({
      where: {
        role: UserRole.player,
        OR: [
          { email: { contains: query, mode: "insensitive" } },
          { username: { contains: query, mode: "insensitive" } },
          { name: { contains: query, mode: "insensitive" } },
          { id: query }
        ]
      },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        avatar: true,
        banner: true,
        membership: true,
        spica_balance: true,
        favoriteZones: true,
        favoriteGames: true,
        xp: true,
        level: true,
        onlineStatus: true
      },
      orderBy: { createdAt: "desc" },
      take: 8
    });

    return jsonOk({ players });
  } catch (error) {
    return jsonError(error);
  }
}

