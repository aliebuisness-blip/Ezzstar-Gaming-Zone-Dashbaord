import { SpicaDashboard } from "@/components/SpicaDashboard";
import { requirePageRole } from "@/lib/page-auth";

export default async function PlayerActivityPage() {
  await requirePageRole("player");
  return <SpicaDashboard initialView="Activity" role="player" />;
}
