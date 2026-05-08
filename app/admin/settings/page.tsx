import { SpicaDashboard } from "@/components/SpicaDashboard";
import { requirePageRole } from "@/lib/page-auth";

export default async function AdminSettingsPage() {
  await requirePageRole("admin");
  return <SpicaDashboard initialView="Settings" role="admin" />;
}
