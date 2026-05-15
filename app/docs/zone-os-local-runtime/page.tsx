import Link from "next/link";

export default function ZoneOsSetupGuidePage() {
  return (
    <main className="min-h-screen bg-[#050508] px-5 py-10 text-white">
      <section className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-white/[0.055] p-6 shadow-nebula">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200">SPICA Zone OS</p>
        <h1 className="mt-3 text-3xl font-semibold">Setup guide</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          The Windows installer is being prepared. Until then, Ezzstar support can use the internal developer setup documented in the repository.
        </p>
        <div className="mt-6 space-y-4 text-sm leading-6 text-slate-300">
          <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
            <h2 className="font-semibold text-white">Operator PC requirements</h2>
            <p className="mt-2">Use a Windows PC/server connected to the same LAN as all gaming PCs. Internet is required for first login and ownership verification.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
            <h2 className="font-semibold text-white">What the installer will do</h2>
            <p className="mt-2">It will configure the local database, generate runtime secrets, start realtime services, and open Zone OS for the operator.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
            <h2 className="font-semibold text-white">PC client connection</h2>
            <p className="mt-2">After installation, Zone OS will show a LAN URL and pairing flow for gaming PCs on the same network.</p>
          </div>
        </div>
        <Link className="mt-6 inline-flex rounded-2xl border border-cyan-300/25 bg-cyan-300/15 px-5 py-3 text-sm font-semibold text-cyan-50 transition hover:border-cyan-100/60" href="/zone-os">
          Back to download
        </Link>
      </section>
    </main>
  );
}
