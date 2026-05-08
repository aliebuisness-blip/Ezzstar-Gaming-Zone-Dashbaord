import { SpicaDashboard } from "@/components/SpicaDashboard";
import { requirePageRole } from "@/lib/page-auth";

export default async function ZonePcsPage() {
  await requirePageRole(["zone_owner", "manager"]);
  return <SpicaDashboard initialView="PCs" role="zone" />;
}
