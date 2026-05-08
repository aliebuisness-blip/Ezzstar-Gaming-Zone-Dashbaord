import { SpicaDashboard } from "@/components/SpicaDashboard";
import { requirePageRole } from "@/lib/page-auth";

export default async function PlayerWalletPage() {
  await requirePageRole("player");
  return <SpicaDashboard initialView="Wallet" role="player" />;
}
