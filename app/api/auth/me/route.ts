import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/api";
import { ensureDatabaseConnection, prisma } from "@/lib/prisma";
import { publicUser, requireApiUser } from "@/lib/server-auth";

const ProfileSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_-]+$/).optional(),
  avatar: z.string().max(300).optional(),
  banner: z.string().max(300).optional(),
  bio: z.string().max(280).optional(),
  favoriteGames: z.array(z.string().min(1).max(40)).max(12).optional(),
  favoriteZones: z.array(z.string().min(1)).max(20).optional(),
  onlineStatus: z.string().max(32).optional()
});

export async function GET(request: NextRequest) {
  try {
    await ensureDatabaseConnection();
    const auth = await requireApiUser(request);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: auth.id } });
    const [sessions, totalSeconds, spend, achievements, notifications, friends, feed] = await Promise.all([
      prisma.session.findMany({
        where: { playerId: auth.id },
        include: { zone: true, pc: true, settlement: true },
        orderBy: { startTime: "desc" },
        take: 25
      }),
      prisma.session.aggregate({
        where: { playerId: auth.id, status: "completed" },
        _sum: { durationSeconds: true }
      }),
      prisma.transaction.aggregate({ where: { userId: auth.id, type: "spend" }, _sum: { amount: true } }),
      prisma.userAchievement.findMany({ where: { userId: auth.id }, include: { achievement: true }, orderBy: { unlockedAt: "desc" } }),
      prisma.playerNotification.findMany({ where: { userId: auth.id }, orderBy: { createdAt: "desc" }, take: 20 }),
      prisma.friendship.findMany({
        where: { OR: [{ requesterId: auth.id }, { addresseeId: auth.id }] },
        include: { requester: true, addressee: true },
        orderBy: { createdAt: "desc" }
      }),
      prisma.ecosystemActivity.findMany({ include: { user: true, zone: true }, orderBy: { createdAt: "desc" }, take: 30 })
    ]);

    return jsonOk({
      user: publicUser(user),
      profile: {
        totalHoursPlayed: Number(((totalSeconds._sum.durationSeconds ?? 0) / 3600).toFixed(2)),
        totalSpicaSpent: spend._sum.amount ?? 0,
        sessionHistory: sessions,
        favoriteZones: user.favoriteZones,
        achievements,
        notifications,
        friends,
        feed
      }
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await ensureDatabaseConnection();
    const auth = await requireApiUser(request);
    const input = ProfileSchema.parse(await request.json());
    const user = await prisma.user.update({
      where: { id: auth.id },
      data: {
        name: input.name,
        username: input.username?.toLowerCase(),
        avatar: input.avatar,
        banner: input.banner,
        bio: input.bio,
        favoriteGames: input.favoriteGames,
        favoriteZones: input.favoriteZones,
        onlineStatus: input.onlineStatus,
        lastSeenAt: new Date()
      }
    });

    return jsonOk({ user: publicUser(user) });
  } catch (error) {
    return jsonError(error);
  }
}
