import { NextRequest } from "next/server";
import { Prisma, UserRole, ZoneStatus } from "@prisma/client";
import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/api";
import { ensureDatabaseConnection, prisma } from "@/lib/prisma";
import { audit, hashPassword, requireApiUser } from "@/lib/server-auth";

const ListingRequestSchema = z.object({
  ownerName: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  confirmPassword: z.string().min(8).max(128),
  phone: z.string().min(5).max(32),
  zoneName: z.string().min(2).max(100),
  city: z.string().min(2).max(80),
  pcCount: z.number().int().positive().max(2000),
  rentPerHour: z.number().int().positive().max(100000),
  currentPricingModel: z.string().min(2).max(200),
  message: z.string().max(1000).optional()
}).refine((input) => input.password === input.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"]
});

function buildUsername(email: string) {
  const base = email.split("@")[0]?.toLowerCase().replace(/[^a-z0-9_-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "zone-owner";
  return `${base}-${Math.floor(1000 + Math.random() * 9000)}`.slice(0, 32);
}

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
    const parsed = ListingRequestSchema.safeParse(await request.json());

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return Response.json({ error: firstIssue?.message ?? "Please check your application details." }, { status: 400 });
    }

    const input = parsed.data;
    const normalizedEmail = input.email.toLowerCase().trim();
    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (existingUser) {
      return Response.json({ error: "This business email is already registered. Please sign in instead." }, { status: 409 });
    }

    const passwordHash = await hashPassword(input.password);
    const { listingRequest, user, zone } = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: input.ownerName.trim(),
          username: buildUsername(normalizedEmail),
          email: normalizedEmail,
          password: passwordHash,
          role: UserRole.zone_owner,
          spica_balance: 0,
          membership: "Zone Operator",
          emailVerified: false
        }
      });

      const listingRequest = await tx.zoneListingRequest.create({
        data: {
          ownerName: input.ownerName.trim(),
          email: normalizedEmail,
          phone: input.phone.trim(),
          zoneName: input.zoneName.trim(),
          city: input.city.trim(),
          pcCount: input.pcCount,
          currentPricingModel: `${input.currentPricingModel.trim()} | ${input.rentPerHour} SPICA/hour`,
          message: input.message?.trim()
        }
      });

      const zone = await tx.zone.create({
        data: {
          name: input.zoneName.trim(),
          city: input.city.trim(),
          ownerId: user.id,
          status: ZoneStatus.pending,
          pricing: {
            pcCount: input.pcCount,
            rentPerHour: input.rentPerHour,
            currentPricingModel: input.currentPricingModel.trim(),
            listingRequestId: listingRequest.id,
            phone: input.phone.trim(),
            submittedMessage: input.message?.trim() ?? ""
          } as Prisma.InputJsonObject,
          branding: { source: "zone-listing-request" } as Prisma.InputJsonObject
        }
      });

      return { listingRequest, user, zone };
    });

    await audit("signup", user.id, { source: "zone_listing_request", zoneId: zone.id, listingRequestId: listingRequest.id });
    return jsonOk({ request: listingRequest, zone: { id: zone.id, status: zone.status }, user: { id: user.id, email: user.email, role: user.role } });
  } catch (error) {
    return jsonError(error);
  }
}
