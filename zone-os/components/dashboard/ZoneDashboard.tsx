import { ReactNode } from "react";
import { RoleNavKey } from "@/components/RoleSidebar";
import { ZoneCustomers } from "@/components/dashboard/zone/ZoneCustomers";
import { ZoneEarnings } from "@/components/dashboard/zone/ZoneEarnings";
import { ZoneHome } from "@/components/dashboard/zone/ZoneHome";
import { ZonePCs } from "@/components/dashboard/zone/ZonePCs";
import { ZoneSessions } from "@/components/dashboard/zone/ZoneSessions";
import { ZoneSettings } from "@/components/dashboard/zone/ZoneSettings";
import { ZoneUpdates } from "@/components/dashboard/zone/ZoneUpdates";

type ZoneDashboardProps = {
  activeView: RoleNavKey;
  emptyState?: ReactNode;
  home: ReactNode;
  pcs: ReactNode;
  sessions: ReactNode;
  settlements: ReactNode;
  customers: ReactNode;
  updates: ReactNode;
  payouts?: ReactNode;
  settings?: ReactNode;
};

export function ZoneDashboard({ activeView, emptyState, home, pcs, sessions, settlements, customers, updates, payouts, settings }: ZoneDashboardProps) {
  if (emptyState) {
    return <ZoneHome>{emptyState}</ZoneHome>;
  }

  if (activeView === "PC Control" || activeView === "PCs") {
    return <ZonePCs>{pcs}</ZonePCs>;
  }

  if (activeView === "Live Sessions" || activeView === "Sessions") {
    return <ZoneSessions>{sessions}</ZoneSessions>;
  }

  if (activeView === "Earnings" || activeView === "Settlements") {
    return <ZoneEarnings>{settlements}</ZoneEarnings>;
  }

  if (activeView === "Player Activity" || activeView === "Customers") {
    return <ZoneCustomers>{customers}</ZoneCustomers>;
  }

  if (activeView === "Updates") {
    return <ZoneUpdates>{updates}</ZoneUpdates>;
  }

  if (activeView === "Payout Requests" && payouts) {
    return <>{payouts}</>;
  }

  if (activeView === "Settings" && settings) {
    return <ZoneSettings>{settings}</ZoneSettings>;
  }

  return <ZoneHome>{home}</ZoneHome>;
}
