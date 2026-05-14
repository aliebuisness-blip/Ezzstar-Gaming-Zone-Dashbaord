import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/api";
import { createSupabaseAuthUser, insertRow, requireWebUser, selectRows, upsertProfile } from "@/lib/supabase/web";

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

export async function GET() {
  try {
    await requireWebUser(["admin"]);
    const requests = await selectRows("zone_listing_requests", "select=*&order=created_at.desc").catch(() => []);
    return jsonOk({ requests });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const parsed = ListingRequestSchema.safeParse(await request.json());

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return Response.json({ error: firstIssue?.message ?? "Please check your application details." }, { status: 400 });
    }

    const input = parsed.data;
    const email = input.email.toLowerCase().trim();
    const username = buildUsername(email);
    const authUser = await createSupabaseAuthUser({
      email,
      password: input.password,
      name: input.ownerName.trim(),
      username,
      role: "zone_owner"
    });
    await upsertProfile({
      id: authUser.id,
      email,
      name: input.ownerName.trim(),
      username,
      role: "zone_owner",
      spica_balance: 0,
      membership: "Zone Operator"
    });
    const listingRequest: any = await insertRow("zone_listing_requests", {
      owner_id: authUser.id,
      owner_name: input.ownerName.trim(),
      email,
      phone: input.phone.trim(),
      zone_name: input.zoneName.trim(),
      city: input.city.trim(),
      pc_count: input.pcCount,
      rent_per_hour: input.rentPerHour,
      current_pricing_model: input.currentPricingModel.trim(),
      message: input.message?.trim() ?? "",
      status: "pending"
    });
    const zone: any = await insertRow("zones", {
      owner_id: authUser.id,
      owner_name: input.ownerName.trim(),
      owner_email: email,
      listing_request_id: listingRequest.id,
      name: input.zoneName.trim(),
      city: input.city.trim(),
      pc_count: input.pcCount,
      rent_per_hour: input.rentPerHour,
      pricing_model: input.currentPricingModel.trim(),
      status: "pending"
    });

    return jsonOk({ ok: true, request: listingRequest, zone: { id: zone.id, status: zone.status }, user: { id: authUser.id, email, role: "zone_owner" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not submit listing request.";
    const lower = message.toLowerCase();
    const status = lower.includes("already") || lower.includes("registered") || lower.includes("duplicate") ? 409 : lower.includes("supabase web auth is not configured") ? 503 : 400;
    return Response.json(
      {
        ok: false,
        error: status === 409 ? "This business email is already registered. Please sign in instead." : message
      },
      { status }
    );
  }
}
