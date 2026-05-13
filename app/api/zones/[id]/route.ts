import { NextRequest } from "next/server";
import { ListingRequestStatus, Prisma, UserRole, ZoneStatus } from "@prisma/client";
import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/api";
import { ensureDatabaseConnection, prisma } from "@/lib/prisma";
import { audit, requireApiUser } from "@/lib/server-auth";

const UpdateZoneSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  city: z.string().min(2).max(80).optional(),
  branding: z.record(z.unknown()).optional(),
  pricing: z.record(z.unknown()).optional(),
  status: z.nativeEnum(ZoneStatus).optional(),
  featured: z.boolean().optional()
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensureDatabaseConnection();
    const auth = await requireApiUser(request, [UserRole.zone_owner, UserRole.admin]);
    const { id } = await params;
    const zone = await prisma.zone.findUnique({ where: { id } });

    if (!zone) {
      return Response.json({ error: "Zone not found" }, { status: 404 });
    }

    if (auth.role !== UserRole.admin && zone.ownerId !== auth.id) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const input = UpdateZoneSchema.parse(await request.json());
    const adminOnly = auth.role === UserRole.admin ? { status: input.status, featured: input.featured } : {};
    const updated = await prisma.zone.update({
      where: { id },
      data: {
        name: input.name,
        city: input.city,
        branding: input.branding as Prisma.InputJsonObject | undefined,
        pricing: input.pricing as Prisma.InputJsonObject | undefined,
        ...adminOnly
      }
    });

    const pricing = zone.pricing as { listingRequestId?: string } | null;
    if (auth.role === UserRole.admin && input.status && pricing?.listingRequestId) {
      await prisma.zoneListingRequest.updateMany({
        where: { id: pricing.listingRequestId },
        data: {
          status:
            input.status === ZoneStatus.active
              ? ListingRequestStatus.approved
              : input.status === ZoneStatus.rejected
                ? ListingRequestStatus.rejected
                : ListingRequestStatus.contacted
        }
      });
    }

    await audit("update_zone", auth.id, { zoneId: id, status: updated.status, featured: updated.featured });
    return jsonOk({ zone: updated });
  } catch (error) {
    return jsonError(error);
  }
}
