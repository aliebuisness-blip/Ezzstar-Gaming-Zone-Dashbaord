import { ReactNode } from "react";
import { RoleNavKey } from "@/components/RoleSidebar";
import { ZoneDashboard } from "@/components/dashboard/zone/ZoneDashboard";

type ZoneOSWorkspaceProps = {
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

export function ZoneOSWorkspace(props: ZoneOSWorkspaceProps) {
  return <ZoneDashboard {...props} />;
}
