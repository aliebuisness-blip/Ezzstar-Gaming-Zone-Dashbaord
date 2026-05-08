import { SpicaDashboard } from "@/components/SpicaDashboard";
import { requirePageRole } from "@/lib/page-auth";

export default async function ZoneCustomersPage() {
  await requirePageRole(["zone_owner", "manager"]);
  return <SpicaDashboard initialView="Customers" role="zone" />;
}
