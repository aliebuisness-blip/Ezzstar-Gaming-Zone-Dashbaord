import { SpicaDashboard } from "@/components/SpicaDashboard";
import { requirePageRole } from "@/lib/page-auth";

export default async function PlayerProfilePage() {
  await requirePageRole("player");
  return <SpicaDashboard initialView="Profile" role="player" />;
}
