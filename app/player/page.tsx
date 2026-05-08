import { SpicaDashboard } from "@/components/SpicaDashboard";
import { requirePageRole } from "@/lib/page-auth";

export default async function PlayerPage() {
  await requirePageRole("player");
  return <SpicaDashboard role="player" />;
}
