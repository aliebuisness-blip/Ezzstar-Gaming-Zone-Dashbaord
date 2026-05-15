"use client";

import { useMemo, useState } from "react";
import { Activity, Clock3, Copy, Lock, Monitor, MoreHorizontal, Radio, Signal, UserRound, Wrench } from "lucide-react";
import { AppButton } from "@/components/ui/AppButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatTime, getRemainingTime } from "@/lib/timer";
import { GamingPc, Session, Zone, formatSpica } from "@/lib/spica";

type PcMapState = "offline" | "pairing" | "idle" | "active_session" | "reserved" | "maintenance";

type ZonePcMapProps = {
  zone: Zone;
  sessions: Session[];
  remainingBySession: Record<string, number>;
  serverNow: number;
  onStartSession: (pc: GamingPc) => void;
  onAddTime: (sessionId: string, minutes: number) => void;
  onEndSession: (sessionId: string) => void;
  onMaintenance: (pcId: string, enabled: boolean) => void;
  onSendMessage: (pcId: string) => void;
};

const stateCopy: Record<PcMapState, { label: string; tone: "offline" | "active" | "warning" | "success" | "danger" | "neutral" | "maintenance"; tile: string; dot: string; rail: string }> = {
  offline: {
    label: "Offline",
    tone: "offline",
    tile: "border-slate-800 bg-slate-950/70 text-slate-400 opacity-75",
    dot: "bg-slate-500",
    rail: "bg-slate-600"
  },
  pairing: {
    label: "Pairing",
    tone: "warning",
    tile: "border-amber-300/25 bg-amber-300/[0.06] text-amber-100",
    dot: "bg-amber-300",
    rail: "bg-amber-300"
  },
  idle: {
    label: "Idle",
    tone: "success",
    tile: "border-emerald-300/25 bg-emerald-300/[0.055] text-emerald-100",
    dot: "bg-emerald-300",
    rail: "bg-emerald-300"
  },
  active_session: {
    label: "Active",
    tone: "active",
    tile: "border-cyan-300/35 bg-cyan-300/[0.08] text-cyan-100 shadow-[0_0_22px_rgba(34,211,238,0.10)]",
    dot: "bg-cyan-300",
    rail: "bg-cyan-300"
  },
  reserved: {
    label: "Reserved",
    tone: "neutral",
    tile: "border-purple-300/25 bg-purple-300/[0.06] text-purple-100",
    dot: "bg-purple-300",
    rail: "bg-purple-300"
  },
  maintenance: {
    label: "Maintenance",
    tone: "maintenance",
    tile: "border-amber-300/30 bg-amber-300/[0.08] text-amber-100",
    dot: "bg-amber-300",
    rail: "bg-amber-300"
  }
};

function getPcState(pc: GamingPc, session?: Session): PcMapState {
  if (pc.maintenanceMode) return "maintenance";
  if ((pc as GamingPc & { reserved?: boolean }).reserved) return "reserved";
  if (session || pc.sessionId || pc.status === "in_use") return "active_session";
  if (pc.status === "offline") return "offline";
  if (!pc.status) return "pairing";
  return "idle";
}

function formatHeartbeat(lastHeartbeat?: number) {
  if (!lastHeartbeat) return "No heartbeat";
  const seconds = Math.max(0, Math.round((Date.now() - lastHeartbeat) / 1000));
  if (seconds < 5) return "Just now";
  if (seconds < 60) return `${seconds}s ago`;
  return `${Math.round(seconds / 60)}m ago`;
}

function getHeartbeatAge(lastHeartbeat?: number) {
  return lastHeartbeat ? Math.max(0, Date.now() - lastHeartbeat) : Number.POSITIVE_INFINITY;
}

function getHeartbeatLabel(lastHeartbeat?: number) {
  const age = getHeartbeatAge(lastHeartbeat);
  if (age <= 10_000) return "Live";
  if (age <= 30_000) return "Lag";
  return "Lost";
}

function getPcSection(pc: GamingPc) {
  const layout = pc as GamingPc & { section?: string };
  if (layout.section) return layout.section;
  if (pc.category === "vip" || pc.type === "Premium") return "VIP";
  return "Main Floor";
}

