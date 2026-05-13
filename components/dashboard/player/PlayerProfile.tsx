import { PageFrame } from "@/components/dashboard/shared/PageFrame";
import { DashboardPageProps } from "@/components/dashboard/shared/types";

export function PlayerProfile({ children }: DashboardPageProps) {
  return <PageFrame>{children}</PageFrame>;
}
