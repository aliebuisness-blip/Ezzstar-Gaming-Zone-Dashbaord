import { jsonOk } from "@/lib/api";

export async function GET() {
  return jsonOk({
    ok: true,
    message: "Email verification is handled by Supabase Auth."
  });
}
