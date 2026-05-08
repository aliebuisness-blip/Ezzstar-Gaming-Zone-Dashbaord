"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, Banknote, BarChart3, Coins, Landmark, Monitor, ShieldCheck, Sparkles, Timer, Trophy, Users, WalletCards } from "lucide-react";
import { PCCard } from "@/components/PCCard";
import { NotificationCenter } from "@/components/NotificationCenter";
import { RoleNavKey, RoleSidebar } from "@/components/RoleSidebar";
import { PairingRequestsPanel } from "@/components/PairingRequestsPanel";
import { SessionModal } from "@/components/SessionModal";
import { SettlementTable } from "@/components/SettlementTable";
import { StatCard } from "@/components/StatCard";
import { SystemActivityFeed } from "@/components/SystemActivityFeed";
import { Topbar } from "@/components/Topbar";
import { WalletCard } from "@/components/WalletCard";
import { WithdrawalTable } from "@/components/WithdrawalTable";
import { ZoneCard } from "@/components/ZoneCard";
import { LoadingState } from "@/components/ui/LoadingState";
import { formatTime, getRemainingTime } from "@/lib/timer";
import { useAppStore } from "@/context/AppStore";
import {
  DashboardRole,
  GamingPc,
  Session,
  WithdrawalType,
  Zone,
  formatPkr,
  formatSpica,
  spicaToPkr
} from "@/lib/spica";

const defaultView: Record<DashboardRole, RoleNavKey> = {
  player: "Home",
  zone: "Home",
  admin: "Home"
};

const roleTitle: Record<DashboardRole, string> = {
  player: "Player Dashboard",
  zone: "Zone Owner Dashboard",
  admin: "Ezzstar Admin Dashboard"
};

const roleEyebrow: Record<DashboardRole, string> = {
  player: "Player Network",
  zone: "Zone Operator Console",
  admin: "Ezzstar Command Center"
};

type SpicaDashboardProps = {
  role: DashboardRole;
  initialView?: RoleNavKey;
};

