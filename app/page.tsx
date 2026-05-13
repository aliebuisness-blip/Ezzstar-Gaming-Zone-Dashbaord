import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#050508] px-5 py-6 text-white md:px-10">
      <section className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl flex-col justify-between">
        <nav className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-cyan-200">Ezzstar</p>
            <h1 className="mt-1 text-xl font-semibold">SPICA Arena OS</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link className="rounded-xl px-3 py-2 text-sm text-slate-300 transition hover:bg-white/[0.06] hover:text-white" href="/login">
              Sign in
            </Link>
            <Link className="rounded-xl border border-cyan-300/25 bg-cyan-300/10 px-3 py-2 text-sm font-semibold text-cyan-50 transition hover:border-cyan-200/60" href="/signup">
              Create account
            </Link>
          </div>
        </nav>

        <div className="grid gap-8 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-purple-200">Ezzstar Web App</p>
            <h2 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-white md:text-6xl">
              One Ezzstar identity for players, zones, and the SPICA network.
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-400">
              Use this portal to sign in, manage your account, list a gaming zone, and access Ezzstar control tools. Zone operations and player companion features stay separated in their own surfaces.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link className="rounded-2xl border border-cyan-300/25 bg-cyan-300/12 px-5 py-3 text-sm font-semibold text-cyan-50 transition hover:border-cyan-100/60" href="/login">
                Login to Ezzstar
              </Link>
              <Link className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-purple-200/40 hover:text-white" href="/list-your-zone">
                List your gaming zone
              </Link>
            </div>
          </div>

          <div className="grid gap-3">
            {[
              ["SPICA Player App", "Mobile companion for balance, active sessions, and play history.", "/player"],
              ["SPICA Zone OS", "Operator software for PCs, sessions, settlements, and local arena control.", "/zone"],
              ["Ezzstar Control Center", "Admin workspace for approvals, zones, players, and ecosystem health.", "/admin"]
            ].map(([title, description, href]) => (
              <Link className="rounded-2xl border border-white/10 bg-white/[0.045] p-5 transition hover:border-cyan-200/30 hover:bg-white/[0.07]" href={href} key={title}>
                <p className="text-lg font-semibold text-white">{title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
              </Link>
            ))}
          </div>
        </div>

        <footer className="border-t border-white/10 py-5 text-xs text-slate-500">
          SPICA PC Client remains a separate Electron runtime for gaming PCs.
        </footer>
      </section>
    </main>
  );
}
