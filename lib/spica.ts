export type ViewKey =
  | "Overview"
  | "Zones"
  | "PC Control"
  | "Players"
  | "Wallet"
  | "Sessions"
  | "Settlements"
  | "Withdrawals"
  | "Settings";

export type DashboardRole = "player" | "zone" | "admin";

export type ZoneStatus = "Active" | "Pending" | "Suspended";
export type PcType = "Standard" | "Premium";
export type PcCategory = "standard" | "premium" | "vip";
export type SessionStatus = "Active" | "Completed";
export type SettlementStatus = "Ready" | "Settled" | "Pending" | "Approved" | "Paid";
export type WithdrawalStatus = "Pending" | "Approved" | "Rejected";
export type WithdrawalType = "Player" | "Owner";

export type Player = {
  id: string;
  name: string;
  username?: string;
  avatar?: string | null;
  banner?: string | null;
  bio?: string | null;
  email?: string;
  role?: string;
  membership?: string;
  favoriteGames?: string[];
  favoriteZones?: string[];
  xp?: number;
  level?: number;
  onlineStatus?: string;
  balance: number;
  spicaBalance?: number;
};

export type GamingPc = {
  id: string;
  name: string;
  type: PcType;
  category?: PcCategory;
  ratePerHour: number;
  sessionId: string | null;
  status?: "available" | "in_use" | "offline";
  maintenanceMode?: boolean;
  lastHeartbeat?: number;
  ipAddress?: string;
  machineName?: string;
  activePlayerName?: string;
  activeSessionStartTime?: number;
  activeSessionDurationSeconds?: number;
  heartbeatRemainingSeconds?: number;
  recoveryWarning?: string;
};

export type RealtimeDebugState = {
  connectedSockets: number;
  dashboardSockets: number;
  connectedPcIds: string[];
  reconnectEvents: Record<string, number>;
  activeSessions: Record<string, string>;
  heartbeats: Record<string, string>;
  commandLogs: string[];
  generatedAt?: string;
};

export type Zone = {
  id: string;
  name: string;
  city: string;
  status: ZoneStatus;
  owner?: {
    id: string;
    name: string;
    email: string;
  };
  pricing?: {
    pcCount?: number;
    rentPerHour?: number;
    currentPricingModel?: string;
    listingRequestId?: string;
    phone?: string;
    submittedMessage?: string;
    [key: string]: unknown;
  };
  branding?: {
    logoUrl?: string;
    bannerUrl?: string;
    [key: string]: unknown;
  };
  pcs: GamingPc[];
};

export type Session = {
  id: string;
  playerId: string;
  playerName: string;
  zoneId: string;
  zoneName: string;
  pcId: string;
  pcName: string;
  pcType: PcType;
  startTime: number;
  durationSeconds: number;
  ratePerHour: number;
  grossSpica: number;
  status: SessionStatus;
  endedAt?: number;
};

export type Settlement = {
  id: string;
  transactionId: string;
  player: string;
  zoneId: string;
  zone: string;
  pc: string;
  durationMinutes: number;
  grossSpica: number;
  ezzstarFee: number;
  zoneNetAmount: number;
  status: SettlementStatus;
};

export type Withdrawal = {
  id: string;
  userId: string;
  userName: string;
  type: WithdrawalType;
  amount: number;
  fee: number;
  netAmount: number;
  status: WithdrawalStatus;
};

export type Transaction = {
  id: string;
  type: "credit_purchase" | "session_charge" | "time_extension";
  actorId: string;
  actorName: string;
  amount: number;
  createdAt: number;
};

export type ActivityItem = {
  id: string;
  label: string;
  detail: string;
  createdAt: number;
};

export type SpicaMockState = {
  currentUser: Player | null;
  zones: Zone[];
  players: Player[];
  sessions: Session[];
  transactions: Transaction[];
  settlements: Settlement[];
  withdrawals: Withdrawal[];
  activity: ActivityItem[];
  creditsSold: number;
  debug: RealtimeDebugState;
};

export function createEmptySpicaState(): SpicaMockState {
  return {
    currentUser: null,
    zones: [],
    players: [],
    sessions: [],
    transactions: [],
    settlements: [],
    withdrawals: [],
    activity: [],
    creditsSold: 0,
    debug: {
      connectedSockets: 0,
      dashboardSockets: 0,
      connectedPcIds: [],
      reconnectEvents: {},
      activeSessions: {},
      heartbeats: {},
      commandLogs: []
    }
  };
}

export function calculateCommission(amount: number): number {
  return Math.round(amount * 0.1);
}

export function calculateWithdrawalFee(amount: number): number {
  return Math.round(amount * 0.03);
}

export function calculateSessionCost(ratePerHour: number, durationMinutes: number): number {
  return Math.ceil((ratePerHour / 60) * durationMinutes);
}

export function spicaToPkr(spica: number): number {
  return spica * 10;
}

export function formatSpica(amount: number): string {
  return `${amount.toLocaleString()} SPICA`;
}

export function formatPkr(amount: number): string {
  return `PKR ${amount.toLocaleString()}`;
}
