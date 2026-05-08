import { PCStatus, UserRole, ZoneStatus } from "@prisma/client";
import { ensureDatabaseConnection, prisma } from "../lib/prisma";
import { achievementCatalog, ensureAchievementCatalog } from "../lib/achievements";
import { hashPassword } from "../lib/server-auth";

const testZone = { id: "zone-a", name: "Galaxy Gaming Arena", city: "Lahore" };
const testPc = { id: "pc-01", name: "PC-01", authToken: "pc-token-zone-a-pc-01" };

async function main() {
  await ensureDatabaseConnection();
  const password = await hashPassword("password123");

  await prisma.auditLog.deleteMany();
  await prisma.withdrawal.deleteMany();
  await prisma.settlement.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.session.deleteMany();
  await prisma.pCClient.deleteMany();
  await prisma.pC.deleteMany();
  await prisma.zone.deleteMany();
  await prisma.user.deleteMany();

  const [player, owner, admin] = await Promise.all([
    prisma.user.upsert({
      where: { email: "player@spica.local" },
      update: {
        password,
        role: UserRole.player,
        spica_balance: 10000,
        username: "ayan",
        avatar: "/avatars/player.svg",
        banner: "/banners/nebula.svg",
        bio: "Cross-zone SPICA player. FPS nights, racing weekends.",
        favoriteGames: ["Valorant", "Tekken 8", "Forza Horizon"],
        emailVerified: true,
        membership: "Founding Player",
        favoriteZones: ["zone-a"]
      },
      create: {
        name: "Ayan Malik",
        username: "ayan",
        email: "player@spica.local",
        avatar: "/avatars/player.svg",
        banner: "/banners/nebula.svg",
        bio: "Cross-zone SPICA player. FPS nights, racing weekends.",
        favoriteGames: ["Valorant", "Tekken 8", "Forza Horizon"],
        password,
        role: UserRole.player,
        spica_balance: 10000,
        emailVerified: true,
        membership: "Founding Player",
        favoriteZones: ["zone-a"]
      }
    }),
    prisma.user.upsert({
      where: { email: "owner@spica.local" },
      update: {
        password,
        role: UserRole.zone_owner,
        spica_balance: 0,
        username: "galaxy-owner",
        avatar: "/avatars/owner.svg",
        emailVerified: true,
        membership: "Zone Operator"
      },
      create: {
        name: "Galaxy Owner",
        username: "galaxy-owner",
        email: "owner@spica.local",
        avatar: "/avatars/owner.svg",
        password,
        role: UserRole.zone_owner,
        spica_balance: 0,
        emailVerified: true,
        membership: "Zone Operator"
      }
    }),
    prisma.user.upsert({
      where: { email: "admin@spica.local" },
      update: {
        password,
        role: UserRole.admin,
        spica_balance: 0,
        username: "ezzstar-admin",
        avatar: "/avatars/admin.svg",
        emailVerified: true,
        membership: "Admin"
      },
      create: {
        name: "Ezzstar Admin",
        username: "ezzstar-admin",
        email: "admin@spica.local",
        avatar: "/avatars/admin.svg",
        password,
        role: UserRole.admin,
        spica_balance: 0,
        emailVerified: true,
        membership: "Admin"
      }
    })
  ]);

  const zone = await prisma.zone.create({
    data: {
      id: testZone.id,
      name: testZone.name,
      city: testZone.city,
      ownerId: owner.id,
      status: ZoneStatus.active,
      featured: true,
      branding: {
        accent: "cyan",
        tagline: "Flagship SPICA connected gaming arena"
      },
      pricing: {
        standard: 100,
        premium: 150
      }
    }
  });

  const pc = await prisma.pC.create({
    data: {
      id: testPc.id,
      name: testPc.name,
      zoneId: zone.id,
      authToken: testPc.authToken,
      status: PCStatus.offline,
      ratePerHour: 100
    }
  });

  await prisma.pCClient.create({
    data: {
      pcId: pc.id,
      authToken: testPc.authToken
    }
  });

  await prisma.transaction.create({
    data: {
      userId: player.id,
      type: "buy",
      amount: 10000
    }
  });
  await ensureAchievementCatalog();
  await prisma.userAchievement.create({
    data: { userId: player.id, achievementId: achievementCatalog[0].id }
  });
  await prisma.playerNotification.createMany({
    data: [
      {
        userId: player.id,
        type: "system",
        title: "Welcome to Ezzstar",
        message: "Your global SPICA identity is active across connected zones."
      },
      {
        userId: player.id,
        type: "achievement",
        title: "Achievement unlocked",
        message: "First Session"
      }
    ]
  });
  await prisma.ecosystemActivity.createMany({
    data: [
      { userId: player.id, zoneId: zone.id, type: "player_joined", message: "Ayan joined Galaxy Gaming Arena." },
      { userId: player.id, type: "achievement", message: "Ayan unlocked First Session." },
      { zoneId: zone.id, type: "trending_zone", message: "Galaxy Gaming Arena is trending in Lahore." }
    ]
  });

  console.log("Seeded SPICA ARENA OS PC-first demo.");
  console.log("Zone: zone-a / Galaxy Gaming Arena");
  console.log("PC: pc-01 / PC-01 / pc-token-zone-a-pc-01");
  console.log("Login accounts: player@spica.local / owner@spica.local / admin@spica.local");
  console.log("Password for all: password123");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
