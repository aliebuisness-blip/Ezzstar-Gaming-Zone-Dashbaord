import { cookies } from "next/headers";
import { jsonOk } from "@/lib/api";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.set("spica_token", "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires: new Date(0)
  });
  return jsonOk({ ok: true });
}
