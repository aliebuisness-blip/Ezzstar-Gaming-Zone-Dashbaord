import { cookies } from "next/headers";
import { jsonOk } from "@/lib/api";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete("spica_token");
  return jsonOk({ ok: true });
}
