"use client";

import { useEffect, useState } from "react";
import { Building2 } from "lucide-react";
import { RoleSidebar } from "@/components/RoleSidebar";

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

  useEffect(() => {
    async function loadRequests() {
      const response = await fetch("/api/listing-requests", { credentials: "include" });
      const payload = await response.json().catch(() => ({}));
      setLoading(false);

      if (!response.ok) {
        setError(payload.error ?? "Could not load listing requests.");
        return;
      }

      setRequests(payload.requests ?? []);
    }

    loadRequests();
  }, []);

  return (
    <main className="min-h-screen">
      <RoleSidebar activeView="Requests" onViewChange={() => undefined} role="admin" />
      <section className="px-5 py-6 md:px-8 md:py-8 lg:pl-80">
        <div className="mb-6">
          <p className="text-sm text-slate-500">Ezzstar Admin</p>
          <h1 className="mt-2 text-2xl font-semibold text-white">Zone Listing Requests</h1>
        </div>

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

        {loading ? <p className="p-5 text-sm text-slate-400">Loading command center...</p> : null}
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
                    <td className="px-4 py-3 capitalize">{request.status}</td>
                    <td className="px-4 py-3">{new Date(request.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
                {!requests.length ? (
                  <tr>
                    <td className="px-4 py-5 text-slate-500" colSpan={7}>
                      No listing requests yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        ) : null}
        </div>
      </section>
    </main>
  );
}
