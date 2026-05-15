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
  let profile;

  try {
    const result = await requireWebUser();
    profile = result.profile;
  } catch {
    redirect("/login");
  }

  if (!roles.includes(profile.role)) {
    redirect(rolePath[profile.role] ?? "/login");
  }

  return profile;
}
