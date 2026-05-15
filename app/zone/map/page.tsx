import { SpicaDashboard } from "@/components/SpicaDashboard";
import { requirePageRole } from "@/lib/page-auth";

export default async function ZoneMapPage() {
  await requirePageRole(["zone_owner", "manager"]);
  return <SpicaDashboard initialView="Map" role="zone" />;
}
