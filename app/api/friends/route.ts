import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/api";
import { ensureDatabaseConnection, prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/server-auth";

const FriendSchema = z.object({
  usernameOrEmail: z.string().min(3)
});

export async function GET(request: NextRequest) {
  try {
    await ensureDatabaseConnection();
    const auth = await requireApiUser(request);
    const friends = await prisma.friendship.findMany({
      where: { OR: [{ requesterId: auth.id }, { addresseeId: auth.id }] },
      include: { requester: true, addressee: true },
      orderBy: { createdAt: "desc" }
    });

    return jsonOk({ friends });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureDatabaseConnection();
    const auth = await requireApiUser(request);
    const input = FriendSchema.parse(await request.json());
    const target = await prisma.user.findFirst({
      where: {
        OR: [{ username: input.usernameOrEmail.toLowerCase() }, { email: input.usernameOrEmail.toLowerCase() }],
        role: "player"
      }
    });

    if (!target || target.id === auth.id) {
      return Response.json({ error: "Player not found" }, { status: 404 });
    }

    const friendship = await prisma.friendship.upsert({
      where: { requesterId_addresseeId: { requesterId: auth.id, addresseeId: target.id } },
      update: {},
      create: { requesterId: auth.id, addresseeId: target.id, status: "pending" }
    });
    await prisma.playerNotification.create({
      data: {
        userId: target.id,
        type: "friend",
        title: "Friend request",
        message: `${auth.username ?? "A player"} sent you a friend request.`
      }
    });

    return jsonOk({ friendship });
  } catch (error) {
    return jsonError(error);
  }
}
