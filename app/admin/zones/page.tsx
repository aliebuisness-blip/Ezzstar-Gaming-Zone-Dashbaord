import { SpicaDashboard } from "@/components/SpicaDashboard";
import { requirePageRole } from "@/lib/page-auth";

export default async function AdminZonesPage() {
  await requirePageRole("admin");
  return <SpicaDashboard initialView="Zones" role="admin" />;
}
