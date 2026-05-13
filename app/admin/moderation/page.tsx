import { SpicaDashboard } from "@/components/SpicaDashboard";
import { requirePageRole } from "@/lib/page-auth";

export default async function AdminModerationPage() {
  await requirePageRole("admin");
  return <SpicaDashboard initialView="Moderation" role="admin" />;
}
