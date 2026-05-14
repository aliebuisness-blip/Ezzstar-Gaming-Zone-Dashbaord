import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/api";
import { createSupabaseAuthUser, publicProfile, setSupabaseSessionCookies, signInWithPassword, upsertProfile } from "@/lib/supabase/web";

const SignupSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(80),
  username: z.string().trim().min(3, "Username must be at least 3 characters.").max(32).regex(/^[a-zA-Z0-9_-]+$/, "Username can only use letters, numbers, underscores, and dashes."),
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters.").max(128),
  role: z.enum(["player", "zone_owner"]).default("player")
});

export async function POST(request: Request) {
  try {
    const parsed = SignupSchema.safeParse(await request.json());

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return Response.json({ error: firstIssue?.message ?? "Please check your signup details.", details: parsed.error.flatten() }, { status: 400 });
    }

    const input = parsed.data;
    const email = input.email.toLowerCase().trim();
    const username = input.username.toLowerCase().trim();
    const role = input.role;
    const authUser = await createSupabaseAuthUser({
      email,
      password: input.password,
      name: input.name.trim(),
      username,
      role
    });
    const profile = await upsertProfile({
      id: authUser.id,
      email,
      name: input.name.trim(),
      username,
      role,
      spica_balance: role === "player" ? 1000 : 0
    });
    const session = await signInWithPassword(email, input.password);

    await setSupabaseSessionCookies(session, request.url);

    return jsonOk({
      user: publicProfile(profile)
    });
  } catch (error) {
    return jsonError(error);
  }
}
