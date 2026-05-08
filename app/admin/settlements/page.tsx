import { SpicaDashboard } from "@/components/SpicaDashboard";
import { requirePageRole } from "@/lib/page-auth";

export default async function AdminSettlementsPage() {
  await requirePageRole("admin");
  return <SpicaDashboard initialView="Settlements" role="admin" />;
}
