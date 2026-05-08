import { SpicaDashboard } from "@/components/SpicaDashboard";
import { requirePageRole } from "@/lib/page-auth";

export default async function AdminSystemHealthPage() {
  await requirePageRole("admin");
  return <SpicaDashboard initialView="System Health" role="admin" />;
}
