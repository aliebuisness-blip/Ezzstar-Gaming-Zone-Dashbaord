import Link from "next/link";
import { requirePageRole } from "@/lib/page-auth";

export default async function ZoneOsLandingPage() {
  await requirePageRole(["zone_owner", "manager"]);

  return (
    <main className="min-h-screen bg-[#050508] px-5 py-10 text-white">
      <section className="mx-auto flex min-h-[70vh] max-w-3xl items-center">
        <div className="w-full rounded-2xl border border-white/10 bg-white/[0.055] p-6 shadow-nebula">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200">SPICA Zone OS</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Open your local operator software</h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Your gaming zone is approved. SPICA Zone OS runs as the local operator surface for PCs, sessions, pairing, and settlements.
          </p>
          <div className="mt-6 rounded-2xl border border-cyan-300/15 bg-cyan-300/10 p-4 text-sm text-cyan-50">
            Set <code className="rounded bg-black/30 px-1.5 py-0.5">NEXT_PUBLIC_ZONE_OS_URL</code> to your deployed or local Zone OS URL to open it directly after login.
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link className="rounded-2xl border border-cyan-300/25 bg-cyan-300/15 px-5 py-3 text-sm font-semibold text-cyan-50 transition hover:border-cyan-100/60" href="/list-your-zone">
              View application status
            </Link>
            <Link className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-white/25 hover:text-white" href="/login">
              Switch account
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
