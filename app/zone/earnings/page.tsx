import { SpicaDashboard } from "@/components/SpicaDashboard";
import { requirePageRole } from "@/lib/page-auth";

export default async function ZoneEarningsPage() {
  await requirePageRole(["zone_owner", "manager"]);
  return <SpicaDashboard initialView="Earnings" role="zone" />;
}
