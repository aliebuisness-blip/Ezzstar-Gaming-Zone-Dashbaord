"use client";

import { useEffect, useState } from "react";
import { Building2, Mail, Phone } from "lucide-react";
import { RoleSidebar } from "@/components/RoleSidebar";
import { Topbar } from "@/components/Topbar";
import { EmptyState } from "@/components/ui/EmptyState";
import { AppButton } from "@/components/ui/AppButton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useDashboardFeedback } from "@/components/DashboardFeedback";

type ListingRequest = {
  id: string;
  ownerName: string;
  email: string;
  phone: string;
  zoneName: string;
  city: string;
  pcCount: number;
  currentPricingModel: string;
  message?: string | null;
  status: string;
  createdAt: string;
};

export function ListingRequestsPanel() {
  const [requests, setRequests] = useState<ListingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<ListingRequest | null>(null);
  const { confirm, toast } = useDashboardFeedback();

  useEffect(() => {
    async function loadRequests() {
      const response = await fetch("/api/listing-requests", { credentials: "include" });
      const payload = await response.json().catch(() => ({}));
      setLoading(false);

      if (!response.ok) {
        setError("Listing requests could not be loaded.");
        toast("error", "Listing requests could not be loaded.");
        return;
      }

      setRequests(payload.requests ?? []);
    }

    loadRequests();
  }, []);

  async function markRequest(request: ListingRequest, status: "approved" | "rejected" | "contacted") {
    const confirmed = await confirm({
      title: `${status === "approved" ? "Approve" : status === "rejected" ? "Reject" : "Contact"} request?`,
      description: `${request.zoneName} in ${request.city} will be marked as ${status} in this admin workspace.`,
      impact: "This is a dashboard-side review marker until the full owner onboarding workflow is connected.",
      confirmLabel: status === "approved" ? "Approve" : status === "rejected" ? "Reject" : "Mark contacted",
      destructive: status === "rejected"
    });

    if (!confirmed) return;

    setRequests((current) => current.map((item) => (item.id === request.id ? { ...item, status } : item)));
    toast("success", `Request marked ${status}.`);
  }

  return (
    <main className="min-h-screen">
      <RoleSidebar activeView="Requests" onViewChange={() => undefined} role="admin" />
      <section className="px-5 py-6 md:px-8 md:py-8 lg:pl-80">
        <Topbar activeZones={0} commissionEarned={0} eyebrow="Ezzstar Admin" playerBalance={0} title="Zone Listing Requests" />

        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.055] shadow-nebula">
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
          <div className="rounded-2xl border border-cyan-300/25 bg-cyan-300/10 p-3 text-cyan-100">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold text-white">Business intake</h2>
            <p className="text-sm text-slate-500">Review requests before creating private owner accounts.</p>
          </div>
        </div>

        {loading ? <p className="p-5 text-sm text-slate-400">Loading listing requests...</p> : null}
        {error ? <p className="p-5 text-sm text-red-100">{error}</p> : null}

        {!loading && !error ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-white/[0.04] text-xs uppercase tracking-[0.16em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Zone</th>
                  <th className="px-4 py-3">Owner</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">PCs</th>
                  <th className="px-4 py-3">Pricing</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Received</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {requests.map((request) => (
                  <tr className="text-slate-300" key={request.id}>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-white">{request.zoneName}</p>
                      <p className="text-xs text-slate-500">{request.city}</p>
                    </td>
                    <td className="px-4 py-3">{request.ownerName}</td>
                    <td className="px-4 py-3">
                      <p>{request.email}</p>
                      <p className="text-xs text-slate-500">{request.phone}</p>
                    </td>
                    <td className="px-4 py-3">{request.pcCount}</td>
                    <td className="px-4 py-3">{request.currentPricingModel}</td>
                    <td className="px-4 py-3"><StatusBadge tone={request.status === "approved" ? "success" : request.status === "rejected" ? "danger" : "warning"}>{request.status}</StatusBadge></td>
                    <td className="px-4 py-3">{new Date(request.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <AppButton onClick={() => setSelectedRequest(request)} type="button" variant="ghost">Details</AppButton>
                        <AppButton onClick={() => markRequest(request, "approved")} type="button">Approve</AppButton>
                        <AppButton onClick={() => markRequest(request, "contacted")} type="button" variant="secondary">Contact</AppButton>
                        <AppButton onClick={() => markRequest(request, "rejected")} type="button" variant="danger">Reject</AppButton>
                      </div>
                    </td>
                  </tr>
                ))}
                {!requests.length ? (
                  <tr>
                    <td className="px-4 py-5" colSpan={8}>
                      <EmptyState title="No pending requests" description="Gaming zone listing requests from the public form will appear here." />
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        ) : null}
        </div>
      </section>
      {selectedRequest ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 px-4 backdrop-blur-md">
          <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#0b0d13] p-5 shadow-nebula">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-cyan-200">Listing Request</p>
                <h2 className="mt-2 text-xl font-semibold text-white">{selectedRequest.zoneName}</h2>
                <p className="mt-1 text-sm text-slate-500">{selectedRequest.city} - {selectedRequest.pcCount} PCs</p>
              </div>
              <button className="rounded-full border border-white/10 px-3 py-1 text-sm text-slate-300" onClick={() => setSelectedRequest(null)} type="button">Close</button>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                <p className="font-semibold text-white">{selectedRequest.ownerName}</p>
                <p className="mt-2 flex items-center gap-2 text-sm text-slate-400"><Mail className="h-4 w-4" /> {selectedRequest.email}</p>
                <p className="mt-2 flex items-center gap-2 text-sm text-slate-400"><Phone className="h-4 w-4" /> {selectedRequest.phone}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                <p className="text-sm text-slate-500">Current pricing</p>
                <p className="mt-2 text-white">{selectedRequest.currentPricingModel}</p>
              </div>
            </div>
            <p className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm leading-6 text-slate-300">{selectedRequest.message || "No extra message provided."}</p>
          </div>
        </div>
      ) : null}
    </main>
  );
}
