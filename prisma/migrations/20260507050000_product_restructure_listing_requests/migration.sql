CREATE TYPE "ListingRequestStatus" AS ENUM ('pending', 'contacted', 'approved', 'rejected');

CREATE TABLE IF NOT EXISTS "ZoneListingRequest" (
  "id" TEXT NOT NULL,
  "ownerName" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "zoneName" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "pcCount" INTEGER NOT NULL,
  "currentPricingModel" TEXT NOT NULL,
  "message" TEXT,
  "status" "ListingRequestStatus" NOT NULL DEFAULT 'pending',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ZoneListingRequest_pkey" PRIMARY KEY ("id")
);
