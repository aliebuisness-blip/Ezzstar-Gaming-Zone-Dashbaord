import { SpicaDashboard } from "@/components/SpicaDashboard";
import { requirePageRole } from "@/lib/page-auth";

export default async function AdminPlayersPage() {
  await requirePageRole("admin");
  return <SpicaDashboard initialView="Players" role="admin" />;
}