export function SpicaDashboard({ role, initialView }: SpicaDashboardProps) {
  const [hydrated, setHydrated] = useState(false);
  const [activeView, setActiveView] = useState<RoleNavKey>(initialView ?? defaultView[role]);
  const {
    activity,
    addTime,
    approveSettlement,
    approveWithdrawal,
    buySpica,
    creditsSold,
    debug,
    endSession,
    players,
    rejectWithdrawal,
    requestWithdrawal,
    refreshBackendDashboard,
    serverTimeOffsetMs,
    sessions,
    settlements,
    startSession,
    withdrawals,
    zones
  } = useAppStore();
  const [selectedZoneId, setSelectedZoneId] = useState("zone-a");
  const [selectedPlayerId, setSelectedPlayerId] = useState("player-1");
  const [selectedPc, setSelectedPc] = useState<GamingPc | null>(null);
  const [testSessionId, setTestSessionId] = useState<string | null>(null);
  const [testPanelMessage, setTestPanelMessage] = useState<string | null>(null);
  const [showOfflinePcs, setShowOfflinePcs] = useState(false);
  const [newPcName, setNewPcName] = useState("PC-02");
  const [newPcRate, setNewPcRate] = useState(100);
  const [newPcCategory, setNewPcCategory] = useState<"standard" | "premium" | "vip">("standard");
  const [setupConfig, setSetupConfig] = useState<string | null>(null);
  const [setupCommand, setSetupCommand] = useState<string | null>(null);
  const [sessionSearch, setSessionSearch] = useState("");
  const [popupMessage, setPopupMessage] = useState("Welcome to SPICA Arena");
  const [managerName, setManagerName] = useState("Floor Manager");
  const [managerEmail, setManagerEmail] = useState("manager@spica.local");
  const [managerUsername, setManagerUsername] = useState("floor-manager");
  const [managerPassword, setManagerPassword] = useState("password123");
  const [adminSearch, setAdminSearch] = useState("");
  const [cleanupInFlight, setCleanupInFlight] = useState(false);
  const [now, setNow] = useState(Date.now());
  const serverNow = now + serverTimeOffsetMs;

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    setActiveView(initialView ?? defaultView[role]);
  }, [initialView, role]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const hasExpiredActiveSession = sessions.some(
      (session) => session.status === "Active" && getRemainingTime(session.startTime, session.durationSeconds, serverNow) === 0
    );

    if (hasExpiredActiveSession && !cleanupInFlight) {
      cleanupExpiredSessions();
    }
  }, [serverNow, sessions, cleanupInFlight]);

  const selectedZone = zones.find((zone) => zone.id === selectedZoneId) ?? zones[0];
  const selectedPlayer = players.find((player) => player.id === selectedPlayerId) ?? players[0];
  const ownerZone = zones.find((zone) => zone.id === "zone-a") ?? zones[0];
  const activeZones = zones.filter((zone) => zone.status === "Active").length;
  const activeSessions = sessions.filter((session) => session.status === "Active");
  const playerSessions = sessions.filter((session) => session.playerId === selectedPlayer.id);
  const playerActiveSession = playerSessions.find((session) => session.status === "Active");
  const ownerSessions = sessions.filter((session) => session.zoneId === ownerZone.id);
  const ownerSettlements = settlements.filter((settlement) => settlement.zoneId === ownerZone.id);
  const ownerGross = ownerSettlements.reduce((sum, item) => sum + item.grossSpica, 0) + ownerSessions.reduce((sum, item) => sum + item.grossSpica, 0);
  const ownerCompletedSessions = ownerSessions.filter((session) => session.status === "Completed");
  const ownerHours = ownerSessions.reduce((sum, session) => sum + session.durationSeconds / 3600, 0);
  const ownerTopPlayers = [...ownerSessions.reduce<Map<string, { name: string; spend: number; sessions: number }>>((map, session) => {
    const current = map.get(session.playerId) ?? { name: session.playerName, spend: 0, sessions: 0 };
    map.set(session.playerId, { ...current, spend: current.spend + session.grossSpica, sessions: current.sessions + 1 });
    return map;
  }, new Map()).values()].sort((a, b) => b.spend - a.spend).slice(0, 4);
  const mostUsedPcs = [...ownerSessions.reduce<Map<string, { pcName: string; sessions: number; hours: number }>>((map, session) => {
    const current = map.get(session.pcId) ?? { pcName: session.pcName, sessions: 0, hours: 0 };
    map.set(session.pcId, { ...current, sessions: current.sessions + 1, hours: current.hours + session.durationSeconds / 3600 });
    return map;
  }, new Map()).values()].sort((a, b) => b.sessions - a.sessions).slice(0, 4);
  const totalSpent = sessions.reduce((sum, session) => sum + session.grossSpica, 0) + settlements.reduce((sum, settlement) => sum + settlement.grossSpica, 0);
  const commissionEarned = settlements.reduce((sum, settlement) => sum + settlement.ezzstarFee, 0);
  const pendingWithdrawals = withdrawals.filter((withdrawal) => withdrawal.status === "Pending").reduce((sum, withdrawal) => sum + withdrawal.amount, 0);
  const pendingSettlements = settlements.filter((settlement) => settlement.status === "Pending" || settlement.status === "Ready");
  const playerVisibleZones = zones.filter((zone) => zone.status === "Active");
  const playerCompletedSessions = playerSessions.filter((session) => session.status === "Completed");
  const playerHours = playerSessions.reduce((sum, session) => sum + session.durationSeconds / 3600, 0);
  const playerSpent = playerSessions.reduce((sum, session) => sum + session.grossSpica, 0);
  const playerLevel = selectedPlayer.level ?? 1;
  const playerXp = selectedPlayer.xp ?? 0;
  const nextLevelXp = playerLevel * playerLevel * 250;
  const playerAchievements = [
    { name: "First Session", detail: "Started your first SPICA session", unlocked: playerSessions.length > 0 },
    { name: "10 Hours Played", detail: `${playerHours.toFixed(1)} / 10 hours`, unlocked: playerHours >= 10 },
    { name: "Night Grinder", detail: "Play after midnight", unlocked: playerSessions.some((session) => new Date(session.startTime).getHours() < 5) },
    { name: "VIP Player", detail: "Play on a VIP PC", unlocked: playerSessions.some((session) => session.ratePerHour >= 200) },
    { name: "Top Spender", detail: `${formatSpica(playerSpent)} spent`, unlocked: playerSpent >= 5000 },
    { name: "Zone Explorer", detail: "Play across multiple zones", unlocked: new Set(playerSessions.map((session) => session.zoneId)).size > 1 }
  ];

  const remainingBySession = useMemo(() => {
    return sessions.reduce<Record<string, number>>((acc, session) => {
      acc[session.id] = session.status === "Active" ? getRemainingTime(session.startTime, session.durationSeconds, serverNow) : 0;
      return acc;
    }, {});
  }, [sessions, serverNow]);

  function handleRequestWithdrawal(userId: string, amount: number, type: WithdrawalType) {
    const actorId = type === "Owner" ? `owner-${ownerZone.id}` : userId;
    requestWithdrawal(actorId, type, amount);
  }

  async function postJson<T>(url: string, body: unknown): Promise<T | null | undefined> {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body)
      });

      const rawText = await response.text();
      let payload: any = null;

      try {
        payload = rawText ? JSON.parse(rawText) : null;
      } catch {
        const isHtmlError = rawText.trim().startsWith("<!DOCTYPE") || rawText.trim().startsWith("<html");

        if (isHtmlError) {
          console.error(`${url} returned HTML error page`, rawText);
          payload = { error: "Server returned an HTML error page. Check the Next.js terminal for the real stack trace." };
        } else {
          payload = { error: rawText || "Request failed" };
        }
      }
      console.log(`${url} response status`, response.status);
      console.log(`${url} response body`, payload ?? rawText);

      if (!response.ok) {
        setTestPanelMessage(payload?.error ?? "Request failed.");
        window.alert(payload?.error ?? "Request failed.");
        return null;
      }

      setTestPanelMessage(null);
      return payload as T;
    } catch {
      console.error(`${url} request failed`, body);
      setTestPanelMessage("Backend API unavailable. Local mock state is still visible.");
      window.alert("Backend API unavailable. Check the browser console and Next.js terminal.");
      return undefined;
    }
  }

  function getPcDisplayStatus(pc: GamingPc): "Online" | "Offline" | "In Use" {
    if (pc.sessionId || pc.status === "in_use") {
      return "In Use";
    }

    if (pc.status === "offline") {
      return "Offline";
    }

    return "Online";
  }

  function formatHeartbeat(lastHeartbeat?: number) {
    if (!lastHeartbeat) {
      return "No heartbeat yet";
    }

    return new Intl.DateTimeFormat("en", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    }).format(lastHeartbeat);
  }

  async function startTestSession(pc: GamingPc) {
    await startDashboardSession(selectedPlayer.id, ownerZone.id, pc.id, 5);
  }

  async function startDashboardSession(playerId: string, zoneId: string, pcId: string, durationMinutes: number) {
    const result = await postJson<{ session?: { id: string } }>("/api/start-session", {
      playerId,
      zoneId,
      pcId,
      durationMinutes
    });

    if (result?.session?.id) {
      setTestSessionId(result.session.id);
      await refreshBackendDashboard();
      return;
    }

    if (result === undefined && startSession(playerId, zoneId, pcId, durationMinutes)) {
      setTestSessionId(null);
    }
  }

  async function addDashboardTime(sessionId: string, extraMinutes: number) {
    const result = await postJson<{ session?: { id: string } }>("/api/add-time", {
      sessionId,
      extraMinutes
    });

    if (result?.session?.id) {
      setTestSessionId(result.session.id);
      await refreshBackendDashboard();
      return;
    }

    if (result === undefined) {
      addTime(sessionId, extraMinutes);
    }
  }

  async function endDashboardSession(sessionId: string) {
    const result = await postJson<{ session?: { id: string } }>("/api/end-session", { sessionId });

    if (result?.session) {
      setTestSessionId(null);
      await refreshBackendDashboard();
      return;
    }

    if (result === undefined) {
      endSession(sessionId);
    }
  }

  async function cleanupExpiredSessions() {
    setCleanupInFlight(true);
    const result = await postJson<{ count: number }>("/api/sessions/cleanup", {});

    if (result) {
      setTestPanelMessage(`Cleaned up ${result.count} expired session${result.count === 1 ? "" : "s"}.`);
      await refreshBackendDashboard();
    }

    setCleanupInFlight(false);
  }

  async function registerPc() {
    const result = await postJson<{ setupConfig?: Record<string, string>; setupCommand?: string }>("/api/pcs", {
      name: newPcName,
      zoneId: ownerZone.id,
      ratePerHour: newPcRate,
      category: newPcCategory
    });

    if (result?.setupConfig) {
      const config = Object.entries(result.setupConfig)
        .map(([key, value]) => `${key}="${value}"`)
        .join("\n");
      setSetupConfig(config);
      setSetupCommand(result.setupCommand ?? null);
      await refreshBackendDashboard();
    }
  }

  async function updatePc(pcId: string, body: Record<string, unknown>) {
    const result = await postJson<{ pc?: GamingPc; setupConfig?: Record<string, string> }>(`/api/pcs/${pcId}`, body);

    if (result?.setupConfig) {
      setSetupConfig(Object.entries(result.setupConfig).map(([key, value]) => `${key}="${value}"`).join("\n"));
      setSetupCommand(`setx VITE_PC_ID "${pcId}" && setx VITE_PC_AUTH_TOKEN "${result.setupConfig.VITE_PC_AUTH_TOKEN}"`);
    }

    if (result) {
      await refreshBackendDashboard();
    }
  }

  async function removePc(pcId: string) {
    const response = await fetch(`/api/pcs/${pcId}`, { method: "DELETE", credentials: "include" });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({ error: "Failed to remove PC" }));
      setTestPanelMessage(payload.error ?? "Failed to remove PC");
      return;
    }

    await refreshBackendDashboard();
  }

  async function sendTestCommand() {
    const result = await postJson<{ ok?: boolean }>("/api/test-pc-command", {
      pcId: "pc-01",
      message: "Dashboard command test"
    });

    if (result?.ok) {
      setTestPanelMessage("Test command sent to PC-01.");
    }
  }

  async function sendPopupToPc(pcId: string) {
    const result = await postJson<{ ok?: boolean }>("/api/test-pc-command", {
      pcId,
      message: popupMessage
    });

    if (result?.ok) {
      setTestPanelMessage(`Popup sent to ${pcId}.`);
    }
  }

  async function createManager() {
    const result = await postJson<{ manager?: { id: string; name: string } }>("/api/staff", {
      name: managerName,
      username: managerUsername,
      email: managerEmail,
      password: managerPassword,
      zoneId: ownerZone.id
    });

    if (result?.manager) {
      setTestPanelMessage(`Manager ${result.manager.name} created.`);
    }
  }

  async function patchZoneStatus(zoneId: string, status: "active" | "pending" | "rejected" | "suspended") {
    const result = await postJson<{ zone?: unknown }>(`/api/zones/${zoneId}`, { status });

    if (result) {
      await refreshBackendDashboard();
    }
  }

  async function patchSettlementStatus(settlementId: string, status: "approved" | "paid", payoutMethod = "PKR") {
    const result = await postJson<{ settlement?: unknown }>(`/api/settlements/${settlementId}`, { status, payoutMethod });

    if (result) {
      await refreshBackendDashboard();
    }
  }

  async function copySetupConfig() {
    if (setupConfig) {
      await navigator.clipboard?.writeText(setupConfig);
      setTestPanelMessage("PC setup config copied.");
    }
  }

  function downloadSetupConfig() {
    if (!setupConfig) {
      return;
    }

    const blob = new Blob([setupConfig], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "spica-pc-client.env";
    link.click();
    URL.revokeObjectURL(url);
  }

  function renderDebugPanel() {
    return (
      <section className="rounded-2xl border border-white/10 bg-black/30 p-4 shadow-nebula">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Dev Debug</p>
            <h3 className="mt-1 text-lg font-semibold text-white">Realtime Health</h3>
          </div>
          <div className="grid gap-2 text-xs text-slate-300 sm:grid-cols-4">
            <span>PC sockets: <strong className="text-cyan-100">{debug.connectedSockets}</strong></span>
            <span>Dashboards: <strong className="text-cyan-100">{debug.dashboardSockets}</strong></span>
            <span>PC IDs: <strong className="font-mono text-cyan-100">{debug.connectedPcIds.join(", ") || "None"}</strong></span>
            <span>Active: <strong className="text-cyan-100">{Object.keys(debug.activeSessions).length}</strong></span>
            <span>Generated: <strong className="text-cyan-100">{debug.generatedAt ? formatHeartbeat(new Date(debug.generatedAt).getTime()) : "Waiting"}</strong></span>
          </div>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-purple-200">Reconnects</p>
            <pre className="mt-2 max-h-24 overflow-auto text-xs text-slate-400">{JSON.stringify(debug.reconnectEvents, null, 2)}</pre>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-purple-200">Heartbeats</p>
            <pre className="mt-2 max-h-24 overflow-auto text-xs text-slate-400">{JSON.stringify(debug.heartbeats, null, 2)}</pre>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-purple-200">Command Dispatch Logs</p>
            <pre className="mt-2 max-h-24 overflow-auto whitespace-pre-wrap text-xs text-slate-400">{debug.commandLogs.join("\n") || "No commands yet"}</pre>
          </div>
        </div>
      </section>
    );
  }

  function renderConnectedPcTestPanel() {
    const pc = ownerZone.pcs.find((item) => item.id === "pc-01") ?? ownerZone.pcs[0];
    const activeSession =
      sessions.find((session) => session.id === testSessionId && session.status === "Active") ??
      sessions.find((session) => session.pcId === pc?.id && session.status === "Active");
    const activeSessionId = activeSession?.id ?? testSessionId;

    if (!pc) {
      return (
        <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-5 text-slate-400 shadow-nebula">
          No registered PCs found in the database.
        </div>
      );
    }

    const displayStatus = getPcDisplayStatus(pc);
    const canStart = displayStatus === "Online";
    const canControl = Boolean(activeSessionId);

    return (
      <section className="rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.045] p-5 shadow-[0_0_34px_rgba(34,211,238,0.08)] backdrop-blur-xl">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-cyan-200">Connected PC Test Panel</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <h3 className="text-2xl font-semibold text-white">{pc.name}</h3>
              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  displayStatus === "In Use"
                    ? "border-purple-300/30 bg-purple-400/10 text-purple-100"
                    : displayStatus === "Online"
                      ? "border-emerald-300/30 bg-emerald-400/10 text-emerald-100"
                      : "border-red-300/30 bg-red-400/10 text-red-100"
                }`}
              >
                {displayStatus}
              </span>
            </div>
            <div className="mt-4 grid gap-3 text-sm text-slate-400 sm:grid-cols-3">
              <span>PC id: <strong className="font-mono text-slate-200">{pc.id}</strong></span>
              <span>Last heartbeat: <strong className="text-slate-200">{formatHeartbeat(pc.lastHeartbeat)}</strong></span>
              <span>Current session: <strong className="font-mono text-slate-200">{activeSessionId ?? "None"}</strong></span>
            </div>
            {testPanelMessage ? <p className="mt-3 text-sm text-amber-200">{testPanelMessage}</p> : null}
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              className="rounded-2xl border border-cyan-300/25 bg-cyan-300/10 px-4 py-3 text-sm font-semibold text-cyan-50 transition hover:border-cyan-100/60 hover:shadow-[0_0_24px_rgba(34,211,238,0.24)] disabled:cursor-not-allowed disabled:opacity-40"
              disabled={!canStart}
              onClick={() => startTestSession(pc)}
              type="button"
            >
              Start 5 min session
            </button>
            <button
              className="rounded-2xl border border-purple-300/25 bg-purple-300/10 px-4 py-3 text-sm font-semibold text-purple-50 transition hover:border-purple-100/60 hover:shadow-[0_0_24px_rgba(168,85,247,0.24)] disabled:cursor-not-allowed disabled:opacity-40"
              disabled={!canControl}
              onClick={() => activeSessionId && addDashboardTime(activeSessionId, 2)}
              type="button"
            >
              Add 2 min
            </button>
            <button
              className="rounded-2xl border border-red-300/25 bg-red-400/10 px-4 py-3 text-sm font-semibold text-red-50 transition hover:border-red-100/60 hover:shadow-[0_0_24px_rgba(248,113,113,0.2)] disabled:cursor-not-allowed disabled:opacity-40"
              disabled={!canControl}
              onClick={() => activeSessionId && endDashboardSession(activeSessionId)}
              type="button"
            >
              End session
            </button>
            <button
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-slate-100 transition hover:border-cyan-100/40 hover:text-cyan-50"
              onClick={sendTestCommand}
              type="button"
            >
              Send Test Command to PC-01
            </button>
            <button
              className="rounded-2xl border border-emerald-300/25 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-50 transition hover:border-emerald-100/50 disabled:opacity-40"
              disabled={cleanupInFlight}
              onClick={cleanupExpiredSessions}
              type="button"
            >
              Cleanup Expired Sessions
            </button>
          </div>
        </div>
      </section>
    );
  }

  function renderPcRegistrationPanel() {
    return (
      <section className="rounded-2xl border border-white/10 bg-white/[0.055] p-5 shadow-nebula backdrop-blur-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-purple-200">Register PC</p>
            <h3 className="mt-2 text-xl font-semibold text-white">Add New PC</h3>
            <p className="mt-2 text-sm text-slate-400">Creates a stable pcId, zoneId, and auth token. IP changes will not break identity.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <input
              className="rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-200/50"
              onChange={(event) => setNewPcName(event.target.value)}
              value={newPcName}
            />
            <select
              className="rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-200/50"
              onChange={(event) => setNewPcCategory(event.target.value as "standard" | "premium" | "vip")}
              value={newPcCategory}
            >
              <option value="standard">Standard</option>
              <option value="premium">Premium</option>
              <option value="vip">VIP</option>
            </select>
            <input
              className="w-28 rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-200/50"
              min={1}
              onChange={(event) => setNewPcRate(Number(event.target.value))}
              type="number"
              value={newPcRate}
            />
            <button
              className="rounded-2xl border border-cyan-300/25 bg-cyan-300/10 px-4 py-3 text-sm font-semibold text-cyan-50 transition hover:border-cyan-100/60"
              onClick={registerPc}
              type="button"
            >
              Add New PC
            </button>
          </div>
        </div>
        {setupConfig ? (
          <div className="mt-5 rounded-2xl border border-white/10 bg-black/35 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-white">PC client setup config</p>
              <button className="rounded-full border border-white/10 px-3 py-1 text-xs text-cyan-100" onClick={copySetupConfig} type="button">
                Copy
              </button>
              <button className="rounded-full border border-white/10 px-3 py-1 text-xs text-cyan-100" onClick={downloadSetupConfig} type="button">
                Download .env
              </button>
            </div>
            <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-xs text-cyan-100">{setupConfig}</pre>
            {setupCommand ? (
              <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.035] p-3">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Windows setup command</p>
                <pre className="mt-2 whitespace-pre-wrap text-xs text-slate-300">{setupCommand}</pre>
              </div>
            ) : null}
            <p className="mt-3 text-xs leading-5 text-slate-500">
              Pairing instructions: install the PC client, paste this `.env` file into the client root, restart the client, then confirm the dashboard shows the PC as Online.
            </p>
          </div>
        ) : null}
      </section>
    );
  }

  function renderPcManagementPanel() {
    return (
      <section className="rounded-2xl border border-white/10 bg-white/[0.055] p-5 shadow-nebula backdrop-blur-xl">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-cyan-200">Fleet Management</p>
            <h3 className="mt-2 text-xl font-semibold text-white">PC Operations</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              className="rounded-2xl border border-white/10 bg-black/35 px-4 py-2 text-sm text-white outline-none"
              onChange={(event) => setPopupMessage(event.target.value)}
              value={popupMessage}
            />
          </div>
        </div>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.16em] text-slate-500">
              <tr>
                <th className="px-3 py-3">PC</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Category</th>
                <th className="px-3 py-3">Rate</th>
                <th className="px-3 py-3">Heartbeat</th>
                <th className="px-3 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {ownerZone.pcs.map((pc) => {
                const active = pc.sessionId || pc.status === "in_use";
                const recovering = pc.status === "offline" && active;
                const status = pc.maintenanceMode ? "maintenance" : recovering ? "recovering" : active ? "in use" : pc.status === "offline" ? "offline" : "online";
                return (
                  <tr className="text-slate-300" key={pc.id}>
                    <td className="px-3 py-3">
                      <input
                        className="w-32 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                        onBlur={(event) => event.currentTarget.value !== pc.name && updatePc(pc.id, { name: event.currentTarget.value })}
                        defaultValue={pc.name}
                      />
                      <p className="mt-1 font-mono text-xs text-slate-600">{pc.id}</p>
                    </td>
                    <td className="px-3 py-3">
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs capitalize text-cyan-100">{status}</span>
                    </td>
                    <td className="px-3 py-3">
                      <select
                        className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                        onChange={(event) => updatePc(pc.id, { category: event.target.value })}
                        value={pc.category ?? "standard"}
                      >
                        <option value="standard">standard</option>
                        <option value="premium">premium</option>
                        <option value="vip">VIP</option>
                      </select>
                    </td>
                    <td className="px-3 py-3">
                      <input
                        className="w-24 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                        min={1}
                        onBlur={(event) => updatePc(pc.id, { ratePerHour: Number(event.currentTarget.value) })}
                        type="number"
                        defaultValue={pc.ratePerHour}
                      />
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-400">{formatHeartbeat(pc.lastHeartbeat)}</td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button className="rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-200" onClick={() => updatePc(pc.id, { maintenanceMode: !pc.maintenanceMode })} type="button">
                          {pc.maintenanceMode ? "Clear maintenance" : "Maintenance"}
                        </button>
                        <button className="rounded-xl border border-cyan-300/20 px-3 py-2 text-xs text-cyan-100" onClick={() => updatePc(pc.id, { regenerateAuthToken: true })} type="button">
                          Regen token
                        </button>
                        <button className="rounded-xl border border-purple-300/20 px-3 py-2 text-xs text-purple-100" onClick={() => sendPopupToPc(pc.id)} type="button">
                          Popup
                        </button>
                        <button className="rounded-xl border border-red-300/20 px-3 py-2 text-xs text-red-100 disabled:opacity-40" disabled={Boolean(active)} onClick={() => removePc(pc.id)} type="button">
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    );
  }

  function renderZoneAnalyticsPanel() {
    const onlineCount = ownerZone.pcs.filter((pc) => pc.status !== "offline").length;
    const offlineCount = ownerZone.pcs.length - onlineCount;

    return (
      <section className="grid gap-5 xl:grid-cols-[1fr_0.75fr]">
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard detail="Gross session volume" icon={Coins} title="SPICA Earned" value={formatSpica(ownerGross)} />
          <StatCard detail="Estimated Ezzstar fee" icon={ShieldCheck} title="Commission" tone="purple" value={formatSpica(Math.round(ownerGross * 0.1))} />
          <StatCard detail="Completed + active sessions" icon={Timer} title="Hours Played" tone="green" value={ownerHours.toFixed(1)} />
          <StatCard detail="Current live play" icon={Activity} title="Active Sessions" value={String(ownerSessions.filter((session) => session.status === "Active").length)} />
          <StatCard detail="Online/offline fleet" icon={Monitor} title="PC Presence" tone="purple" value={`${onlineCount}/${ownerZone.pcs.length}`} />
          <StatCard detail="Ready for payout cycle" icon={Banknote} title="Projected Net" tone="green" value={formatSpica(Math.round(ownerGross * 0.9))} />
        </div>
        <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.055] p-5 shadow-nebula">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-cyan-200">Most Used PCs</p>
            <div className="mt-3 space-y-2">
              {mostUsedPcs.length ? mostUsedPcs.map((pc) => (
                <div className="flex justify-between rounded-xl bg-black/25 px-3 py-2 text-sm" key={pc.pcName}>
                  <span className="text-slate-300">{pc.pcName}</span>
                  <span className="text-cyan-100">{pc.sessions} sessions - {pc.hours.toFixed(1)}h</span>
                </div>
              )) : <p className="text-sm text-slate-500">No PC usage yet.</p>}
            </div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-purple-200">Top Players</p>
            <div className="mt-3 space-y-2">
              {ownerTopPlayers.length ? ownerTopPlayers.map((player) => (
                <div className="flex justify-between rounded-xl bg-black/25 px-3 py-2 text-sm" key={player.name}>
                  <span className="text-slate-300">{player.name}</span>
                  <span className="text-purple-100">{formatSpica(player.spend)}</span>
                </div>
              )) : <p className="text-sm text-slate-500">No player activity yet.</p>}
            </div>
          </div>
          <p className="text-xs text-slate-600">Fleet split: {onlineCount} online, {offlineCount} offline. Today/week/month buckets are ready once production reporting windows are added.</p>
        </div>
      </section>
    );
  }

  function renderZoneSessionHistoryPanel() {
    const term = sessionSearch.toLowerCase();
    const filtered = ownerSessions.filter((session) =>
      [session.playerName, session.pcName, session.zoneName, session.status].some((value) => value.toLowerCase().includes(term))
    );

    return (
      <section className="space-y-4">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-cyan-200">Session History</p>
            <h3 className="mt-2 text-xl font-semibold text-white">Searchable Operations Ledger</h3>
          </div>
          <input
            className="rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none"
            onChange={(event) => setSessionSearch(event.target.value)}
            placeholder="Search player, PC, status..."
            value={sessionSearch}
          />
        </div>
        {renderSessionCards(filtered)}
        <p className="text-xs text-slate-600">CSV export hook is ready for Phase 3.1 once file export format is finalized.</p>
      </section>
    );
  }

  function renderStaffPanel() {
    return (
      <section className="rounded-2xl border border-white/10 bg-white/[0.055] p-5 shadow-nebula">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-purple-200">Staff Access</p>
            <h3 className="mt-2 text-xl font-semibold text-white">Create Manager Account</h3>
            <p className="mt-2 text-sm text-slate-400">Managers can control PCs, sessions, analytics, and live operations. They cannot withdraw funds or delete the zone.</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            <input className="rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-sm text-white" onChange={(event) => setManagerName(event.target.value)} value={managerName} />
            <input className="rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-sm text-white" onChange={(event) => setManagerUsername(event.target.value)} value={managerUsername} />
            <input className="rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-sm text-white" onChange={(event) => setManagerEmail(event.target.value)} value={managerEmail} />
            <input className="rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-sm text-white" onChange={(event) => setManagerPassword(event.target.value)} type="password" value={managerPassword} />
            <button className="rounded-xl border border-purple-300/25 bg-purple-300/10 px-3 py-2 text-sm font-semibold text-purple-100" onClick={createManager} type="button">
              Add Manager
            </button>
          </div>
        </div>
      </section>
    );
  }

  function renderSessionCards(items: Session[]) {
    return (
      <div className="grid gap-5 xl:grid-cols-2">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-6 text-slate-400 shadow-nebula">No sessions in this view yet.</div>
        ) : (
          items.map((session) => (
            <article className="rounded-2xl border border-white/10 bg-white/[0.055] p-5 shadow-nebula backdrop-blur-xl" key={session.id}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-slate-500">{session.playerName}</p>
                  <h3 className="mt-1 text-xl font-semibold text-white">
                    {session.zoneName} - {session.pcName}
                  </h3>
                </div>
                <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-semibold text-cyan-100">{session.status}</span>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-3">
                <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
                  <p className="text-xs text-slate-500">Timer</p>
                  <p className="mt-1 font-mono text-lg font-bold text-cyan-100">
                    {session.status === "Active" && (remainingBySession[session.id] ?? 0) <= 0 ? "Expired" : formatTime(remainingBySession[session.id] ?? 0)}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
                  <p className="text-xs text-slate-500">Gross</p>
                  <p className="mt-1 text-lg font-semibold text-white">{formatSpica(session.grossSpica)}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
                  <p className="text-xs text-slate-500">Rate</p>
                  <p className="mt-1 text-lg font-semibold text-purple-100">{formatSpica(session.ratePerHour)}/h</p>
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    );
  }

  function renderZonePcControl(zone: Zone) {
    const recentCutoff = now - 30_000;
    const visiblePcs = zone.pcs.filter((pc) => showOfflinePcs || pc.status !== "offline" || (pc.lastHeartbeat && pc.lastHeartbeat >= recentCutoff));

    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <label className="flex items-center gap-2 text-sm text-slate-400">
            <input checked={showOfflinePcs} onChange={(event) => setShowOfflinePcs(event.target.checked)} type="checkbox" />
            Show Offline PCs
          </label>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {visiblePcs.map((pc) => {
          const sessionRemaining = pc.sessionId ? remainingBySession[pc.sessionId] ?? 0 : 0;
          const heartbeatRemaining = pc.heartbeatRemainingSeconds ? pc.heartbeatRemainingSeconds * 1000 : 0;
          const metadataRemaining =
            pc.activeSessionStartTime && pc.activeSessionDurationSeconds
              ? getRemainingTime(pc.activeSessionStartTime, pc.activeSessionDurationSeconds, serverNow)
              : 0;
          const remainingMs = Math.max(sessionRemaining, heartbeatRemaining, metadataRemaining);

          return (
          <PCCard
            key={pc.id}
            onAddTime={(sessionId, minutes) => addDashboardTime(sessionId, minutes)}
            onEnd={(sessionId) => endDashboardSession(sessionId)}
            onStart={(selected) => setSelectedPc(selected)}
            pc={pc}
            remainingMs={remainingMs}
          />
        );})}
        </div>
        {visiblePcs.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-6 text-slate-400 shadow-nebula">
            No online or recent PCs. Turn on Show Offline PCs to see registered machines.
          </div>
        ) : null}
      </div>
    );
  }

  function renderPlayerDashboard() {
    function renderPlayerEcosystemPanel() {
      return (
        <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <article className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.055] shadow-nebula">
            <div className="h-24 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.35),transparent_32%),linear-gradient(135deg,rgba(168,85,247,0.25),rgba(2,6,23,0.85))]" />
            <div className="p-5">
              <div className="-mt-12 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div className="flex items-end gap-4">
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-cyan-200/30 bg-black text-2xl font-bold text-cyan-100 shadow-glow">
                    {(selectedPlayer.username ?? selectedPlayer.name).slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-cyan-200">{selectedPlayer.membership ?? "Starter"}</p>
                    <h3 className="mt-1 text-2xl font-semibold text-white">{selectedPlayer.name}</h3>
                    <p className="text-sm text-slate-400">@{selectedPlayer.username ?? "player"} - {selectedPlayer.onlineStatus ?? "online"}</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
                  <p className="text-xs text-slate-500">Level {playerLevel}</p>
                  <div className="mt-2 h-2 w-40 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-cyan-300" style={{ width: `${Math.min(100, (playerXp / nextLevelXp) * 100)}%` }} />
                  </div>
                  <p className="mt-2 text-xs text-cyan-100">{playerXp} / {nextLevelXp} XP</p>
                </div>
              </div>
              <p className="mt-5 max-w-3xl text-sm leading-6 text-slate-400">{selectedPlayer.bio ?? "Global SPICA player identity active across connected gaming zones."}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {(selectedPlayer.favoriteGames?.length ? selectedPlayer.favoriteGames : ["Valorant", "Tekken 8", "Forza"]).map((game) => (
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300" key={game}>{game}</span>
                ))}
              </div>
            </div>
          </article>
          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard detail="Persistent across all zones" icon={WalletCards} title="SPICA Balance" value={formatSpica(selectedPlayer.balance)} />
            <StatCard detail="Completed + active sessions" icon={Timer} title="Hours Played" tone="green" value={playerHours.toFixed(1)} />
            <StatCard detail="All-time session spend" icon={Coins} title="SPICA Spent" tone="purple" value={formatSpica(playerSpent)} />
            <StatCard detail="Unlocked badges" icon={Trophy} title="Achievements" tone="green" value={`${playerAchievements.filter((item) => item.unlocked).length}/${playerAchievements.length}`} />
          </div>
        </section>
      );
    }

    function renderAchievementsPanel() {
      return (
        <section className="grid gap-3 md:grid-cols-3">
          {playerAchievements.map((achievement) => (
            <article className={`rounded-2xl border p-4 shadow-nebula ${achievement.unlocked ? "border-cyan-300/20 bg-cyan-300/[0.07]" : "border-white/10 bg-white/[0.035]"}`} key={achievement.name}>
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{achievement.unlocked ? "Unlocked" : "Locked"}</p>
              <h3 className="mt-2 text-lg font-semibold text-white">{achievement.name}</h3>
              <p className="mt-2 text-sm text-slate-400">{achievement.detail}</p>
            </article>
          ))}
        </section>
      );
    }

    function renderSocialPanel() {
      const onlineFriends = players.filter((player) => player.id !== selectedPlayer.id).slice(0, 4);
      return (
        <section className="grid gap-5 xl:grid-cols-2">
          <article className="rounded-2xl border border-white/10 bg-white/[0.055] p-5 shadow-nebula">
            <p className="text-xs uppercase tracking-[0.18em] text-cyan-200">Online Friends</p>
            <div className="mt-4 space-y-3">
              {onlineFriends.length ? onlineFriends.map((friend) => (
                <div className="flex items-center justify-between rounded-xl bg-black/25 px-3 py-3" key={friend.id}>
                  <div>
                    <p className="font-semibold text-white">{friend.name}</p>
                    <p className="text-xs text-slate-500">@{friend.username ?? "player"} - {friend.onlineStatus ?? "online"}</p>
                  </div>
                  <span className="rounded-full bg-emerald-300/10 px-3 py-1 text-xs text-emerald-100">Online</span>
                </div>
              )) : <p className="text-sm text-slate-500">Friend system is ready. Add friends from the API or future search UI.</p>}
            </div>
          </article>
          <article className="rounded-2xl border border-white/10 bg-white/[0.055] p-5 shadow-nebula">
            <p className="text-xs uppercase tracking-[0.18em] text-purple-200">Ecosystem Feed</p>
            <div className="mt-4 space-y-3">
              {activity.slice(0, 6).map((item) => (
                <div className="rounded-xl bg-black/25 px-3 py-3" key={item.id}>
                  <p className="text-sm font-semibold text-white">{item.label}</p>
                  <p className="mt-1 text-xs text-slate-500">{item.detail}</p>
                </div>
              ))}
            </div>
          </article>
        </section>
      );
    }

    if (activeView === "Wallet") {
      return <WalletCard onBuySpica={buySpica} onPlayerChange={setSelectedPlayerId} onRequestWithdrawal={handleRequestWithdrawal} players={players} selectedPlayerId={selectedPlayerId} />;
    }

    if (activeView === "Nearby Zones" || activeView === "Zones") {
      return <div className="grid gap-5 xl:grid-cols-3">{playerVisibleZones.map((zone) => <ZoneCard key={zone.id} onSelect={setSelectedZoneId} selected={selectedZoneId === zone.id} settlements={settlements} zone={zone} />)}</div>;
    }

    if (activeView === "Active Session") {
      return (
        <div className="space-y-5">
          {playerActiveSession ? renderSessionCards([playerActiveSession]) : <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-6 text-slate-400 shadow-nebula">No active player session.</div>}
          <div className="flex flex-wrap gap-3">
            {playerVisibleZones.map((zone) => (
              <button className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-300 transition hover:border-cyan-200/40 hover:text-white" key={zone.id} onClick={() => setSelectedZoneId(zone.id)} type="button">
                {zone.name}
              </button>
            ))}
          </div>
          {renderZonePcControl(selectedZone)}
        </div>
      );
    }

    if (activeView === "Rewards" || activeView === "Profile") {
      return <div className="space-y-5">{renderPlayerEcosystemPanel()}{renderAchievementsPanel()}</div>;
    }

    if (activeView === "Play History" || activeView === "Activity") {
      return renderSessionCards(playerSessions);
    }

    if (activeView === "Tournaments") {
      return (
        <section className="rounded-2xl border border-white/10 bg-white/[0.055] p-5 shadow-nebula">
          <p className="text-xs uppercase tracking-[0.18em] text-purple-200">Tournament Hub</p>
          <h3 className="mt-3 text-2xl font-semibold text-white">Arena events are being prepared</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">This page is reserved for upcoming zone tournaments, leaderboard seasons, and Ezzstar community events.</p>
        </section>
      );
    }

    if (activeView === "Updates") {
      return renderSocialPanel();
    }

    return (
      <div className="space-y-6">
        {renderPlayerEcosystemPanel()}
        <WalletCard onBuySpica={buySpica} onPlayerChange={setSelectedPlayerId} onRequestWithdrawal={handleRequestWithdrawal} players={players} selectedPlayerId={selectedPlayerId} />
        {renderAchievementsPanel()}
        {renderSocialPanel()}
        <div className="grid gap-5 xl:grid-cols-3">{playerVisibleZones.map((zone) => <ZoneCard key={zone.id} onSelect={setSelectedZoneId} selected={selectedZoneId === zone.id} settlements={settlements} zone={zone} />)}</div>
      </div>
    );
  }

  function renderZoneDashboard() {
    if (activeView === "PC Control" || activeView === "PCs") {
      return (
        <div className="space-y-5">
          {renderConnectedPcTestPanel()}
          <PairingRequestsPanel />
          {renderPcManagementPanel()}
          {renderDebugPanel()}
          {renderPcRegistrationPanel()}
          {renderZonePcControl(ownerZone)}
        </div>
      );
    }

    if (activeView === "Live Sessions" || activeView === "Sessions") {
      return renderZoneSessionHistoryPanel();
    }

    if (activeView === "Earnings") {
      return (
        <div className="space-y-5">
          {renderZoneAnalyticsPanel()}
          <div className="grid gap-5 md:grid-cols-3">
            <StatCard detail="Gross SPICA in this zone" icon={Coins} title="Zone Earnings" value={formatSpica(ownerGross)} />
            <StatCard detail="After 10% Ezzstar fee" icon={Banknote} title="Net Settlement" tone="green" value={formatSpica(Math.round(ownerGross * 0.9))} />
            <StatCard detail="PKR equivalent at mock rate" icon={Landmark} title="PKR Payout" tone="purple" value={formatPkr(spicaToPkr(Math.round(ownerGross * 0.9)))} />
          </div>
        </div>
      );
    }

    if (activeView === "Settlements") {
      return <SettlementTable settlements={ownerSettlements} />;
    }

    if (activeView === "Player Activity" || activeView === "Customers") {
      return renderZoneSessionHistoryPanel();
    }

    if (activeView === "Updates") {
      return (
        <section className="rounded-2xl border border-white/10 bg-white/[0.055] p-5 shadow-nebula">
          <p className="text-xs uppercase tracking-[0.18em] text-cyan-200">Zone Updates</p>
          <h3 className="mt-3 text-2xl font-semibold text-white">Announcements workspace</h3>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {["general", "event", "maintenance", "offer"].map((type) => (
              <div className="rounded-2xl border border-white/10 bg-black/25 p-4" key={type}>
                <p className="font-semibold text-white capitalize">{type}</p>
                <p className="mt-1 text-sm text-slate-500">Create {type} updates for public players, followers, or repeat customers.</p>
              </div>
            ))}
          </div>
        </section>
      );
    }

    if (activeView === "Payout Requests") {
      return (
        <div className="space-y-5">
          {renderStaffPanel()}
          <WalletCard onBuySpica={buySpica} onPlayerChange={setSelectedPlayerId} onRequestWithdrawal={handleRequestWithdrawal} players={players} selectedPlayerId={selectedPlayerId} />
          <WithdrawalTable withdrawals={withdrawals.filter((withdrawal) => withdrawal.type === "Owner")} />
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-4">
          <StatCard detail="Owner console zone" icon={Landmark} title="Zone" value={ownerZone.name} />
          <StatCard detail="PCs currently in use" icon={Monitor} title="Active PCs" tone="purple" value={String(ownerZone.pcs.filter((pc) => pc.sessionId || pc.status === "in_use").length)} />
          <StatCard detail="Gross zone revenue" icon={Coins} title="Earnings" tone="green" value={formatSpica(ownerGross)} />
          <StatCard detail="Pending owner withdrawal requests" icon={WalletCards} title="Payout Requests" tone="red" value={String(withdrawals.filter((item) => item.type === "Owner" && item.status === "Pending").length)} />
        </div>
        {renderZoneAnalyticsPanel()}
        {renderConnectedPcTestPanel()}
        {renderPcManagementPanel()}
        {renderStaffPanel()}
        {renderDebugPanel()}
        {renderPcRegistrationPanel()}
        {renderZonePcControl(ownerZone)}
        <SettlementTable settlements={ownerSettlements} />
      </div>
    );
  }

  function renderApprovalTable() {
    return (
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.055] shadow-nebula backdrop-blur-xl">
        <div className="border-b border-white/10 px-5 py-4">
          <h3 className="text-lg font-semibold text-white">Withdrawal Approvals</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-white/[0.04] text-xs uppercase tracking-[0.16em] text-slate-500">
              <tr>
                <th className="px-5 py-4">Request</th>
                <th className="px-5 py-4">User</th>
                <th className="px-5 py-4">Type</th>
                <th className="px-5 py-4">Amount</th>
                <th className="px-5 py-4">Net</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {withdrawals.map((withdrawal) => (
                <tr className="text-slate-300" key={withdrawal.id}>
                  <td className="px-5 py-4 font-mono text-cyan-100">{withdrawal.id}</td>
                  <td className="px-5 py-4">{withdrawal.userName}</td>
                  <td className="px-5 py-4">{withdrawal.type}</td>
                  <td className="px-5 py-4">{formatSpica(withdrawal.amount)}</td>
                  <td className="px-5 py-4 text-emerald-100">{formatSpica(withdrawal.netAmount)}</td>
                  <td className="px-5 py-4">{withdrawal.status}</td>
                  <td className="px-5 py-4">
                    <div className="flex gap-2">
                      <button className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1 text-xs font-semibold text-emerald-100 disabled:opacity-40" disabled={withdrawal.status !== "Pending"} onClick={() => approveWithdrawal(withdrawal.id)} type="button">
                        Approve
                      </button>
                      <button className="rounded-full border border-red-300/25 bg-red-400/10 px-3 py-1 text-xs font-semibold text-red-100 disabled:opacity-40" disabled={withdrawal.status !== "Pending"} onClick={() => rejectWithdrawal(withdrawal.id)} type="button">
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  function renderSettlementApprovals() {
    return (
      <div className="space-y-5">
        <SettlementTable settlements={settlements} />
        <div className="grid gap-3 md:grid-cols-3">
          {pendingSettlements.map((settlement) => (
            <button className="rounded-2xl border border-purple-300/20 bg-purple-300/10 p-4 text-left text-sm text-purple-50 transition hover:border-purple-100/50 hover:shadow-[0_0_24px_rgba(168,85,247,0.18)]" key={settlement.id} onClick={() => approveSettlement(settlement.id)} type="button">
              <span className="block font-semibold">{settlement.transactionId}</span>
              <span className="mt-1 block text-slate-400">{settlement.zone} - {formatSpica(settlement.zoneNetAmount)}</span>
              <span className="mt-3 block text-xs uppercase tracking-[0.18em] text-cyan-200">Approve settlement</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  function renderAdminDashboard() {
    const filteredZones = zones.filter((zone) =>
      [zone.name, zone.city, zone.status].some((value) => value.toLowerCase().includes(adminSearch.toLowerCase()))
    );
    const onlinePcs = zones.flatMap((zone) => zone.pcs).filter((pc) => pc.status !== "offline").length;
    const totalZoneNet = settlements.reduce((sum, settlement) => sum + settlement.zoneNetAmount, 0);
    const adminNotifications = [
      ...zones.filter((zone) => zone.status === "Pending").map((zone) => ({ title: "New zone pending", detail: `${zone.name} awaits review.` })),
      ...zones.flatMap((zone) => zone.pcs.filter((pc) => pc.status === "offline").map((pc) => ({ title: "PC offline", detail: `${pc.name} is offline at ${zone.name}.` }))),
      ...settlements.filter((settlement) => settlement.status === "Pending" || settlement.status === "Ready").map((settlement) => ({ title: "Settlement pending", detail: `${settlement.zone} has ${formatSpica(settlement.zoneNetAmount)} net pending.` })),
      ...activeSessions.filter((session) => session.durationSeconds >= 6 * 3600).map((session) => ({ title: "Long session", detail: `${session.pcName} session is unusually long.` }))
    ].slice(0, 8);

    function renderAdminZoneTable() {
      return (
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.055] shadow-nebula">
          <div className="flex flex-col justify-between gap-3 border-b border-white/10 px-5 py-4 md:flex-row md:items-center">
            <h3 className="text-lg font-semibold text-white">Zone Management</h3>
            <input className="rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-sm text-white" onChange={(event) => setAdminSearch(event.target.value)} placeholder="Search zones..." value={adminSearch} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left text-sm">
              <thead className="bg-white/[0.04] text-xs uppercase tracking-[0.16em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Zone</th>
                  <th className="px-4 py-3">Owner</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">PCs</th>
                  <th className="px-4 py-3">Sessions</th>
                  <th className="px-4 py-3">SPICA</th>
                  <th className="px-4 py-3">Commission</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filteredZones.map((zone) => {
                  const zoneSettlements = settlements.filter((settlement) => settlement.zoneId === zone.id);
                  const gross = zoneSettlements.reduce((sum, item) => sum + item.grossSpica, 0);
                  const fee = zoneSettlements.reduce((sum, item) => sum + item.ezzstarFee, 0);
                  const live = activeSessions.filter((session) => session.zoneId === zone.id).length;
                  return (
                    <tr className="text-slate-300" key={zone.id}>
                      <td className="px-4 py-3"><p className="font-semibold text-white">{zone.name}</p><p className="text-xs text-slate-500">{zone.city}</p></td>
                      <td className="px-4 py-3 text-slate-400">Owner</td>
                      <td className="px-4 py-3">{zone.status}</td>
                      <td className="px-4 py-3">{zone.pcs.filter((pc) => pc.status !== "offline").length}/{zone.pcs.length}</td>
                      <td className="px-4 py-3">{live}</td>
                      <td className="px-4 py-3 text-cyan-100">{formatSpica(gross)}</td>
                      <td className="px-4 py-3 text-purple-100">{formatSpica(fee)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button className="rounded-lg border border-emerald-300/20 px-2 py-1 text-xs text-emerald-100" onClick={() => patchZoneStatus(zone.id, "active")} type="button">Approve</button>
                          <button className="rounded-lg border border-amber-300/20 px-2 py-1 text-xs text-amber-100" onClick={() => patchZoneStatus(zone.id, "suspended")} type="button">Suspend</button>
                          <button className="rounded-lg border border-red-300/20 px-2 py-1 text-xs text-red-100" onClick={() => patchZoneStatus(zone.id, "rejected")} type="button">Reject</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    function renderAdminSettlementControl() {
      return (
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.055] shadow-nebula">
          <div className="border-b border-white/10 px-5 py-4">
            <h3 className="text-lg font-semibold text-white">Settlement Control</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="bg-white/[0.04] text-xs uppercase tracking-[0.16em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Settlement</th>
                  <th className="px-4 py-3">Zone</th>
                  <th className="px-4 py-3">Gross</th>
                  <th className="px-4 py-3">Commission</th>
                  <th className="px-4 py-3">Net</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Payout</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {settlements.map((settlement) => (
                  <tr className="text-slate-300" key={settlement.id}>
                    <td className="px-4 py-3 font-mono text-cyan-100">{settlement.transactionId}</td>
                    <td className="px-4 py-3">{settlement.zone}</td>
                    <td className="px-4 py-3">{formatSpica(settlement.grossSpica)}</td>
                    <td className="px-4 py-3 text-purple-100">{formatSpica(settlement.ezzstarFee)}</td>
                    <td className="px-4 py-3 text-emerald-100">{formatSpica(settlement.zoneNetAmount)}</td>
                    <td className="px-4 py-3">{settlement.status}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button className="rounded-lg border border-cyan-300/20 px-2 py-1 text-xs text-cyan-100" onClick={() => patchSettlementStatus(settlement.id, "approved", "PKR")} type="button">Approve</button>
                        <button className="rounded-lg border border-emerald-300/20 px-2 py-1 text-xs text-emerald-100" onClick={() => patchSettlementStatus(settlement.id, "paid", "hybrid")} type="button">Paid</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    function renderLiveMonitoring() {
      return (
        <section className="grid gap-4 xl:grid-cols-2">
          {activeSessions.length ? activeSessions.map((session) => (
            <article className="rounded-2xl border border-white/10 bg-white/[0.055] p-4 shadow-nebula" key={session.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-500">{session.playerName}</p>
                  <h3 className="text-lg font-semibold text-white">{session.zoneName} - {session.pcName}</h3>
                </div>
                <span className="font-mono text-cyan-100">{formatTime(remainingBySession[session.id] ?? 0)}</span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button className="rounded-xl border border-red-300/20 px-3 py-2 text-xs text-red-100" onClick={() => endDashboardSession(session.id)} type="button">Force End</button>
                <button className="rounded-xl border border-purple-300/20 px-3 py-2 text-xs text-purple-100" onClick={() => sendPopupToPc(session.pcId)} type="button">Message PC</button>
              </div>
            </article>
          )) : <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-5 text-slate-400">No live sessions.</div>}
        </section>
      );
    }

    function renderSafetyPanel() {
      const offlineActive = activeSessions.filter((session) => zones.some((zone) => zone.pcs.some((pc) => pc.id === session.pcId && pc.status === "offline")));
      const longSessions = activeSessions.filter((session) => session.durationSeconds >= 6 * 3600);
      const stalePcs = zones.flatMap((zone) => zone.pcs.filter((pc) => pc.status !== "offline" && (!pc.lastHeartbeat || pc.lastHeartbeat < Date.now() - 30_000)).map((pc) => ({ ...pc, zoneName: zone.name })));
      const issues = [
        ...offlineActive.map((session) => ({ title: "Offline PC with active session", detail: `${session.pcName} at ${session.zoneName}` })),
        ...longSessions.map((session) => ({ title: "Unusually long session", detail: `${session.playerName} on ${session.pcName}` })),
        ...stalePcs.map((pc) => ({ title: "Low heartbeat reliability", detail: `${pc.name} at ${pc.zoneName}` })),
        ...debug.commandLogs.filter((log) => log.includes("Replaced existing connection")).map((log) => ({ title: "Duplicate reconnect", detail: log }))
      ];
      return (
        <section className="rounded-2xl border border-white/10 bg-white/[0.055] p-5 shadow-nebula">
          <p className="text-xs uppercase tracking-[0.18em] text-red-200">Fraud / Safety</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {issues.length ? issues.slice(0, 8).map((issue) => (
              <div className="rounded-xl border border-red-300/15 bg-red-400/10 p-3" key={`${issue.title}-${issue.detail}`}>
                <p className="font-semibold text-red-100">{issue.title}</p>
                <p className="mt-1 text-xs text-slate-400">{issue.detail}</p>
              </div>
            )) : <p className="text-sm text-slate-500">No active safety flags.</p>}
          </div>
        </section>
      );
    }

    if (activeView === "All Zones" || activeView === "Zones") {
      return <div className="space-y-5">{renderAdminZoneTable()}</div>;
    }

    if (activeView === "All Players" || activeView === "Players") {
      return (
        <div className="grid gap-5 md:grid-cols-3">
          {players.map((player) => (
            <article className="rounded-2xl border border-white/10 bg-white/[0.055] p-5 shadow-nebula" key={player.id}>
              <p className="text-sm text-slate-500">Player Wallet</p>
              <h3 className="mt-2 text-xl font-semibold text-white">{player.name}</h3>
              <p className="mt-4 text-2xl font-bold text-cyan-100">{formatSpica(player.balance)}</p>
            </article>
          ))}
        </div>
      );
    }

    if (activeView === "Commissions") {
      return (
        <div className="space-y-5">
          <div className="grid gap-5 md:grid-cols-3">
            <StatCard detail="Completed session fee capture" icon={ShieldCheck} title="Commission Earned" tone="green" value={formatSpica(commissionEarned)} />
            <StatCard detail="Mock credit purchases" icon={Coins} title="Credits Sold" value={formatSpica(creditsSold)} />
            <StatCard detail="All session volume" icon={BarChart3} title="Total Spend" tone="purple" value={formatSpica(totalSpent)} />
          </div>
          <SettlementTable settlements={settlements} />
        </div>
      );
    }

    if (activeView === "Sessions") {
      return <div className="space-y-5">{renderLiveMonitoring()}</div>;
    }

    if (activeView === "Withdrawal Approvals") {
      return renderApprovalTable();
    }

    if (activeView === "Settlement Approvals" || activeView === "Settlements") {
      return <div className="space-y-5">{renderAdminSettlementControl()}{renderSettlementApprovals()}</div>;
    }

    if (activeView === "System Analytics" || activeView === "System Health") {
      return (
        <div className="space-y-5">
          <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-4">
            <StatCard detail="Active operators" icon={Landmark} title="Active Zones" value={String(activeZones)} />
            <StatCard detail="Current live sessions" icon={Activity} title="Live Sessions" tone="purple" value={String(activeSessions.length)} />
            <StatCard detail="Approval queue volume" icon={Banknote} title="Pending Settlements" tone="red" value={String(pendingSettlements.length)} />
            <StatCard detail="Graph-ready daily volume" icon={BarChart3} title="SPICA Volume" tone="green" value={formatSpica(totalSpent)} />
          </div>
          {renderSafetyPanel()}
          {renderLiveMonitoring()}
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
          <StatCard detail={`${zones.filter((zone) => zone.status === "Pending").length} pending review`} icon={Landmark} title="Total Zones" value={String(zones.length)} />
          <StatCard detail="Player wallets in mock network" icon={Users} title="Total Players" tone="purple" value={String(players.length)} />
          <StatCard detail="Heartbeat-connected machines" icon={Monitor} title="Online PCs" tone="green" value={String(onlinePcs)} />
          <StatCard detail="All live gameplay" icon={Activity} title="Active Sessions" tone="purple" value={String(activeSessions.length)} />
          <StatCard detail="All-time SPICA purchases" icon={Coins} title="SPICA Credits Sold" value={formatSpica(creditsSold)} />
          <StatCard detail="All session volume" icon={WalletCards} title="SPICA Spent" tone="purple" value={formatSpica(totalSpent)} />
          <StatCard detail="10% fee on completed settlements" icon={ShieldCheck} title="Commission Earned" tone="green" value={formatSpica(commissionEarned)} />
          <StatCard detail="Zone net earned" icon={Banknote} title="Zone Net" tone="green" value={formatSpica(totalZoneNet)} />
        </div>
        <div className="grid gap-5 xl:grid-cols-[1fr_0.7fr]">
          {renderAdminZoneTable()}
          <section className="rounded-2xl border border-white/10 bg-white/[0.055] p-5 shadow-nebula">
            <p className="text-xs uppercase tracking-[0.18em] text-cyan-200">Admin Notifications</p>
            <div className="mt-4 space-y-3">
              {adminNotifications.length ? adminNotifications.map((item) => (
                <div className="rounded-xl bg-black/25 p-3" key={`${item.title}-${item.detail}`}>
                  <p className="font-semibold text-white">{item.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{item.detail}</p>
                </div>
              )) : <p className="text-sm text-slate-500">No admin notifications.</p>}
            </div>
          </section>
        </div>
        <div className="grid gap-5 2xl:grid-cols-[1fr_0.85fr]">
          {renderAdminSettlementControl()}
          <WithdrawalTable withdrawals={withdrawals} />
        </div>
        {renderLiveMonitoring()}
        {renderSafetyPanel()}
      </div>
    );
  }

  function renderContent() {
    if (activeView === "Settings") {
      return (
        <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-6 shadow-nebula">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-500">MVP Settings</p>
          <h3 className="mt-3 text-2xl font-semibold text-white">Commission 10% - Withdrawal Fee 3%</h3>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">Production settings can later control pricing, settlement cycles, owner permissions, player limits, and real payment rails.</p>
        </div>
      );
    }

    if (role === "player") {
      return renderPlayerDashboard();
    }

    if (role === "zone") {
      return renderZoneDashboard();
    }

    return renderAdminDashboard();
  }

  const pageSubcopy: Record<DashboardRole, string> = {
    player: "Your balance, sessions, zones, rewards, and player activity in one connected SPICA account.",
    zone: "Operate PCs, live sessions, customers, earnings, and zone announcements from one owner console.",
    admin: "Monitor zones, players, settlements, requests, system health, and SPICA network activity."
  };

  if (!hydrated) {
    return (
      <main className="min-h-screen">
        <div className="lg:pl-72">
          <section className="px-5 py-6 md:px-8 md:py-8">
            <LoadingState label="Syncing your profile..." />
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-24 lg:pb-0">
      <RoleSidebar activeView={activeView} onViewChange={setActiveView} role={role} />

      <div className="lg:pl-72">
        <Topbar activeZones={activeZones} commissionEarned={commissionEarned} eyebrow={roleEyebrow[role]} playerBalance={selectedPlayer.balance} title={roleTitle[role]} />

        <section className="px-5 py-6 md:px-8 md:py-8">
          <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-sm text-slate-500">{pageSubcopy[role]}</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-100">{activeView}</h2>
            </div>
            <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-slate-400">
              {activeSessions.length} live sessions - {formatPkr(spicaToPkr(settlements.reduce((sum, item) => sum + item.zoneNetAmount, 0)))} owner settlement
            </div>
          </div>

          <div className="mb-6 grid gap-4 xl:grid-cols-[1fr_0.78fr]">
            <SystemActivityFeed activity={activity} />
            <NotificationCenter activity={activity} role={role} />
          </div>

          {renderContent()}
        </section>
      </div>

      <SessionModal
        onClose={() => setSelectedPc(null)}
        onPlayerChange={setSelectedPlayerId}
        onStart={(playerId, duration) => {
          if (selectedPc) {
            startDashboardSession(playerId, selectedZone.id, selectedPc.id, duration);
          }
          setSelectedPc(null);
        }}
        open={Boolean(selectedPc)}
        pc={selectedPc}
        players={players}
        selectedPlayerId={selectedPlayerId}
        zone={selectedZone}
      />
    </main>
  );
}
