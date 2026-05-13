import { SpicaDashboard } from "@/components/SpicaDashboard";
import { requirePageRole } from "@/lib/page-auth";

export default async function PlayerSessionsPage() {
  await requirePageRole("player");
  return <SpicaDashboard initialView="Sessions" role="player" />;
}
