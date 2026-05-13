import { SpicaDashboard } from "@/components/SpicaDashboard";
import { requirePageRole } from "@/lib/page-auth";

export default async function AdminAnnouncementsPage() {
  await requirePageRole("admin");
  return <SpicaDashboard initialView="Announcements" role="admin" />;
}