function getInitials(name?: string) {
  const label = name?.trim() || "Player";
  return label.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function getRemainingMs(pc: GamingPc, session: Session | undefined, remainingBySession: Record<string, number>, serverNow: number) {
  const sessionRemaining = session ? remainingBySession[session.id] ?? 0 : pc.sessionId ? remainingBySession[pc.sessionId] ?? 0 : 0;
  const heartbeatRemaining = pc.heartbeatRemainingSeconds ? pc.heartbeatRemainingSeconds * 1000 : 0;
  const metadataRemaining = pc.activeSessionStartTime && pc.activeSessionDurationSeconds ? getRemainingTime(pc.activeSessionStartTime, pc.activeSessionDurationSeconds, serverNow) : 0;
  return Math.max(sessionRemaining, heartbeatRemaining, metadataRemaining);
}

export function ZonePcMap({ zone, sessions, remainingBySession, serverNow, onStartSession, onAddTime, onEndSession, onMaintenance, onSendMessage }: ZonePcMapProps) {
  const [selectedPcId, setSelectedPcId] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState("All");
  const sessionByPc = useMemo(() => new Map(sessions.filter((session) => session.status === "Active").map((session) => [session.pcId, session])), [sessions]);
  const pcs = zone.pcs;
  const sections = useMemo(() => ["All", ...Array.from(new Set(pcs.map(getPcSection)))], [pcs]);
  const visiblePcs = selectedSection === "All" ? pcs : pcs.filter((pc) => getPcSection(pc) === selectedSection);
  const selectedPc = pcs.find((pc) => pc.id === selectedPcId) ?? pcs[0] ?? null;
  const selectedSession = selectedPc ? sessionByPc.get(selectedPc.id) : undefined;
  const activeCount = pcs.filter((pc) => getPcState(pc, sessionByPc.get(pc.id)) === "active_session").length;
  const offlineCount = pcs.filter((pc) => getPcState(pc, sessionByPc.get(pc.id)) === "offline").length;
  const maintenanceCount = pcs.filter((pc) => getPcState(pc, sessionByPc.get(pc.id)) === "maintenance").length;

  if (!pcs.length) {
    return (
      <section className="rounded-2xl border border-white/10 bg-[#0b0d12] p-5 shadow-nebula">
        <EmptyState title="No PCs mapped yet" description="Pair or add PCs from the PCs page. Real registered machines will appear on this floor map." />
      </section>
    );
  }

  return (
    <section className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="rounded-2xl border border-white/10 bg-[#090b10] p-3 shadow-nebula sm:p-4">
        <div className="flex flex-col justify-between gap-3 border-b border-white/10 pb-3 md:flex-row md:items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-cyan-200">PC Map / Floor View</p>
            <h3 className="mt-1 text-lg font-semibold text-white">{zone.name || "Zone OS"} control floor</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge tone="active">{`${activeCount} active`}</StatusBadge>
            <StatusBadge tone={offlineCount ? "offline" : "success"}>{`${offlineCount} offline`}</StatusBadge>
            <StatusBadge tone={maintenanceCount ? "maintenance" : "neutral"}>{`${maintenanceCount} maintenance`}</StatusBadge>
          </div>
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {sections.map((section) => (
            <button
              className={`shrink-0 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${selectedSection === section ? "border-cyan-200/50 bg-cyan-300/15 text-cyan-50" : "border-white/10 bg-white/[0.035] text-slate-400 hover:border-white/20 hover:text-white"}`}
              key={section}
              onClick={() => setSelectedSection(section)}
              type="button"
            >
              {section}
            </button>
          ))}
        </div>

        <div className="mt-3 grid auto-rows-[108px] grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {visiblePcs.map((pc, index) => {
            const session = sessionByPc.get(pc.id);
            const state = getPcState(pc, session);
            const copy = stateCopy[state];
            const remainingMs = getRemainingMs(pc, session, remainingBySession, serverNow);
            const layout = pc as GamingPc & { mapX?: number; mapY?: number; section?: string };
            const playerName = session?.playerName ?? pc.activePlayerName;
            const heartbeatLabel = getHeartbeatLabel(pc.lastHeartbeat);
            const heartbeatTone = heartbeatLabel === "Live" ? "text-emerald-200" : heartbeatLabel === "Lag" ? "text-amber-200" : "text-slate-500";

            return (
              <button
                className={`group relative overflow-hidden rounded-xl border p-2.5 text-left transition duration-200 hover:-translate-y-0.5 hover:border-cyan-200/45 ${selectedPc?.id === pc.id ? "ring-1 ring-cyan-200/50" : ""} ${copy.tile}`}
                key={pc.id}
                onClick={() => setSelectedPcId(pc.id)}
                style={{
                  gridColumn: layout.mapX ? `${layout.mapX} / span 1` : undefined,
                  gridRow: layout.mapY ? `${layout.mapY} / span 1` : undefined,
                  animationDelay: `${Math.min(index * 20, 180)}ms`
                }}
                type="button"
              >
                <span className={`absolute inset-y-0 left-0 w-1 ${copy.rail}`} />
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${copy.dot} ${state === "active_session" ? "animate-pulse" : ""}`} />
                      <p className="truncate text-sm font-semibold text-white">{pc.name}</p>
                    </div>
                    <p className="mt-0.5 text-[10px] uppercase tracking-[0.14em] opacity-70">{getPcSection(pc)} - {pc.category ?? pc.type}</p>
                  </div>
                  <span className="rounded-lg border border-white/10 bg-black/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-300">{pc.type}</span>
                </div>
                <div className="mt-3 flex items-end justify-between gap-2">
                  <div className="min-w-0 space-y-1">
                    <p className="truncate text-xs">{copy.label}</p>
                    <p className="truncate text-[11px] text-slate-300">{playerName ?? (state === "idle" ? "Ready" : "No player")}</p>
                    <p className="font-mono text-sm font-semibold text-white">{state === "active_session" ? formatTime(remainingMs) : formatHeartbeat(pc.lastHeartbeat)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {playerName ? <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-black/30 text-[10px] font-bold text-cyan-100">{getInitials(playerName)}</span> : <MoreHorizontal className="h-4 w-4 opacity-35" />}
                    <span className={`inline-flex items-center gap-1 text-[10px] ${heartbeatTone}`}><Signal className="h-3 w-3" /> {heartbeatLabel}</span>
                  </div>
                </div>
                {state === "maintenance" ? <Lock className="absolute bottom-2 right-2 h-3.5 w-3.5 text-amber-100/70" /> : null}
              </button>
            );
          })}
        </div>
      </div>

      <aside className="space-y-3 xl:sticky xl:top-4 xl:self-start">
        <div className="rounded-2xl border border-white/10 bg-[#0b0d12] p-3 shadow-nebula">
          <p className="text-xs uppercase tracking-[0.18em] text-purple-200">Selected PC</p>
          {selectedPc ? (
            <div className="mt-4">
              {(() => {
                const state = getPcState(selectedPc, selectedSession);
                const remainingMs = getRemainingMs(selectedPc, selectedSession, remainingBySession, serverNow);
                return (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-white">{selectedPc.name}</h3>
                        <p className="mt-1 text-xs text-slate-500">{getPcSection(selectedPc)} - {selectedPc.category ?? selectedPc.type} - {formatSpica(selectedPc.ratePerHour)}/hour</p>
                      </div>
                      <StatusBadge pulse={state === "active_session"} tone={stateCopy[state].tone}>{stateCopy[state].label}</StatusBadge>
                    </div>

                    <div className="mt-3 grid gap-2 text-sm">
                      <div className="flex items-center justify-between rounded-xl bg-black/25 px-3 py-2">
                        <span className="flex items-center gap-2 text-slate-400"><UserRound className="h-4 w-4" /> Player</span>
                        <span className="max-w-36 truncate text-white">{selectedSession?.playerName ?? selectedPc.activePlayerName ?? "None"}</span>
                      </div>
                      <div className="flex items-center justify-between rounded-xl bg-black/25 px-3 py-2">
                        <span className="flex items-center gap-2 text-slate-400"><Clock3 className="h-4 w-4" /> Remaining</span>
                        <span className="font-mono text-white">{state === "active_session" ? formatTime(remainingMs) : "Idle"}</span>
                      </div>
                      <div className="flex items-center justify-between rounded-xl bg-black/25 px-3 py-2">
                        <span className="flex items-center gap-2 text-slate-400"><Radio className="h-4 w-4" /> Heartbeat</span>
                        <span className="text-white">{formatHeartbeat(selectedPc.lastHeartbeat)}</span>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <AppButton className="rounded-xl px-3 py-2 text-xs" disabled={state !== "idle"} onClick={() => onStartSession(selectedPc)} type="button">Start</AppButton>
                      <AppButton className="rounded-xl px-3 py-2 text-xs" disabled={!selectedSession} onClick={() => selectedSession && onAddTime(selectedSession.id, 15)} type="button" variant="secondary">+15 min</AppButton>
                      <AppButton className="rounded-xl px-3 py-2 text-xs" disabled={!selectedSession} onClick={() => selectedSession && onEndSession(selectedSession.id)} type="button" variant="danger">End</AppButton>
                      <AppButton className="rounded-xl px-3 py-2 text-xs" onClick={() => onSendMessage(selectedPc.id)} type="button" variant="ghost">Message</AppButton>
                      <button className="rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-white/20 hover:text-white" onClick={() => navigator.clipboard?.writeText([selectedPc.name, selectedSession?.playerName, selectedSession?.id].filter(Boolean).join(" | "))} type="button">
                        <span className="inline-flex items-center gap-2"><Copy className="h-3.5 w-3.5" /> Copy info</span>
                      </button>
                      <button className="col-span-2 rounded-xl border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-xs font-semibold text-amber-100 transition hover:border-amber-100/60 disabled:opacity-40" disabled={Boolean(selectedSession)} onClick={() => onMaintenance(selectedPc.id, !selectedPc.maintenanceMode)} type="button">
                        <span className="inline-flex items-center gap-2"><Wrench className="h-3.5 w-3.5" /> {selectedPc.maintenanceMode ? "Return to service" : "Maintenance mode"}</span>
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
          ) : (
            <EmptyState title="Select a PC" description="Click a tile to inspect status and available operator actions." />
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-3">
          <p className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-cyan-200"><Activity className="h-4 w-4" /> Live Sessions</p>
          <div className="mt-3 space-y-2">
            {sessions.filter((session) => session.status === "Active").slice(0, 5).map((session) => (
              <div className="rounded-xl bg-black/25 px-3 py-2" key={session.id}>
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-white">{session.pcName}</p>
                  <span className="font-mono text-xs text-cyan-100">{formatTime(remainingBySession[session.id] ?? 0)}</span>
                </div>
                <p className="mt-1 truncate text-xs text-slate-500">{session.playerName} - {formatSpica(session.grossSpica)}</p>
              </div>
            ))}
            {!sessions.some((session) => session.status === "Active") ? <p className="text-sm text-slate-500">No active sessions.</p> : null}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-3">
          <p className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-amber-200"><Monitor className="h-4 w-4" /> Offline / Alerts</p>
          <div className="mt-3 space-y-2">
            {pcs.filter((pc) => getPcState(pc, sessionByPc.get(pc.id)) === "offline" || pc.maintenanceMode).slice(0, 5).map((pc) => (
              <div className="flex items-center justify-between rounded-xl bg-black/25 px-3 py-2 text-sm" key={`alert-${pc.id}`}>
                <span className="truncate text-slate-300">{pc.name}</span>
                <span className="text-xs text-slate-500">{pc.maintenanceMode ? "Maintenance" : formatHeartbeat(pc.lastHeartbeat)}</span>
              </div>
            ))}
            {!pcs.some((pc) => getPcState(pc, sessionByPc.get(pc.id)) === "offline" || pc.maintenanceMode) ? <p className="text-sm text-slate-500">No operational alerts.</p> : null}
          </div>
        </div>
      </aside>
    </section>
  );
}
