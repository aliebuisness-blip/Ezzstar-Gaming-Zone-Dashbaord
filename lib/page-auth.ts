import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import { verifyAuthToken } from "@/lib/server-auth";

const rolePath: Record<UserRole, string> = {
  player: "/player",
  zone_owner: "/zone",
  manager: "/zone",
  admin: "/admin"
};

export async function requirePageRole(role: UserRole | UserRole[]) {
  const cookieStore = await cookies();
  const token = cookieStore.get("spica_token")?.value;
  const user = token ? verifyAuthToken(token) : null;

  if (!user) {
    redirect("/login");
  }

  const roles = Array.isArray(role) ? role : [role];

  if (user.role === "admin") {
    return user;
  }

  if (!roles.includes(user.role)) {
    redirect(rolePath[user.role]);
  }

  return user;
}
