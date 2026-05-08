import { SpicaDashboard } from "@/components/SpicaDashboard";
import { requirePageRole } from "@/lib/page-auth";

export default async function ZoneSessionsPage() {
  await requirePageRole(["zone_owner", "manager"]);
  return <SpicaDashboard initialView="Sessions" role="zone" />;
}
