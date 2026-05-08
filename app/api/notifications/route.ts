import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api";
import { ensureDatabaseConnection, prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/server-auth";

export async function GET(request: NextRequest) {
  try {
    await ensureDatabaseConnection();
    const auth = await requireApiUser(request);
    const notifications = await prisma.playerNotification.findMany({
      where: { userId: auth.id },
      orderBy: { createdAt: "desc" },
      take: 50
    });

    return jsonOk({ notifications });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await ensureDatabaseConnection();
    const auth = await requireApiUser(request);
    await prisma.playerNotification.updateMany({ where: { userId: auth.id, read: false }, data: { read: true } });
    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
