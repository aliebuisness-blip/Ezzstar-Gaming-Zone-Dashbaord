import { ReactNode } from "react";
import { RoleNavKey } from "@/components/RoleSidebar";
import { PlayerActivity } from "@/components/dashboard/player/PlayerActivity";
import { PlayerHome } from "@/components/dashboard/player/PlayerHome";
import { PlayerProfile } from "@/components/dashboard/player/PlayerProfile";
import { PlayerUpdates } from "@/components/dashboard/player/PlayerUpdates";
import { PlayerWallet } from "@/components/dashboard/player/PlayerWallet";
import { PlayerZones } from "@/components/dashboard/player/PlayerZones";

type PlayerDashboardProps = {
  activeView: RoleNavKey;
  home: ReactNode;
  wallet: ReactNode;
  sessions: ReactNode;
  zones: ReactNode;
  updates: ReactNode;
  tournaments: ReactNode;
  profile: ReactNode;
};

export function PlayerDashboard({ activeView, home, wallet, sessions, zones, updates, tournaments, profile }: PlayerDashboardProps) {
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
    return <PlayerUpdates>{tournaments}</PlayerUpdates>;
  }

  return <PlayerHome>{home}</PlayerHome>;
}
