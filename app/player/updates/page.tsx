import { SpicaDashboard } from "@/components/SpicaDashboard";
import { requirePageRole } from "@/lib/page-auth";

export default async function PlayerUpdatesPage() {
  await requirePageRole("player");
  return <SpicaDashboard initialView="Updates" role="player" />;
}
