"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import {
  ActivityItem,
  GamingPc,
  Session,
  Settlement,
  SpicaMockState,
  Transaction,
  Withdrawal,
  WithdrawalType,
  Zone,
  calculateCommission,
  calculateSessionCost,
  calculateWithdrawalFee,
  createMockSpicaState
} from "@/lib/spica";

type ActorType = WithdrawalType;

type AppStoreValue = SpicaMockState & {
  pcs: GamingPc[];
  serverTimeOffsetMs: number;
  buySpica: (playerId: string, amount: number) => void;
  startSession: (playerId: string, zoneId: string, pcId: string, durationMinutes: number) => boolean;
  addTime: (sessionId: string, extraMinutes: number) => boolean;
  endSession: (sessionId: string) => void;
  createSettlement: (session: Session) => Settlement;
  requestWithdrawal: (actorId: string, actorType: ActorType, amount: number) => void;
  approveWithdrawal: (withdrawalId: string) => void;
  rejectWithdrawal: (withdrawalId: string) => void;
  approveSettlement: (settlementId: string) => void;
  refreshBackendDashboard: () => Promise<void>;
};

const AppStoreContext = createContext<AppStoreValue | null>(null);
const PUBLIC_AUTH_PATHS = ["/login", "/signup", "/forgot-password", "/list-your-zone"];

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function createActivity(label: string, detail: string, createdAt = Date.now()): ActivityItem {
  return {
    id: makeId("ACT"),
    label,
    detail,
    createdAt
  };
}

function createTransaction(type: Transaction["type"], actorId: string, actorName: string, amount: number): Transaction {
  return {
    id: makeId("TRX"),
    type,
    actorId,
    actorName,
    amount,
    createdAt: Date.now()
  };
}

function buildSettlement(session: Session): Settlement {
  const ezzstarFee = calculateCommission(session.grossSpica);
  const zoneNetAmount = session.grossSpica - ezzstarFee;

  return {
    id: makeId("SET"),
    transactionId: `TX-${Math.floor(Date.now() / 1000)}-${session.pcName}`,
    player: session.playerName,
    zoneId: session.zoneId,
    zone: session.zoneName,
    pc: session.pcName,
    durationMinutes: Math.round(session.durationSeconds / 60),
    grossSpica: session.grossSpica,
    ezzstarFee,
    zoneNetAmount,
    status: "Ready"
  };
}

