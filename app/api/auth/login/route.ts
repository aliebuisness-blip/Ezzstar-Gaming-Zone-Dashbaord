import { z } from "zod";
import { jsonOk } from "@/lib/api";
import { getProfile, getWebRedirectForRole, normalizeWebRole, publicProfile, selectRows, setSupabaseSessionCookies, signInWithPassword, upsertProfile } from "@/lib/supabase/web";

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

async function resolveLoginRedirect(user: ReturnType<typeof publicProfile>) {
  if (user.role !== "zone_owner" && user.role !== "manager") {
    return getWebRedirectForRole(user.role);
  }

  const zones = await selectRows<{ status?: string }>(
    "zones",
    `owner_id=eq.${encodeURIComponent(user.id)}&select=status&order=created_at.desc&limit=1`
  ).catch(() => []);
  const status = zones[0]?.status ?? "pending";

  if (status === "active") {
    return process.env.NEXT_PUBLIC_ZONE_OS_URL ?? (process.env.NODE_ENV === "development" ? "/zone" : "/zone-os");
  }

  if (status === "rejected") {
    return "/list-your-zone?status=rejected";
  }

  return "/list-your-zone?status=pending";
}

export async function POST(request: Request) {
  try {
    const input = LoginSchema.parse(await request.json());
    const email = input.email.toLowerCase().trim();
    const session = await signInWithPassword(email, input.password);
    const metadataRole = normalizeWebRole(session.user.app_metadata?.role ?? session.user.user_metadata?.role);
    const profile = await getProfile(session.user.id) ?? await upsertProfile({
      id: session.user.id,
      email: session.user.email ?? email,
      name: String(session.user.user_metadata?.name ?? session.user.email ?? email),
      username: String(session.user.user_metadata?.username ?? email.split("@")[0]),
      role: metadataRole
    });
    const user = publicProfile(profile);
    const redirectTo = await resolveLoginRedirect(user);

    await setSupabaseSessionCookies(session, request.url);

    return jsonOk({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        username: user.username,
        avatar: user.avatar,
        spica_balance: user.spica_balance
      },
      redirectTo
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sign in failed.";
    const lower = message.toLowerCase();
    const status = lower.includes("invalid") || lower.includes("credentials") ? 401 : lower.includes("supabase web auth is not configured") ? 503 : 400;
    return Response.json(
      {
        ok: false,
        error: status === 401 ? "Invalid email or password." : message || "Sign in failed."
      },
      { status }
    );
  }
}
