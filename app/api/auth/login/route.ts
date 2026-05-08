import { cookies } from "next/headers";
import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/api";
import { ensureDatabaseConnection, prisma } from "@/lib/prisma";
import { audit, publicUser, signAuthToken, verifyPassword } from "@/lib/server-auth";

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export async function POST(request: Request) {
  try {
    await ensureDatabaseConnection();
    const input = LoginSchema.parse(await request.json());
    const user = await prisma.user.findUnique({ where: { email: input.email } });

    if (!user || !(await verifyPassword(input.password, user.password))) {
      return Response.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const token = signAuthToken({ id: user.id, email: user.email, role: user.role, username: user.username });
    const cookieStore = await cookies();

    const isHttps = new URL(request.url).protocol === "https:";

    cookieStore.set("spica_token", token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production" && isHttps
    });

    await audit("login", user.id);
    return jsonOk({
      token,
      user: publicUser(user)
    });
  } catch (error) {
    return jsonError(error);
  }
}
