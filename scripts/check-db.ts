import { ensureDatabaseConnection, prisma } from "../lib/prisma";

async function main() {
  await ensureDatabaseConnection();
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
