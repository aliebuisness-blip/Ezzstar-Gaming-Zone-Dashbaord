import { NextRequest } from "next/server";
import { TransactionType, UserRole, ZoneStatus } from "@prisma/client";
import { jsonError, jsonOk } from "@/lib/api";
import { ensureDatabaseConnection, prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/server-auth";
import { expireSessions } from "@/lib/session-service";

export async function GET(request: NextRequest) {
  try {
    await ensureDatabaseConnection();
    const auth = await requireApiUser(request);
    await expireSessions();

    const userSelect = { id: true, name: true, username: true, avatar: true, banner: true, bio: true, email: true, role: true, spica_balance: true, xp: true, level: true, onlineStatus: true, emailVerified: true, membership: true, favoriteGames: true, favoriteZones: true, createdAt: true };
    const user = await prisma.user.findUnique({ where: { id: auth.id }, select: userSelect });

    if (!user) {
      return Response.json({ error: "Profile not found" }, { status: 404 });
    }

    const ownerZoneIds =
      auth.role === UserRole.zone_owner || auth.role === UserRole.manager
        ? (
            await prisma.zone.findMany({
              where: auth.role === UserRole.manager ? { staff: { some: { id: auth.id } } } : { ownerId: auth.id },
              select: { id: true }
            })
          ).map((zone) => zone.id)
        : [];
    const scope =
      auth.role === UserRole.admin
        ? {}
        : auth.role === UserRole.player
          ? { playerId: auth.id }
          : { zoneId: { in: ownerZoneIds } };
    const zoneScope =
      auth.role === UserRole.admin
        ? {}
        : auth.role === UserRole.player
          ? { status: ZoneStatus.active }
          : { id: { in: ownerZoneIds } };
    const transactionScope = auth.role === UserRole.admin ? {} : auth.role === UserRole.player ? { userId: auth.id } : { id: "__zone-owner-no-global-transactions__" };
    const withdrawalScope = auth.role === UserRole.admin ? {} : { userId: auth.id };

    const [users, zones, sessions, transactions, settlements, withdrawals] = await Promise.all([
      auth.role === UserRole.admin
        ? prisma.user.findMany({ select: userSelect, orderBy: { createdAt: "desc" } })
        : auth.role === UserRole.player
          ? prisma.user.findMany({ where: { id: auth.id }, select: userSelect })
          : prisma.user.findMany({
              where: { OR: [{ id: auth.id }, { sessions: { some: { zoneId: { in: ownerZoneIds } } } }] },
              select: userSelect,
              orderBy: { createdAt: "desc" }
            }),
      prisma.zone.findMany({ where: zoneScope, include: { pcs: true, owner: { select: { id: true, name: true, email: true } }, _count: { select: { sessions: true, settlements: true } } } }),
      prisma.session.findMany({ where: scope, include: { player: true, zone: true, pc: true, settlement: true }, orderBy: { createdAt: "desc" }, take: 50 }),
      prisma.transaction.findMany({ where: transactionScope, orderBy: { createdAt: "desc" }, take: 50 }),
      prisma.settlement.findMany({
        where: auth.role === UserRole.admin ? {} : auth.role === UserRole.player ? { session: { playerId: auth.id } } : { zoneId: { in: ownerZoneIds } },
        include: { zone: true, session: { include: { player: true, pc: true } } },
        orderBy: { createdAt: "desc" },
        take: 50
      }),
      prisma.withdrawal.findMany({ where: withdrawalScope, include: { user: true }, orderBy: { createdAt: "desc" }, take: 50 })
    ]);

    const creditsSold = transactions.filter((item) => item.type === TransactionType.buy).reduce((sum, item) => sum + item.amount, 0);
    const totalSpent = transactions.filter((item) => item.type === TransactionType.spend).reduce((sum, item) => sum + item.amount, 0);
    const commission = settlements.reduce((sum, item) => sum + item.commission, 0);
    const onlinePcs = zones.flatMap((zone) => zone.pcs).filter((pc) => pc.status !== "offline").length;
    const zoneNet = settlements.reduce((sum, item) => sum + item.net, 0);
    const safety = {
      offlineActiveSessions: sessions.filter((session) => session.status === "active" && session.pc.status === "offline"),
      longSessions: sessions.filter((session) => session.status === "active" && session.durationSeconds >= 6 * 3600),
      staleHeartbeatPcs: zones.flatMap((zone) => zone.pcs).filter((pc) => pc.status !== "offline" && (!pc.lastHeartbeat || pc.lastHeartbeat.getTime() < Date.now() - 30_000)),
      maintenanceActiveSessions: sessions.filter((session) => session.status === "active" && session.pc.maintenanceMode)
    };

    return jsonOk({
      serverTime: new Date().toISOString(),
      user,
      users,
      zones,
      sessions,
      transactions,
      settlements,
      withdrawals,
      analytics: {
        creditsSold,
        totalSpent,
        commission,
        zoneNet,
        onlinePcs,
        activeSessions: sessions.filter((item) => item.status === "active").length,
        activeZones: zones.filter((item) => item.status === "active").length,
        pendingZones: zones.filter((item) => item.status === "pending").length,
        safety,
        graphReady: {
          dailySpicaVolume: totalSpent,
          dailyCommission: commission,
          sessionVolume: sessions.length
        }
      }
    });
  } catch (error) {
    return jsonError(error);
  }
}
