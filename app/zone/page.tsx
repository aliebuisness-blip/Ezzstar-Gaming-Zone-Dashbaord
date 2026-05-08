import { SpicaDashboard } from "@/components/SpicaDashboard";
import { requirePageRole } from "@/lib/page-auth";

export default async function ZonePage() {
  await requirePageRole(["zone_owner", "manager"]);
  return <SpicaDashboard role="zone" />;
}
