import { NotificationType, Prisma, TransactionType, UserAchievement } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const achievementCatalog = [
  { id: "first-session", name: "First Session", description: "Started your first SPICA gaming session.", icon: "Sparkles", xpReward: 150 },
  { id: "ten-hours", name: "10 Hours Played", description: "Played 10 total hours across Ezzstar zones.", icon: "Timer", xpReward: 500 },
  { id: "night-grinder", name: "Night Grinder", description: "Played a session between midnight and 5 AM.", icon: "Moon", xpReward: 250 },
  { id: "vip-player", name: "VIP Player", description: "Played on a VIP or high-rate PC.", icon: "Crown", xpReward: 300 },
  { id: "top-spender", name: "Top Spender", description: "Spent 5,000 SPICA across the network.", icon: "Coins", xpReward: 500 },
  { id: "tournament-winner", name: "Tournament Winner", description: "Reserved for future tournament victories.", icon: "Trophy", xpReward: 1000 },
  { id: "zone-explorer", name: "Zone Explorer", description: "Played in more than one Ezzstar zone.", icon: "Map", xpReward: 400 }
] as const;

export function levelFromXp(xp: number) {
  return Math.max(1, Math.floor(Math.sqrt(xp / 250)) + 1);
}

export async function ensureAchievementCatalog(tx: Prisma.TransactionClient = prisma) {
  for (const achievement of achievementCatalog) {
    await tx.achievement.upsert({
      where: { id: achievement.id },
      update: achievement,
      create: achievement
    });
  }
}

async function unlockAchievement(userId: string, achievementId: string, tx: Prisma.TransactionClient = prisma) {
  const achievement = achievementCatalog.find((item) => item.id === achievementId);

  if (!achievement) {
    return null;
  }

  const existing = await tx.userAchievement.findUnique({ where: { userId_achievementId: { userId, achievementId } } });

  if (existing) {
    return null;
  }

  const unlocked = await tx.userAchievement.create({
    data: { userId, achievementId },
    include: { achievement: true }
  });
  const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { xp: true } });
  const xp = user.xp + achievement.xpReward;
  await tx.user.update({ where: { id: userId }, data: { xp, level: levelFromXp(xp) } });
  await tx.playerNotification.create({
    data: {
      userId,
      type: NotificationType.achievement,
      title: "Achievement unlocked",
      message: achievement.name,
      metadata: { achievementId }
    }
  });
  await tx.ecosystemActivity.create({
    data: {
      userId,
      type: "achievement",
      message: `Unlocked ${achievement.name}.`,
      metadata: { achievementId }
    }
  });
  return unlocked;
}

export async function evaluatePlayerAchievements(userId: string, tx: Prisma.TransactionClient = prisma) {
  await ensureAchievementCatalog(tx);
  const [sessions, spend] = await Promise.all([
    tx.session.findMany({ where: { playerId: userId }, include: { zone: true, pc: true } }),
    tx.transaction.aggregate({ where: { userId, type: TransactionType.spend }, _sum: { amount: true } })
  ]);
  const completedSeconds = sessions.reduce((sum, session) => sum + session.durationSeconds, 0);
  const zoneCount = new Set(sessions.map((session) => session.zoneId)).size;
  const unlocked: Array<UserAchievement | null> = [];

  if (sessions.length >= 1) unlocked.push(await unlockAchievement(userId, "first-session", tx));
  if (completedSeconds >= 10 * 3600) unlocked.push(await unlockAchievement(userId, "ten-hours", tx));
  if (sessions.some((session) => session.startTime.getHours() >= 0 && session.startTime.getHours() < 5)) unlocked.push(await unlockAchievement(userId, "night-grinder", tx));
  if (sessions.some((session) => session.pc.ratePerHour >= 200)) unlocked.push(await unlockAchievement(userId, "vip-player", tx));
  if ((spend._sum.amount ?? 0) >= 5000) unlocked.push(await unlockAchievement(userId, "top-spender", tx));
  if (zoneCount > 1) unlocked.push(await unlockAchievement(userId, "zone-explorer", tx));

  return unlocked.filter(Boolean);
}