function resolveActorName(state: SpicaMockState, actorId: string, actorType: ActorType): string {
  if (actorType === "Player") {
    return state.players.find((player) => player.id === actorId)?.name ?? "Player";
  }

  return state.zones.find((zone) => actorId.includes(zone.id))?.name ?? state.zones[0]?.name ?? "Zone Owner";
}

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SpicaMockState>(() => createMockSpicaState());
  const [serverTimeOffsetMs, setServerTimeOffsetMs] = useState(0);

  const refreshBackendDashboard = useCallback(async () => {
      if (typeof window !== "undefined" && PUBLIC_AUTH_PATHS.includes(window.location.pathname)) {
        return;
      }

      try {
        const response = await fetch("/api/dashboard", { credentials: "include" });

        if (!response.ok) {
          return;
        }

        const payload = await response.json();
        setServerTimeOffsetMs(payload.serverTime ? new Date(payload.serverTime).getTime() - Date.now() : 0);

        setState((current) => {
          const sessions = payload.sessions.map((session: any) => ({
            id: session.id,
            playerId: session.playerId,
            playerName: session.player?.name ?? "Player",
            zoneId: session.zoneId,
            zoneName: session.zone?.name ?? "Zone",
            pcId: session.pcId,
            pcName: session.pc?.name ?? "PC",
            pcType: session.pc?.name?.endsWith("07") || session.pc?.name?.endsWith("08") ? "Premium" : "Standard",
            startTime: new Date(session.startTime).getTime(),
            durationSeconds: session.durationSeconds,
            ratePerHour: session.pc?.name?.endsWith("07") || session.pc?.name?.endsWith("08") ? 150 : 100,
            grossSpica: session.gross,
            status: session.status === "active" ? "Active" : "Completed",
            endedAt: session.completedAt ? new Date(session.completedAt).getTime() : undefined
          }));

          return {
            ...current,
            players: payload.users
              .filter((user: any) => user.role === "player")
              .map((user: any) => ({
                id: user.id,
                name: user.name,
                username: user.username,
                avatar: user.avatar,
                banner: user.banner,
                bio: user.bio,
                email: user.email,
                membership: user.membership,
                favoriteGames: user.favoriteGames,
                favoriteZones: user.favoriteZones,
                xp: user.xp,
                level: user.level,
                onlineStatus: user.onlineStatus,
                balance: user.spica_balance
              })),
            zones: payload.zones.map((zone: any) => ({
              id: zone.id,
              name: zone.name,
              city: zone.city,
              status: zone.status === "active" ? "Active" : zone.status === "suspended" || zone.status === "rejected" ? "Suspended" : "Pending",
              pcs: zone.pcs.map((pc: any) => ({
                ...(() => {
                  const activeSession = sessions.find((session: any) => session.pcId === pc.id && session.status === "Active");
                  return {
                    sessionId: activeSession?.id ?? null,
                    activePlayerName: activeSession?.playerName,
                    activeSessionStartTime: activeSession?.startTime,
                    activeSessionDurationSeconds: activeSession?.durationSeconds
                  };
                })(),
                id: pc.id,
                name: pc.name,
                type: pc.name?.endsWith("07") || pc.name?.endsWith("08") ? "Premium" : "Standard",
                category: pc.category ?? "standard",
                ratePerHour: pc.ratePerHour ?? (pc.name?.endsWith("07") || pc.name?.endsWith("08") ? 150 : 100),
                status: pc.status,
                maintenanceMode: pc.maintenanceMode,
                lastHeartbeat: pc.lastHeartbeat ? new Date(pc.lastHeartbeat).getTime() : undefined,
                ipAddress: pc.ipAddress ?? undefined,
                machineName: pc.machineName ?? undefined
              }))
            })),
            sessions,
            transactions: payload.transactions.map((transaction: any) => ({
              id: transaction.id,
              type:
                transaction.type === "buy"
                  ? "credit_purchase"
                  : transaction.type === "spend"
                    ? "session_charge"
                    : transaction.type === "reward"
                      ? "time_extension"
                      : "credit_purchase",
              actorId: transaction.userId,
              actorName: payload.users.find((user: any) => user.id === transaction.userId)?.name ?? "User",
              amount: transaction.amount,
              createdAt: new Date(transaction.createdAt).getTime()
            })),
            settlements: payload.settlements.map((settlement: any) => ({
              id: settlement.id,
              transactionId: settlement.sessionId ?? settlement.id,
              player: settlement.session?.player?.name ?? "Backend session",
              zoneId: settlement.zoneId,
              zone: settlement.zone?.name ?? "Zone",
              pc: settlement.session?.pc?.name ?? "PC",
              durationMinutes: settlement.session ? Math.round(settlement.session.durationSeconds / 60) : 0,
              grossSpica: settlement.gross,
              ezzstarFee: settlement.commission,
              zoneNetAmount: settlement.net,
              status: settlement.status === "approved" ? "Approved" : settlement.status === "paid" ? "Paid" : "Pending"
            })),
            withdrawals: payload.withdrawals.map((withdrawal: any) => ({
              id: withdrawal.id,
              userId: withdrawal.userId,
              userName: withdrawal.user?.name ?? "User",
              type: withdrawal.user?.role === "zone_owner" ? "Owner" : "Player",
              amount: withdrawal.amount,
              fee: withdrawal.fee,
              netAmount: withdrawal.amount - withdrawal.fee,
              status: withdrawal.status === "approved" ? "Approved" : withdrawal.status === "rejected" ? "Rejected" : "Pending"
            })),
            creditsSold: payload.analytics.creditsSold,
            debug: current.debug,
            activity: [
              createActivity("Backend synced", "Dashboards hydrated from PostgreSQL via /api/dashboard."),
              ...current.activity
            ]
          };
        });
      } catch {
        // Keep frontend mock data available when Postgres is not running.
      }
  }, []);

  useEffect(() => {
    refreshBackendDashboard();
  }, [refreshBackendDashboard]);

  useEffect(() => {
    if (PUBLIC_AUTH_PATHS.includes(window.location.pathname)) {
      return;
    }

    const configuredRealtimeUrl = process.env.NEXT_PUBLIC_REALTIME_URL;

    if (!configuredRealtimeUrl) {
      return;
    }

    const realtimeUrl =
      window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
        ? "http://localhost:4001"
        : configuredRealtimeUrl;

    const socket = io(realtimeUrl, {
      auth: { clientType: "dashboard" },
      transports: ["websocket", "polling"],
      reconnection: true
    });

    socket.on("connect", () => {
      console.log(`Dashboard realtime connected: ${realtimeUrl}`);
    });

    socket.on("connect_error", (error) => {
      console.warn(`Dashboard realtime connection failed: ${realtimeUrl}`, error.message);
    });

    function applyPcUpdate(payload: { pcId: string; zoneId: string; lastSeen?: string; status?: "available" | "in_use" | "offline"; activeSessionId?: string | null; remainingSeconds?: number; ipAddress?: string; machineName?: string; warning?: string; serverTime?: string }) {
      if (payload.serverTime) {
        setServerTimeOffsetMs(new Date(payload.serverTime).getTime() - Date.now());
      }

      setState((current) => ({
        ...current,
        zones: current.zones.map((zone) =>
          zone.id === payload.zoneId
            ? {
                ...zone,
                pcs: zone.pcs.map((pc) =>
                  pc.id === payload.pcId
                    ? {
                        ...pc,
                        status: payload.status ?? pc.status,
                        sessionId: payload.activeSessionId === null ? null : payload.activeSessionId ?? pc.sessionId,
                        lastHeartbeat: payload.lastSeen ? new Date(payload.lastSeen).getTime() : pc.lastHeartbeat,
                        heartbeatRemainingSeconds: payload.remainingSeconds,
                        ipAddress: payload.ipAddress ?? pc.ipAddress,
                        machineName: payload.machineName ?? pc.machineName,
                        recoveryWarning: payload.warning
                      }
                    : pc
                )
              }
            : zone
        ),
        activity: payload.status
          ? [createActivity("PC status updated", `${payload.pcId} is now ${payload.status}.`), ...current.activity]
          : current.activity
      }));
    }

    socket.on("pc:update", applyPcUpdate);

    socket.on("pc:status", (payload: { pcId: string; zoneId: string; status: "available" | "in_use" | "offline"; serverTime?: string }) => {
      applyPcUpdate(payload);
    });

    socket.on("pc:heartbeat", (payload: { pcId: string; zoneId: string; lastSeen: string; status?: "available" | "in_use" | "offline"; activeSessionId?: string; remainingSeconds?: number; ipAddress?: string; machineName?: string }) => {
      applyPcUpdate(payload);
    });

    socket.on("session:update", (payload: { pcId: string; command: string; payload?: { sessionId?: string } }) => {
      setState((current) => ({
        ...current,
        zones: current.zones.map((zone) => ({
          ...zone,
          pcs: zone.pcs.map((pc) =>
            pc.id === payload.pcId
              ? {
                  ...pc,
                  sessionId:
                    payload.command === "command:start-session"
                      ? payload.payload?.sessionId ?? pc.sessionId
                      : payload.command === "command:end-session" || payload.command === "command:lock"
                        ? null
                        : pc.sessionId,
                  status:
                    payload.command === "command:start-session"
                      ? "in_use"
                      : payload.command === "command:end-session" || payload.command === "command:lock"
                        ? "available"
                        : pc.status
                }
              : pc
          )
        })),
        activity: [createActivity("Session update", `${payload.command} sent to ${payload.pcId}.`), ...current.activity]
      }));
    });

    socket.on("session:ended", (payload: { sessionId: string; pcId: string; zoneId: string; reason?: string }) => {
      setState((current) => ({
        ...current,
        sessions: current.sessions.map((session) =>
          session.id === payload.sessionId ? { ...session, status: "Completed", endedAt: Date.now() } : session
        ),
        zones: current.zones.map((zone) =>
          zone.id === payload.zoneId
            ? {
                ...zone,
                pcs: zone.pcs.map((pc) => (pc.id === payload.pcId ? { ...pc, status: "available", sessionId: null, heartbeatRemainingSeconds: 0 } : pc))
              }
            : zone
        ),
        activity: [createActivity("Session ended", `${payload.sessionId} ended${payload.reason ? ` (${payload.reason})` : ""}.`), ...current.activity]
      }));
    });

    socket.on("pc:offline", (payload: { pcId: string; zoneId: string; activeSessionId?: string; warning?: string }) => {
      applyPcUpdate({
        pcId: payload.pcId,
        zoneId: payload.zoneId,
        status: "offline",
        activeSessionId: payload.activeSessionId,
        warning: payload.warning
      });
    });

    socket.on("pc:pairing-request", (payload: { id: string; machineName: string; ipAddress?: string; status: string }) => {
      setState((current) => ({
        ...current,
        activity: [
          createActivity("PC pairing request", `${payload.machineName} is requesting Zone Host approval${payload.ipAddress ? ` from ${payload.ipAddress}` : ""}.`),
          ...current.activity
        ]
      }));
    });

    socket.on("pc:manual-override", (payload: { pcId: string; zoneId: string; reason?: string; machineName?: string }) => {
      setState((current) => ({
        ...current,
        activity: [
          createActivity("PC manually unlocked", `${payload.pcId} reported emergency override${payload.reason ? `: ${payload.reason}` : "."}`),
          ...current.activity
        ]
      }));
    });

    socket.on("debug:update", (payload: SpicaMockState["debug"]) => {
      setState((current) => ({ ...current, debug: payload }));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  function createSettlement(session: Session): Settlement {
    return buildSettlement(session);
  }

  function buySpica(playerId: string, amount: number) {
    setState((current) => {
      const player = current.players.find((item) => item.id === playerId);

      if (!player || amount <= 0) {
        return current;
      }

      return {
        ...current,
        players: current.players.map((item) => (item.id === playerId ? { ...item, balance: item.balance + amount } : item)),
        creditsSold: current.creditsSold + amount,
        transactions: [createTransaction("credit_purchase", player.id, player.name, amount), ...current.transactions],
        activity: [createActivity("Player bought SPICA", `${player.name} bought ${amount.toLocaleString()} SPICA credits.`), ...current.activity]
      };
    });
  }

  function startSession(playerId: string, zoneId: string, pcId: string, durationMinutes: number): boolean {
    let started = false;

    setState((current) => {
      const zone = current.zones.find((item) => item.id === zoneId);
      const pc = zone?.pcs.find((item) => item.id === pcId);
      const player = current.players.find((item) => item.id === playerId);

      if (!zone || !pc || !player || pc.sessionId || durationMinutes <= 0) {
        return current;
      }

      const grossSpica = calculateSessionCost(pc.ratePerHour, durationMinutes);

      if (player.balance < grossSpica) {
        return current;
      }

      const session: Session = {
        id: makeId("SES"),
        playerId,
        playerName: player.name,
        zoneId,
        zoneName: zone.name,
        pcId,
        pcName: pc.name,
        pcType: pc.type,
        startTime: Date.now(),
        durationSeconds: durationMinutes * 60,
        ratePerHour: pc.ratePerHour,
        grossSpica,
        status: "Active"
      };

      started = true;

      return {
        ...current,
        players: current.players.map((item) => (item.id === playerId ? { ...item, balance: item.balance - grossSpica } : item)),
        zones: current.zones.map((item) =>
          item.id === zoneId
            ? {
                ...item,
                pcs: item.pcs.map((zonePc) => (zonePc.id === pcId ? { ...zonePc, sessionId: session.id } : zonePc))
              }
            : item
        ),
        sessions: [session, ...current.sessions],
        transactions: [createTransaction("session_charge", player.id, player.name, grossSpica), ...current.transactions],
        activity: [
          createActivity("Session started", `${player.name} started ${pc.name} at ${zone.name} for ${grossSpica.toLocaleString()} SPICA.`),
          ...current.activity
        ]
      };
    });

    return started;
  }

  function addTime(sessionId: string, extraMinutes: number): boolean {
    let added = false;

    setState((current) => {
      const session = current.sessions.find((item) => item.id === sessionId && item.status === "Active");
      const player = session ? current.players.find((item) => item.id === session.playerId) : null;

      if (!session || !player || extraMinutes <= 0) {
        return current;
      }

      const extraCost = calculateSessionCost(session.ratePerHour, extraMinutes);

      if (player.balance < extraCost) {
        return current;
      }

      added = true;

      return {
        ...current,
        players: current.players.map((item) => (item.id === player.id ? { ...item, balance: item.balance - extraCost } : item)),
        sessions: current.sessions.map((item) =>
          item.id === sessionId ? { ...item, durationSeconds: item.durationSeconds + extraMinutes * 60, grossSpica: item.grossSpica + extraCost } : item
        ),
        transactions: [createTransaction("time_extension", player.id, player.name, extraCost), ...current.transactions],
        activity: [
          createActivity("Session time added", `${player.name} added ${extraMinutes} minutes to ${session.pcName} for ${extraCost.toLocaleString()} SPICA.`),
          ...current.activity
        ]
      };
    });

    return added;
  }

  function endSession(sessionId: string) {
    setState((current) => {
      const target = current.sessions.find((session) => session.id === sessionId && session.status === "Active");

      if (!target) {
        return current;
      }

      const settlement = buildSettlement(target);

      return {
        ...current,
        sessions: current.sessions.map((session) => (session.id === sessionId ? { ...session, status: "Completed", endedAt: Date.now() } : session)),
        zones: current.zones.map((zone) =>
          zone.id === target.zoneId
            ? {
                ...zone,
                pcs: zone.pcs.map((pc) => (pc.id === target.pcId ? { ...pc, sessionId: null } : pc))
              }
            : zone
        ),
        settlements: [settlement, ...current.settlements],
        activity: [
          createActivity("Session ended", `${target.playerName} ended ${target.pcName} at ${target.zoneName}.`),
          createActivity("Settlement created", `${target.zoneName} earned ${settlement.zoneNetAmount.toLocaleString()} SPICA net.`),
          ...current.activity
        ]
      };
    });
  }

  function requestWithdrawal(actorId: string, actorType: ActorType, amount: number) {
    setState((current) => {
      if (amount <= 0) {
        return current;
      }

      const actorName = resolveActorName(current, actorId, actorType);
      const fee = calculateWithdrawalFee(amount);
      const withdrawal: Withdrawal = {
        id: makeId("WD"),
        userId: actorId,
        userName: actorName,
        type: actorType,
        amount,
        fee,
        netAmount: amount - fee,
        status: "Pending"
      };

      return {
        ...current,
        withdrawals: [withdrawal, ...current.withdrawals],
        activity: [
          createActivity("Withdrawal requested", `${actorName} requested ${amount.toLocaleString()} SPICA payout. Net ${withdrawal.netAmount.toLocaleString()} SPICA after fee.`),
          ...current.activity
        ]
      };
    });
  }

  function approveWithdrawal(withdrawalId: string) {
    setState((current) => {
      const withdrawal = current.withdrawals.find((item) => item.id === withdrawalId);

      return {
        ...current,
        withdrawals: current.withdrawals.map((item) => (item.id === withdrawalId ? { ...item, status: "Approved" } : item)),
        activity: withdrawal
          ? [createActivity("Withdrawal approved", `${withdrawal.userName} withdrawal ${withdrawal.id} was approved.`), ...current.activity]
          : current.activity
      };
    });
  }

  function rejectWithdrawal(withdrawalId: string) {
    setState((current) => {
      const withdrawal = current.withdrawals.find((item) => item.id === withdrawalId);

      return {
        ...current,
        withdrawals: current.withdrawals.map((item) => (item.id === withdrawalId ? { ...item, status: "Rejected" } : item)),
        activity: withdrawal
          ? [createActivity("Withdrawal rejected", `${withdrawal.userName} withdrawal ${withdrawal.id} was rejected.`), ...current.activity]
          : current.activity
      };
    });
  }

  function approveSettlement(settlementId: string) {
    setState((current) => ({
      ...current,
      settlements: current.settlements.map((settlement) => (settlement.id === settlementId ? { ...settlement, status: "Settled" } : settlement)),
      activity: [createActivity("Settlement approved", `Settlement ${settlementId} was marked as settled.`), ...current.activity]
    }));
  }

  const pcs = useMemo(() => state.zones.flatMap((zone) => zone.pcs), [state.zones]);

  const value: AppStoreValue = {
    ...state,
    pcs,
    serverTimeOffsetMs,
    buySpica,
    startSession,
    addTime,
    endSession,
    createSettlement,
    requestWithdrawal,
    approveWithdrawal,
    rejectWithdrawal,
    approveSettlement,
    refreshBackendDashboard
  };

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}

export function useAppStore() {
  const context = useContext(AppStoreContext);

  if (!context) {
    throw new Error("useAppStore must be used inside AppStoreProvider");
  }

  return context;
}
