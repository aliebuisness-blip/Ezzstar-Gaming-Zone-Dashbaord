"use client";

import { DashboardWorkspace } from "@/components/dashboard/DashboardWorkspace";
import { DashboardRole } from "@/lib/spica";
import { RoleNavKey } from "@/components/RoleSidebar";

type SpicaDashboardProps = {
  role: DashboardRole;
  initialView?: RoleNavKey;
};

export function SpicaDashboard(props: SpicaDashboardProps) {
  return <DashboardWorkspace {...props} />;
}
