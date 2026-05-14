import { SpicaDashboard } from "@/components/SpicaDashboard";
import { requirePageRole } from "@/lib/page-auth";

export default async function ZoneSettingsPage() {
  await requirePageRole(["zone_owner", "manager"]);
  return <SpicaDashboard initialView="Settings" role="zone" />;
}
