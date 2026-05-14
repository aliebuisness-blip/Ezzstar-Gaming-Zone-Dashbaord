import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/api";
import { getSupabaseWebConfig } from "@/lib/supabase/web";

const ForgotSchema = z.object({
  email: z.string().email()
});

export async function POST(request: Request) {
  try {
    const input = ForgotSchema.parse(await request.json());
    const config = getSupabaseWebConfig();

    if (config.configured) {
      await fetch(`${config.url}/auth/v1/recover`, {
        method: "POST",
        headers: {
          apikey: config.anonKey,
          authorization: `Bearer ${config.anonKey}`,
          "content-type": "application/json"
        },
        body: JSON.stringify({ email: input.email.toLowerCase().trim() })
      }).catch(() => null);
    }

    return jsonOk({ ok: true, message: "If this account exists, reset instructions were prepared." });
  } catch (error) {
    return jsonError(error);
  }
}
