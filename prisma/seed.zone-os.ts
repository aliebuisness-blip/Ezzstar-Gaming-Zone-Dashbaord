import { PCStatus, UserRole, ZoneStatus } from "@prisma/client";
import { ensureDatabaseConnection, prisma } from "../lib/prisma";
import { ensureAchievementCatalog } from "../lib/achievements";
import { hashPassword } from "../lib/server-auth";

async function main() {
  await ensureDatabaseConnection();
  await ensureAchievementCatalog();

  const password = await hashPassword(process.env.ZONE_OS_DEFAULT_PASSWORD ?? "password123");

  const owner = await prisma.user.upsert({
    where: { email: "owner@spica.local" },
    update: {
      password,
      role: UserRole.zone_owner,
      emailVerified: true,
      membership: "Zone Operator"
    },
    create: {
      name: "Local Zone Owner",
      username: "local-zone-owner",
      email: "owner@spica.local",
      password,
      role: UserRole.zone_owner,
      spica_balance: 0,
      emailVerified: true,
      membership: "Zone Operator"
    }
  });

  await prisma.user.upsert({
    where: { email: "player@spica.local" },
    update: {
      password,
      role: UserRole.player,
      emailVerified: true,
      membership: "Local Player"
    },
    create: {
      name: "Local Player",
      username: "local-player",
      email: "player@spica.local",
      password,
      role: UserRole.player,
      spica_balance: 10000,
      emailVerified: true,
      membership: "Local Player"
    }
  });

  await prisma.user.upsert({
    where: { email: "admin@spica.local" },
    update: {
      password,
      role: UserRole.admin,
      emailVerified: true,
      membership: "Admin"
    },
    create: {
      name: "Local Admin",
      username: "local-admin",
      email: "admin@spica.local",
      password,
      role: UserRole.admin,
      spica_balance: 0,
      emailVerified: true,
      membership: "Admin"
    }
  });

  const existingZone = await prisma.zone.findFirst({ orderBy: { createdAt: "asc" } });
  const zone = existingZone ?? await prisma.zone.create({
    data: {
      id: "zone-a",
      name: "Local Gaming Arena",
      city: "Local Network",
      ownerId: owner.id,
      status: ZoneStatus.active,
      pricing: {
        standard: 100,
        premium: 150
      }
    }
  });

  const existingPc = await prisma.pC.findFirst({ where: { zoneId: zone.id }, orderBy: { name: "asc" } });

  if (!existingPc) {
    const pc = await prisma.pC.create({
      data: {
        id: "pc-01",
        name: "PC-01",
        zoneId: zone.id,
        authToken: "pc-token-zone-a-pc-01",
        status: PCStatus.offline,
        ratePerHour: 100
      }
    });

    await prisma.pCClient.create({
      data: {
        pcId: pc.id,
        authToken: "pc-token-zone-a-pc-01"
      }
    });
  }

  console.log("Zone OS local database baseline is ready.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
