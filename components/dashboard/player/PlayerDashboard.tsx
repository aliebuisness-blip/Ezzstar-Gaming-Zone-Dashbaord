import { ReactNode } from "react";
import { RoleNavKey } from "@/components/RoleSidebar";
import { PlayerActivity } from "@/components/dashboard/player/PlayerActivity";
import { PlayerHome } from "@/components/dashboard/player/PlayerHome";
import { PlayerProfile } from "@/components/dashboard/player/PlayerProfile";
import { PlayerUpdates } from "@/components/dashboard/player/PlayerUpdates";
import { PlayerWallet } from "@/components/dashboard/player/PlayerWallet";
import { PlayerZones } from "@/components/dashboard/player/PlayerZones";
import { EmptyState } from "@/components/ui/EmptyState";

type PlayerDashboardProps = {
  activeView: RoleNavKey;
  home: ReactNode;
  wallet: ReactNode;
  sessions: ReactNode;
  zones: ReactNode;
  updates: ReactNode;
  profile: ReactNode;
};

export function PlayerDashboard({ activeView, home, wallet, sessions, zones, updates, profile }: PlayerDashboardProps) {
  if (activeView === "Wallet") {
    return <PlayerWallet>{wallet}</PlayerWallet>;
  }

  if (activeView === "Sessions" || activeView === "Active Session" || activeView === "Activity" || activeView === "Play History") {
    return <PlayerActivity>{sessions}</PlayerActivity>;
  }

  if (activeView === "Nearby Zones" || activeView === "Zones") {
    return <PlayerZones>{zones}</PlayerZones>;
  }

  if (activeView === "Updates") {
    return <PlayerUpdates>{updates}</PlayerUpdates>;
  }

  if (activeView === "Rewards" || activeView === "Profile") {
    return <PlayerProfile>{profile}</PlayerProfile>;
  }

  if (activeView === "Tournaments") {
    return (
      <section className="player-card-in rounded-2xl border border-white/10 bg-white/[0.055] p-5 shadow-nebula">
        <p className="text-xs uppercase tracking-[0.18em] text-purple-200">Competitive Layer</p>
        <h3 className="mt-3 text-xl font-semibold text-white">Tournaments are coming soon</h3>
        <EmptyState title="No tournaments available" description="Featured SPICA tournaments and waitlists will appear here when Ezzstar enables the competitive layer." />
      </section>
    );
  }

  return <PlayerHome>{home}</PlayerHome>;
}
