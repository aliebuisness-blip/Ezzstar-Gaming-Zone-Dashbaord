import { z } from "zod";
import { jsonOk } from "@/lib/api";
import { getProfile, getWebRedirectForRole, normalizeWebRole, publicProfile, setSupabaseSessionCookies, signInWithPassword, upsertProfile } from "@/lib/supabase/web";

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

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
    const redirectTo = getWebRedirectForRole(user.role);

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
