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
  membership?: string;
  favoriteGames?: string[];
  favoriteZones?: string[];
  xp?: number;
  level?: number;
  onlineStatus?: string;
  balance: number;
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

export function createMockZones(): Zone[] {
  return [
    {
      id: "zone-a",
      name: "Galaxy Gaming Arena",
      city: "Lahore",
      status: "Active",
      pcs: [
        {
          id: "pc-01",
          name: "PC-01",
          type: "Standard",
          category: "standard",
          ratePerHour: 100,
          sessionId: null,
          status: "offline"
        }
      ]
    }
  ];
}

export function createMockPlayers(): Player[] {
  return [
    {
      id: "player-1",
      name: "Ayan Malik",
      username: "ayan",
      avatar: "/avatars/player.svg",
      banner: "/banners/nebula.svg",
      bio: "Cross-zone SPICA player. FPS nights, racing weekends.",
      email: "player@spica.local",
      membership: "Founding Player",
      favoriteGames: ["Valorant", "Tekken 8", "Forza Horizon"],
      favoriteZones: ["zone-a"],
      xp: 450,
      level: 2,
      onlineStatus: "online",
      balance: 10000
    }
  ];
}

export function createMockSpicaState(): SpicaMockState {
  const now = Date.now();
  const zones = createMockZones();
  const players = createMockPlayers();

  const activeSessions: Session[] = [];

  const hydratedZones = zones.map((zone) => ({
    ...zone,
    pcs: zone.pcs.map((pc) => {
      const session = activeSessions.find((item) => item.zoneId === zone.id && item.pcId === pc.id);
      return session ? { ...pc, sessionId: session.id } : pc;
    })
  }));

  const settlements: Settlement[] = [];

  return {
    zones: hydratedZones,
    players,
    sessions: activeSessions,
    transactions: [
      {
        id: "TRX-7001",
        type: "credit_purchase",
        actorId: "player-1",
        actorName: "Ayan Malik",
        amount: 10000,
        createdAt: now - 90 * 60 * 1000
      }
    ],
    settlements,
    withdrawals: [],
    activity: [
      {
        id: "ACT-5001",
        label: "Demo ready",
        detail: "PC-01 is waiting for the Electron client heartbeat.",
        createdAt: now
      }
    ],
    creditsSold: 10000,
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
