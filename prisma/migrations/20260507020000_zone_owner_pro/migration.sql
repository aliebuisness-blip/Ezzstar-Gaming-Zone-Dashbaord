ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'manager';

CREATE TYPE "PCCategory" AS ENUM ('standard', 'premium', 'vip');

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "staffZoneId" TEXT;

ALTER TABLE "User"
  ADD CONSTRAINT "User_staffZoneId_fkey"
  FOREIGN KEY ("staffZoneId") REFERENCES "Zone"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PC"
  ADD COLUMN IF NOT EXISTS "category" "PCCategory" NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS "maintenanceMode" BOOLEAN NOT NULL DEFAULT false;

UPDATE "PC"
SET "category" = CASE
  WHEN "ratePerHour" >= 200 THEN 'vip'::"PCCategory"
  WHEN "ratePerHour" >= 150 THEN 'premium'::"PCCategory"
  ELSE 'standard'::"PCCategory"
END;
