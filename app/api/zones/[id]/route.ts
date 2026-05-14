import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/api";
import { patchRows, requireWebUser } from "@/lib/supabase/web";

const UpdateZoneSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  city: z.string().min(2).max(80).optional(),
  branding: z.record(z.unknown()).optional(),
  pricing: z.record(z.unknown()).optional(),
  status: z.enum(["pending", "active", "suspended", "rejected"]).optional(),
  featured: z.boolean().optional()
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { profile } = await requireWebUser(["admin", "zone_owner", "manager"]);
    const { id } = await params;
    const input = UpdateZoneSchema.parse(await request.json());
    const patch: Record<string, unknown> = {
      name: input.name,
      city: input.city,
      branding: input.branding,
      featured: input.featured
    };

    if (input.pricing) {
      patch.rent_per_hour = input.pricing.rentPerHour;
      patch.pricing_model = input.pricing.currentPricingModel;
    }

    if (profile.role === "admin") {
      patch.status = input.status;
    }

    const [zone] = await patchRows("zones", `id=eq.${encodeURIComponent(id)}`, patch);

    if (!zone) {
      return Response.json({ error: "Zone not found" }, { status: 404 });
    }

    if (profile.role === "admin" && input.status && (zone as any).listing_request_id) {
      await patchRows(
        "zone_listing_requests",
        `id=eq.${encodeURIComponent((zone as any).listing_request_id)}`,
        { status: input.status === "active" ? "approved" : input.status === "rejected" ? "rejected" : "contacted" }
      ).catch(() => null);
    }

    return jsonOk({ zone });
  } catch (error) {
    return jsonError(error);
  }
}
