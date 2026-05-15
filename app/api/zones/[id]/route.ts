import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/api";
import { patchRows, requireWebUser } from "@/lib/supabase/web";

const UpdateZoneSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  city: z.string().min(2).max(80).optional(),
  branding: z.record(z.unknown()).optional(),
  pricing: z.record(z.unknown()).optional(),
  status: z.enum(["pending", "active", "suspended", "rejected"]).optional(),
  action: z.enum(["approve", "reject", "suspend", "reactivate"]).optional(),
  featured: z.boolean().optional()
});

function statusFromAction(action?: string) {
  if (action === "approve" || action === "reactivate") return "active";
  if (action === "reject") return "rejected";
  if (action === "suspend") return "suspended";
  return undefined;
}

function listingStatusFromZoneStatus(status: string) {
  if (status === "active") return "approved";
  if (status === "rejected") return "rejected";
  if (status === "pending") return "pending";
  return "contacted";
}

async function updateZone(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { profile } = await requireWebUser(["admin", "zone_owner", "manager"]);
    const { id } = await params;
    const input = UpdateZoneSchema.parse(await request.json());
    const requestedStatus = input.status ?? statusFromAction(input.action);
    const now = new Date().toISOString();
    const patch: Record<string, unknown> = { updated_at: now };

    if (input.name !== undefined) patch.name = input.name;
    if (input.city !== undefined) patch.city = input.city;
    if (input.branding !== undefined) patch.branding = input.branding;
    if (input.featured !== undefined) patch.featured = input.featured;

    if (input.pricing) {
      patch.rent_per_hour = input.pricing.rentPerHour;
      patch.pricing_model = input.pricing.currentPricingModel;
    }

    if (requestedStatus) {
      if (profile.role !== "admin") {
        return Response.json({ ok: false, error: "Only Ezzstar admins can change zone approval status." }, { status: 403 });
      }

      patch.status = requestedStatus;
    }

    const [zone] = await patchRows("zones", `id=eq.${encodeURIComponent(id)}`, patch);

    if (!zone) {
      return Response.json({ ok: false, error: "Zone not found." }, { status: 404 });
    }

    if (profile.role === "admin" && requestedStatus && (zone as any).listing_request_id) {
      await patchRows(
        "zone_listing_requests",
        `id=eq.${encodeURIComponent((zone as any).listing_request_id)}`,
        {
          status: listingStatusFromZoneStatus(requestedStatus),
          updated_at: now
        }
      ).catch(() => null);
    }

    return jsonOk({ ok: true, zone });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  return updateZone(request, context);
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return updateZone(request, context);
}
