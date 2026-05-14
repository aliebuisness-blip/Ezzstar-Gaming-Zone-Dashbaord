import { PrismaClient } from "@prisma/client";
import { assertLocalZoneRuntimeEnabled } from "./local-zone-runtime";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaConnected?: boolean;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export async function ensureDatabaseConnection() {
  assertLocalZoneRuntimeEnabled();

  if (globalForPrisma.prismaConnected) {
    return;
  }

  try {
    await prisma.$connect();
    globalForPrisma.prismaConnected = true;
    console.log("Connected to PostgreSQL successfully");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Could not connect to PostgreSQL. Check DATABASE_URL in .env. Prisma error: ${message}`);
  }
}
