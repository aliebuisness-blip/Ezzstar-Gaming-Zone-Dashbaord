import { SpicaDashboard } from "@/components/SpicaDashboard";
import { requirePageRole } from "@/lib/page-auth";

export default async function AdminTournamentsPage() {
  await requirePageRole("admin");
  return <SpicaDashboard initialView="Tournaments" role="admin" />;
}
