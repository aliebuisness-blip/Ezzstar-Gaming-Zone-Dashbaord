import { SpicaDashboard } from "@/components/SpicaDashboard";
import { requirePageRole } from "@/lib/page-auth";

export default async function AdminSessionsPage() {
  await requirePageRole("admin");
  return <SpicaDashboard initialView="Sessions" role="admin" />;
}
