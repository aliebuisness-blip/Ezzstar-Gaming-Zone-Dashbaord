import { SpicaDashboard } from "@/components/SpicaDashboard";
import { requirePageRole } from "@/lib/page-auth";

export default async function PlayerTournamentsPage() {
  await requirePageRole("player");
  return <SpicaDashboard initialView="Tournaments" role="player" />;
}
