import { SpicaDashboard } from "@/components/SpicaDashboard";
import { requirePageRole } from "@/lib/page-auth";

export default async function AdminPage() {
  await requirePageRole("admin");
  return <SpicaDashboard role="admin" />;
}
