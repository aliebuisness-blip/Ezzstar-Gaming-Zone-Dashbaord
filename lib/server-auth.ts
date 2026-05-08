import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import { prisma } from "./prisma";
import { getJwtSecret } from "./env";

export type AuthUser = {
  id: string;
  role: UserRole;
  email: string;
  username?: string;
};

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signAuthToken(user: AuthUser): string {
  return jwt.sign(user, getJwtSecret(), { expiresIn: "7d" });
}

export function verifyAuthToken(token: string): AuthUser | null {
  try {
    return jwt.verify(token, getJwtSecret()) as AuthUser;
  } catch {
    return null;
  }
}

export async function requireApiUser(request: NextRequest, roles?: UserRole[]): Promise<AuthUser> {
  const header = request.headers.get("authorization");
  const cookieToken = request.cookies.get("spica_token")?.value;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : cookieToken;
  const authUser = token ? verifyAuthToken(token) : null;

  if (!authUser) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  if (roles && !roles.includes(authUser.role)) {
    throw new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
  }

  return authUser;
}

export function publicUser(user: {
  id: string;
  name: string;
  username: string;
  email: string;
  avatar: string | null;
  banner: string | null;
  bio: string | null;
  role: UserRole;
  spica_balance: number;
  xp: number;
  level: number;
  onlineStatus: string;
  emailVerified: boolean;
  membership: string;
  favoriteGames: string[];
  favoriteZones: string[];
  createdAt?: Date;
}) {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    avatar: user.avatar,
    banner: user.banner,
    bio: user.bio,
    role: user.role,
    spica_balance: user.spica_balance,
    xp: user.xp,
    level: user.level,
    onlineStatus: user.onlineStatus,
    emailVerified: user.emailVerified,
    membership: user.membership,
    favoriteGames: user.favoriteGames,
    favoriteZones: user.favoriteZones,
    createdAt: user.createdAt
  };
}

export async function audit(action: Parameters<typeof prisma.auditLog.create>[0]["data"]["action"], actorId?: string, metadata?: unknown) {
  await prisma.auditLog.create({
    data: {
      action,
      actorId,
      metadata: metadata === undefined ? undefined : (metadata as object)
    }
  });
}
