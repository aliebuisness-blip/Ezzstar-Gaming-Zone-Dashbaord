import { ReactNode } from "react";
import { RoleNavKey } from "@/components/RoleSidebar";
import { AdminHome } from "@/components/dashboard/admin/AdminHome";
import { AdminPlayers } from "@/components/dashboard/admin/AdminPlayers";
import { AdminRequests } from "@/components/dashboard/admin/AdminRequests";
import { AdminSettlements } from "@/components/dashboard/admin/AdminSettlements";
import { AdminSystemHealth } from "@/components/dashboard/admin/AdminSystemHealth";
import { AdminZones } from "@/components/dashboard/admin/AdminZones";

type AdminDashboardProps = {
  activeView: RoleNavKey;
  home: ReactNode;
  zones: ReactNode;
  players: ReactNode;
  requests: ReactNode;
  settlements: ReactNode;
  sessions: ReactNode;
  withdrawals: ReactNode;
  commissions: ReactNode;
  systemHealth: ReactNode;
  simplePage: ReactNode;
};

export function AdminDashboard({
  activeView,
  home,
  zones,
  players,
  requests,
  settlements,
  sessions,
  withdrawals,
  commissions,
  systemHealth,
  simplePage
}: AdminDashboardProps) {
  if (activeView === "All Zones" || activeView === "Zones") {
    return <AdminZones>{zones}</AdminZones>;
  }

  if (activeView === "All Players" || activeView === "Players") {
    return <AdminPlayers>{players}</AdminPlayers>;
  }

  if (activeView === "Requests") {
    return <AdminRequests>{requests}</AdminRequests>;
  }

  if (activeView === "Commissions") {
    return <>{commissions}</>;
  }

  if (activeView === "Sessions") {
    return <>{sessions}</>;
  }

  if (activeView === "Withdrawal Approvals") {
    return <>{withdrawals}</>;
  }

  if (activeView === "Settlement Approvals" || activeView === "Settlements") {
    return <AdminSettlements>{settlements}</AdminSettlements>;
  }

  if (activeView === "System Analytics" || activeView === "System Health") {
    return <AdminSystemHealth>{systemHealth}</AdminSystemHealth>;
  }

  if (["Tournaments", "Announcements", "Moderation", "Support"].includes(activeView)) {
    return <>{simplePage}</>;
  }

  return <AdminHome>{home}</AdminHome>;
}
