import { SpicaDashboard } from "@/components/SpicaDashboard";
import { requirePageRole } from "@/lib/page-auth";

export default async function PlayerZonesPage() {
  await requirePageRole("player");
  return <SpicaDashboard initialView="Zones" role="player" />;
}
