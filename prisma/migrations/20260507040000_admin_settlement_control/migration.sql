CREATE TYPE "SettlementStatus" AS ENUM ('pending', 'approved', 'paid');

ALTER TABLE "Settlement"
  ADD COLUMN IF NOT EXISTS "status" "SettlementStatus" NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS "payoutMethod" TEXT,
  ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMP(3);
