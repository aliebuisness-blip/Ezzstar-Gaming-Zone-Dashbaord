import { redirect } from "next/navigation";
import { requireWebUser, WebRole } from "@/lib/supabase/web";

const rolePath: Record<WebRole, string> = {
  player: "/player",
  zone_owner: "/zone",
  manager: "/zone",
  admin: "/admin"
};

export async function requirePageRole(role: WebRole | WebRole[]) {
  const roles = Array.isArray(role) ? role : [role];

  try {
    const { profile } = await requireWebUser();

    if (profile.role === "admin") {
      return profile;
    }

    if (!roles.includes(profile.role)) {
      redirect(rolePath[profile.role] ?? "/login");
    }

    return profile;
  } catch {
    redirect("/login");
  }
}
