import crypto from "node:crypto";
import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/api";
import { ensureDatabaseConnection, prisma } from "@/lib/prisma";
import { audit } from "@/lib/server-auth";

const ForgotSchema = z.object({
  email: z.string().email()
});

export async function POST(request: Request) {
  try {
    await ensureDatabaseConnection();
    const input = ForgotSchema.parse(await request.json());
    const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase().trim() } });

    if (!user) {
      return jsonOk({ ok: true, message: "If this account exists, a reset link was generated." });
    }

    const resetToken = crypto.randomBytes(24).toString("hex");
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetExpiresAt: new Date(Date.now() + 30 * 60 * 1000)
      }
    });
    await audit("forgot_password", user.id);

    const isDevelopment = process.env.NODE_ENV === "development";

    return jsonOk({
      ok: true,
      ...(isDevelopment ? { resetToken, resetUrl: `/login?resetToken=${resetToken}` } : {}),
      message: isDevelopment ? "Reset token generated for local development." : "If this account exists, reset instructions were prepared."
    });
  } catch (error) {
    return jsonError(error);
  }
}
