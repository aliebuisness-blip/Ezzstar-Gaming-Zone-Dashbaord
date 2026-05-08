import { NextRequest } from "next/server";
import { TransactionType } from "@prisma/client";
import { jsonError, jsonOk } from "@/lib/api";
import { ensureDatabaseConnection, prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/server-auth";
import { expireSessions } from "@/lib/session-service";

export async function GET(request: NextRequest) {
  try {
    await ensureDatabaseConnection();
    const auth = await requireApiUser(request);
    await expireSessions();

    const [user, users, zones, sessions, transactions, settlements, withdrawals] = await Promise.all([
      prisma.user.findUnique({ where: { id: auth.id }, select: { id: true, name: true, username: true, avatar: true, email: true, role: true, spica_balance: true, emailVerified: true, membership: true, favoriteZones: true } }),
      prisma.user.findMany({ select: { id: true, name: true, username: true, avatar: true, email: true, role: true, spica_balance: true, emailVerified: true, membership: true, favoriteZones: true, createdAt: true } }),
      prisma.zone.findMany({ include: { pcs: true, owner: { select: { id: true, name: true, email: true } }, sessions: true, settlements: true } }),
      prisma.session.findMany({ include: { player: true, zone: true, pc: true, settlement: true }, orderBy: { createdAt: "desc" }, take: 50 }),
      prisma.transaction.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
      prisma.settlement.findMany({ include: { zone: true, session: { include: { player: true, pc: true } } }, orderBy: { createdAt: "desc" }, take: 50 }),
      prisma.withdrawal.findMany({ include: { user: true }, orderBy: { createdAt: "desc" }, take: 50 })
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
