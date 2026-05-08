import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api";
import { ensureDatabaseConnection, prisma } from "@/lib/prisma";
import { audit, publicUser } from "@/lib/server-auth";

export async function GET(request: NextRequest) {
  try {
    await ensureDatabaseConnection();
    const token = request.nextUrl.searchParams.get("token");

    if (!token) {
      return Response.json({ error: "Verification token is required" }, { status: 400 });
    }

    const user = await prisma.user.findFirst({ where: { verificationToken: token } });

    if (!user) {
      return Response.json({ error: "Invalid verification token" }, { status: 404 });
    }

    const verified = await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true, verificationToken: null }
    });
    await audit("verify_email", user.id);

    return jsonOk({ ok: true, user: publicUser(verified) });
  } catch (error) {
    return jsonError(error);
  }
}
