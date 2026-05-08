CREATE TYPE "PairingRequestStatus" AS ENUM ('pending', 'approved', 'rejected', 'expired');

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'pc_pairing_request';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'pc_pairing_approved';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'pc_pairing_rejected';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'pc_manual_override';

ALTER TABLE "PCClient"
  ADD COLUMN IF NOT EXISTS "trustedFingerprint" TEXT,
  ADD COLUMN IF NOT EXISTS "pairedAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "PCPairingRequest" (
  "id" TEXT NOT NULL,
  "zoneId" TEXT,
  "machineName" TEXT NOT NULL,
  "ipAddress" TEXT,
  "fingerprint" TEXT NOT NULL,
  "installedVersion" TEXT,
  "pairingCode" TEXT NOT NULL,
  "status" "PairingRequestStatus" NOT NULL DEFAULT 'pending',
  "requestedPcName" TEXT,
  "assignedPcName" TEXT,
  "assignedPcId" TEXT,
  "assignedToken" TEXT,
  "category" "PCCategory" NOT NULL DEFAULT 'standard',
  "ratePerHour" INTEGER NOT NULL DEFAULT 100,
  "rejectedReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PCPairingRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PCPairingRequest_pairingCode_key" ON "PCPairingRequest"("pairingCode");
CREATE INDEX IF NOT EXISTS "PCPairingRequest_status_createdAt_idx" ON "PCPairingRequest"("status", "createdAt");
