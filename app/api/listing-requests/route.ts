import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/api";
import { ensureDatabaseConnection, prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/server-auth";

const ListingRequestSchema = z.object({
  ownerName: z.string().min(2).max(80),
  email: z.string().email(),
  phone: z.string().min(5).max(32),
  zoneName: z.string().min(2).max(100),
  city: z.string().min(2).max(80),
  pcCount: z.number().int().positive().max(2000),
  currentPricingModel: z.string().min(2).max(200),
  message: z.string().max(1000).optional()
});

export async function GET(request: NextRequest) {
  try {
    await ensureDatabaseConnection();
    await requireApiUser(request, [UserRole.admin]);
    const requests = await prisma.zoneListingRequest.findMany({ orderBy: { createdAt: "desc" } });
    return jsonOk({ requests });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureDatabaseConnection();
    const input = ListingRequestSchema.parse(await request.json());
    const listingRequest = await prisma.zoneListingRequest.create({
      data: {
        ...input,
        email: input.email.toLowerCase().trim()
      }
    });
    return jsonOk({ request: listingRequest });
  } catch (error) {
    return jsonError(error);
  }
}
