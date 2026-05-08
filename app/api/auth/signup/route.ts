import crypto from "node:crypto";
import { cookies } from "next/headers";
import { Prisma, UserRole, ZoneStatus } from "@prisma/client";
import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/api";
import { ensureDatabaseConnection, prisma } from "@/lib/prisma";
import { audit, hashPassword, publicUser, signAuthToken } from "@/lib/server-auth";

const SignupSchema = z.object({
  name: z.string().min(2).max(80),
  username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_-]+$/),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  role: z.enum(["player", "zone_owner"]).default("player"),
  zoneName: z.string().min(2).max(80).optional(),
  city: z.string().min(2).max(80).optional()
});

export async function POST(request: Request) {
  try {
    await ensureDatabaseConnection();
    const input = SignupSchema.parse(await request.json());
    const normalizedEmail = input.email.toLowerCase().trim();
    const username = input.username.toLowerCase().trim();
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: normalizedEmail }, { username }] }
    });

    if (existing) {
      return Response.json({ error: "Email or username is already registered" }, { status: 409 });
    }

    const verificationToken = crypto.randomBytes(24).toString("hex");
    const passwordHash = await hashPassword(input.password);
    const { user, zone } = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: input.name.trim(),
          username,
          email: normalizedEmail,
          password: passwordHash,
          role: input.role as UserRole,
          spica_balance: input.role === "player" ? 1000 : 0,
          emailVerified: false,
          verificationToken,
          membership: input.role === "player" ? "Starter" : "Zone Operator"
        }
      });
      const zone =
        input.role === "zone_owner"
          ? await tx.zone.create({
              data: {
                name: input.zoneName?.trim() ?? `${input.name.trim()}'s Arena`,
                city: input.city?.trim() ?? "Lahore",
                ownerId: user.id,
                status: ZoneStatus.pending,
                pricing: { standard: 100, premium: 150 } as Prisma.InputJsonObject,
                branding: { tagline: "Pending Ezzstar approval" } as Prisma.InputJsonObject
              }
            })
          : null;

      return { user, zone };
    });
    const token = signAuthToken({ id: user.id, email: user.email, role: user.role, username: user.username });
    const cookieStore = await cookies();

    const isHttps = new URL(request.url).protocol === "https:";

    cookieStore.set("spica_token", token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production" && isHttps
    });

    await audit("signup", user.id, { role: user.role, verificationToken, zoneId: zone?.id });

    return jsonOk({
      token,
      verificationToken,
      verificationUrl: `/api/auth/verify-email?token=${verificationToken}`,
      zone,
      user: publicUser(user)
    });
  } catch (error) {
    return jsonError(error);
  }
}
