import { SpicaDashboard } from "@/components/SpicaDashboard";
import { requirePageRole } from "@/lib/page-auth";

export default async function ZoneSettlementsPage() {
  await requirePageRole(["zone_owner", "manager"]);
  return <SpicaDashboard initialView="Settlements" role="zone" />;
}
