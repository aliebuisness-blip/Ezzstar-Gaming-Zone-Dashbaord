import { SpicaDashboard } from "@/components/SpicaDashboard";
import { requirePageRole } from "@/lib/page-auth";

export default async function AdminSupportPage() {
  await requirePageRole("admin");
  return <SpicaDashboard initialView="Support" role="admin" />;
}
