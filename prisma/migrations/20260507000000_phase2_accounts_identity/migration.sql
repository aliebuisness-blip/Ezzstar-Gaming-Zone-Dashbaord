-- Phase 2: accounts, multi-zone identity, and zone management foundations.

ALTER TYPE "UserRole" RENAME VALUE 'owner' TO 'zone_owner';

CREATE TYPE "ZoneStatus" AS ENUM ('pending', 'active', 'suspended');

ALTER TABLE "User"
  ADD COLUMN "username" TEXT,
  ADD COLUMN "avatar" TEXT,
  ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "verificationToken" TEXT,
  ADD COLUMN "resetToken" TEXT,
  ADD COLUMN "resetExpiresAt" TIMESTAMP(3),
  ADD COLUMN "membership" TEXT NOT NULL DEFAULT 'Starter',
  ADD COLUMN "favoriteZones" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "User"
SET
  "username" = CASE
    WHEN "email" = 'player@spica.local' THEN 'ayan'
    WHEN "email" = 'owner@spica.local' THEN 'galaxy-owner'
    WHEN "email" = 'admin@spica.local' THEN 'ezzstar-admin'
    ELSE lower(regexp_replace(split_part("email", '@', 1), '[^a-zA-Z0-9_-]+', '-', 'g'))
  END,
  "emailVerified" = true
WHERE "username" IS NULL;

ALTER TABLE "User" ALTER COLUMN "username" SET NOT NULL;
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

ALTER TABLE "Zone"
  ADD COLUMN "branding" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "pricing" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "status" "ZoneStatus" NOT NULL DEFAULT 'pending',
  ADD COLUMN "featured" BOOLEAN NOT NULL DEFAULT false;

UPDATE "Zone"
SET
  "status" = 'active',
  "pricing" = '{"standard":100,"premium":150}'::jsonb
WHERE "id" = 'zone-a';

ALTER TABLE "PC"
  ADD COLUMN "authToken" TEXT,
  ADD COLUMN "ratePerHour" INTEGER NOT NULL DEFAULT 100;

UPDATE "PC"
SET "authToken" = "PCClient"."authToken"
FROM "PCClient"
WHERE "PC"."id" = "PCClient"."pcId";
