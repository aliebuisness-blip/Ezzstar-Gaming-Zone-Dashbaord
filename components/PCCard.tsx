"use client";

import { Clock3, LogOut, MessageSquare, Play, Plus, ShieldAlert, Wrench } from "lucide-react";
import clsx from "clsx";
import { formatTime } from "@/lib/timer";
import { GamingPc, formatSpica } from "@/lib/spica";
import { AppButton } from "@/components/ui/AppButton";
import { AppCard } from "@/components/ui/AppCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ActionMenu } from "@/components/ui/ActionMenu";

type PCCardProps = {
  pc: GamingPc;
  remainingMs: number;
  onStart: (pc: GamingPc) => void;
  onAddTime: (sessionId: string, minutes: number) => void;
  onEnd: (sessionId: string) => void;
};

export function PCCard({ pc, remainingMs, onStart, onAddTime, onEnd }: PCCardProps) {
  const isOffline = pc.status === "offline";
  const isActive = Boolean(pc.sessionId) || pc.status === "in_use";
  const isExpired = isActive && remainingMs <= 0;
  const isRecovering = isOffline && Boolean(pc.sessionId);
  const isMaintenance = Boolean(pc.maintenanceMode);
  const statusLabel = isMaintenance ? "Maintenance" : isRecovering ? "Recovering" : isOffline ? "Offline" : isActive ? "In Use" : "Online";

  const statusTone = isMaintenance ? "maintenance" : isRecovering ? "recovering" : isOffline ? "offline" : isActive ? "danger" : "online";
  const progress = isActive && pc.activeSessionDurationSeconds ? Math.max(0, Math.min(100, (remainingMs / (pc.activeSessionDurationSeconds * 1000)) * 100)) : 0;
  const endingSoon = isActive && remainingMs > 0 && remainingMs <= 5 * 60 * 1000;

  return (
    <AppCard compact interactive className="group hover:border-cyan-200/30 hover:shadow-glow">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">{pc.name}</h3>
          <p className="mt-1 text-sm text-slate-500">{pc.type} - {formatSpica(pc.ratePerHour)}/hour</p>
          <p className="mt-1 text-xs text-slate-600">{pc.machineName ?? pc.ipAddress ?? pc.id}</p>
        </div>
        <div className="flex items-start gap-2">
          <StatusBadge pulse={isActive || statusTone === "online" || isRecovering} tone={statusTone}>
            {statusLabel}
          </StatusBadge>
          <ActionMenu
            items={[
              { label: "Start session", icon: <Play className="h-4 w-4" />, disabled: isActive || isOffline || isMaintenance, onSelect: () => onStart(pc) },
              { label: "Add 15 min", icon: <Plus className="h-4 w-4" />, disabled: !isActive || !pc.sessionId, onSelect: () => pc.sessionId && onAddTime(pc.sessionId, 15) },
              { label: "End session", icon: <LogOut className="h-4 w-4" />, disabled: !isActive || !pc.sessionId, destructive: true, onSelect: () => pc.sessionId && onEnd(pc.sessionId) },
              { label: "Send message", icon: <MessageSquare className="h-4 w-4" />, disabled: isOffline, onSelect: () => undefined },
              { label: "Maintenance", icon: <Wrench className="h-4 w-4" />, onSelect: () => undefined },
              { label: "Flag recovery", icon: <ShieldAlert className="h-4 w-4" />, disabled: !isRecovering, onSelect: () => undefined }
            ]}
          />
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-3">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-500">
          <Clock3 className="h-4 w-4" />
          Session Time
        </div>
        <div
          className={clsx(
            "mt-2 font-mono text-2xl font-bold tracking-wide transition",
            isActive ? "text-cyan-100 drop-shadow-[0_0_14px_rgba(34,211,238,0.55)]" : "text-slate-600"
          )}
        >
          {isExpired ? "Expired" : isActive ? formatTime(remainingMs) : "00:00:00"}
        </div>
        {isActive ? (
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className={clsx("h-full rounded-full transition-all duration-700", endingSoon ? "bg-amber-300" : "bg-cyan-300")}
              style={{ width: `${progress || 100}%` }}
            />
          </div>
        ) : null}
        <div className="mt-2 grid gap-1 text-xs text-slate-500">
          <span>Last heartbeat: {pc.lastHeartbeat ? new Date(pc.lastHeartbeat).toLocaleTimeString() : "No heartbeat"}</span>
          <span>Active player: {pc.activePlayerName ?? "None"}</span>
          {endingSoon ? <span className="text-amber-200">Session ending soon</span> : null}
          {pc.recoveryWarning ? <span className="text-amber-200">{pc.recoveryWarning}</span> : null}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <AppButton
          className="min-w-0 flex-1"
          disabled={isActive || isOffline}
          onClick={() => onStart(pc)}
          type="button"
        >
          <Play className="h-4 w-4" />
          Start Session
        </AppButton>

        {isActive ? (
          <AppButton
            className="min-w-0 flex-1"
            onClick={() => pc.sessionId && onAddTime(pc.sessionId, 15)}
            type="button"
            variant="secondary"
          >
            <Plus className="h-4 w-4" />
            Add Time
          </AppButton>
        ) : null}

        <AppButton
          className="min-w-0 flex-1"
          disabled={!isActive}
          onClick={() => pc.sessionId && onEnd(pc.sessionId)}
          type="button"
          variant={isActive ? "danger" : "ghost"}
        >
          <LogOut className="h-4 w-4" />
          End Session
        </AppButton>
      </div>
    </AppCard>
  );
}
