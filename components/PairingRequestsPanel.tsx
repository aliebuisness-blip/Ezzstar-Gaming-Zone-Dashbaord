"use client";

import { useEffect, useState } from "react";
import { Check, RefreshCw, X } from "lucide-react";
import { AppButton } from "@/components/ui/AppButton";
import { AppCard } from "@/components/ui/AppCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";

type PairingRequest = {
  id: string;
  machineName: string;
  ipAddress?: string | null;
  fingerprint: string;
  installedVersion?: string | null;
  requestedPcName?: string | null;
  assignedPcName?: string | null;
  status: "pending" | "approved" | "rejected" | "expired";
  createdAt: string;
};

export function PairingRequestsPanel() {
  const [requests, setRequests] = useState<PairingRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [pcNameById, setPcNameById] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);

  async function loadRequests() {
    setLoading(true);
    const response = await fetch("/api/pc-pairing", { credentials: "include" });
    const payload = await response.json().catch(() => ({}));
    setLoading(false);

    if (response.ok) {
      setRequests(payload.pairingRequests ?? []);
    } else {
      setMessage(payload.error ?? "Could not load pairing requests.");
    }
  }

  async function approve(id: string) {
    const request = requests.find((item) => item.id === id);
    const pcName = pcNameById[id] || request?.requestedPcName || request?.machineName || "PC";
    const response = await fetch(`/api/pc-pairing/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ action: "approve", pcName, category: "standard", ratePerHour: 100 })
    });
    const payload = await response.json().catch(() => ({}));
    setMessage(response.ok ? `${pcName} paired successfully.` : payload.error ?? "Pairing approval failed.");
    await loadRequests();
  }

  async function reject(id: string) {
    const response = await fetch(`/api/pc-pairing/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ action: "reject", reason: "Rejected by zone operator" })
    });
    const payload = await response.json().catch(() => ({}));
    setMessage(response.ok ? "Pairing request rejected." : payload.error ?? "Pairing rejection failed.");
    await loadRequests();
  }

  useEffect(() => {
    loadRequests();
  }, []);

  const pending = requests.filter((request) => request.status === "pending");

  return (
    <AppCard>
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Plug & Play Pairing</p>
          <h3 className="mt-2 text-lg font-semibold text-white">New PC Requests</h3>
          <p className="mt-1 text-sm text-slate-500">Client PCs can discover this Zone Host and ask to be paired without manual IP or token setup.</p>
        </div>
        <AppButton onClick={loadRequests} type="button" variant="ghost">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </AppButton>
      </div>

      {message ? <p className="mt-4 rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-slate-300">{message}</p> : null}

      <div className="mt-5 space-y-3">
        {loading ? <p className="text-sm text-slate-500">Loading command center...</p> : null}
        {!loading && pending.length === 0 ? (
          <EmptyState description="Launch a PC client on the same LAN. It will discover the Zone Host and appear here for approval." title="No pending PC requests" />
        ) : null}
        {pending.map((request) => (
          <div className="grid gap-3 rounded-2xl border border-white/10 bg-black/25 p-3 md:grid-cols-[1fr_180px_auto] md:items-center" key={request.id}>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-white">{request.machineName}</p>
                <StatusBadge pulse tone="warning">Pending</StatusBadge>
              </div>
              <div className="mt-2 grid gap-1 text-xs text-slate-500 md:grid-cols-2">
                <span>Network: {request.ipAddress ?? "Same local network"}</span>
                <span>Requested: {request.requestedPcName ?? "Auto name"}</span>
                <span>Device ID: {request.fingerprint.slice(0, 18)}...</span>
                <span>Requested at: {new Date(request.createdAt).toLocaleString()}</span>
                {request.installedVersion ? <span>Client version: {request.installedVersion}</span> : null}
              </div>
            </div>
            <input
              className="app-input py-2"
              onChange={(event) => setPcNameById((current) => ({ ...current, [request.id]: event.target.value }))}
              placeholder="PC name"
              value={pcNameById[request.id] ?? request.requestedPcName ?? ""}
            />
            <div className="flex gap-2">
              <AppButton onClick={() => approve(request.id)} type="button">
                <Check className="h-4 w-4" />
                Approve
              </AppButton>
              <AppButton onClick={() => reject(request.id)} type="button" variant="danger">
                <X className="h-4 w-4" />
              </AppButton>
            </div>
          </div>
        ))}
      </div>
    </AppCard>
  );
}
