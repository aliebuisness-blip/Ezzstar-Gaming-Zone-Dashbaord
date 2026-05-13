import { UserRole } from "@prisma/client";
import { ensureDatabaseConnection, prisma } from "../lib/prisma";
import { ensureAchievementCatalog } from "../lib/achievements";
import { hashPassword } from "../lib/server-auth";

async function main() {
  await ensureDatabaseConnection();
  const password = await hashPassword(process.env.SEED_ADMIN_PASSWORD ?? "password123");
  const email = (process.env.SEED_ADMIN_EMAIL ?? "admin@spica.local").toLowerCase();

  await ensureAchievementCatalog();
  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      password,
      role: UserRole.admin,
      emailVerified: true,
      membership: "Admin"
    },
    create: {
      name: "Ezzstar Admin",
      username: "ezzstar-admin",
      email,
      password,
      role: UserRole.admin,
      spica_balance: 0,
      emailVerified: true,
      membership: "Admin"
    }
  });

  console.log("Seeded production baseline.");
  console.log(`Admin account: ${admin.email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

