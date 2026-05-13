import { ReactNode } from "react";
import { DashboardRole, GamingPc, Player, Session, Settlement, Transaction, Withdrawal, Zone } from "@/lib/spica";
import { RoleNavKey } from "@/components/RoleSidebar";

export type DashboardPageProps = {
  children?: ReactNode;
};

export type PlayerPageProps = DashboardPageProps & {
  player: Player;
  sessions: Session[];
  transactions: Transaction[];
  zones: Zone[];
};

export type ZonePageProps = DashboardPageProps & {
  zone: Zone;
  sessions: Session[];
  settlements: Settlement[];
};

export type AdminPageProps = DashboardPageProps & {
  zones: Zone[];
  players: Player[];
  sessions: Session[];
  settlements: Settlement[];
  withdrawals: Withdrawal[];
};

export type PcActionHandlers = {
  onStart?: (pc: GamingPc) => void;
  onAddTime?: (sessionId: string, minutes: number) => void;
  onEnd?: (sessionId: string) => void;
};

export type DashboardRouteState = {
  role: DashboardRole;
  activeView: RoleNavKey;
};
