import { jsonError, jsonOk } from "@/lib/api";
import { ensureDatabaseConnection, prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await ensureDatabaseConnection();
    const [feed, topPlayers, trendingZones] = await Promise.all([
      prisma.ecosystemActivity.findMany({ include: { user: true, zone: true }, orderBy: { createdAt: "desc" }, take: 40 }),
      prisma.user.findMany({ where: { role: "player" }, orderBy: [{ xp: "desc" }, { spica_balance: "desc" }], take: 10 }),
      prisma.zone.findMany({ where: { status: "active" }, include: { sessions: true, pcs: true }, take: 10 })
    ]);

    return jsonOk({ feed, topPlayers, trendingZones });
  } catch (error) {
    return jsonError(error);
  }
}
