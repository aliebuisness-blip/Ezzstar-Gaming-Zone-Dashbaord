import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/api";
import { ensureDatabaseConnection, prisma } from "@/lib/prisma";
import { publicUser, signAuthToken, verifyPassword } from "@/lib/server-auth";

const PcLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  pcId: z.string().min(1).optional(),
  zoneId: z.string().min(1).optional(),
  estimatedCost: z.number().int().positive().optional()
});

export async function POST(request: Request) {
  try {
    await ensureDatabaseConnection();
    const input = PcLoginSchema.parse(await request.json());
    const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase().trim() } });

    if (!user || user.role !== "player" || !(await verifyPassword(input.password, user.password))) {
      return Response.json({ error: "Invalid player email or password" }, { status: 401 });
    }

    if (input.estimatedCost && user.spica_balance < input.estimatedCost) {
      return Response.json({ error: "Insufficient SPICA balance", balance: user.spica_balance }, { status: 402 });
    }

    const token = signAuthToken({ id: user.id, email: user.email, role: user.role, username: user.username });

    return jsonOk({
      token,
      player: publicUser(user),
      balance: user.spica_balance,
      canStartSession: !input.estimatedCost || user.spica_balance >= input.estimatedCost,
      pcId: input.pcId,
      zoneId: input.zoneId
    });
  } catch (error) {
    return jsonError(error);
  }
}
