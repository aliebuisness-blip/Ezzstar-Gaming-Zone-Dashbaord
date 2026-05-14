import { jsonOk } from "@/lib/api";
import { clearSupabaseSessionCookies } from "@/lib/supabase/web";

export async function POST() {
  await clearSupabaseSessionCookies();
  return jsonOk({ ok: true });
}
