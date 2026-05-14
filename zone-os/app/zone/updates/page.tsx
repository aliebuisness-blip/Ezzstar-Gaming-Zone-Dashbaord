import { SpicaDashboard } from "@/components/SpicaDashboard";
import { requirePageRole } from "@/lib/page-auth";

export default async function ZoneUpdatesPage() {
  await requirePageRole(["zone_owner", "manager"]);
  return <SpicaDashboard initialView="Updates" role="zone" />;
}
