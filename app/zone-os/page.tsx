import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, Download, ExternalLink, PackageCheck, Server, Wifi } from "lucide-react";
import { getInstallerDownloads, type InstallerDownload } from "@/lib/downloads";
import { requirePageRole } from "@/lib/page-auth";
import { selectRows } from "@/lib/supabase/web";
import { getZoneOsRuntimeInfo } from "@/lib/zone-os-runtime-info";

function DownloadButton({ installer, label }: { installer: InstallerDownload; label: string }) {
  const className = installer.isAvailable
    ? "inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-300/30 bg-cyan-300/15 px-5 py-3 text-sm font-semibold text-cyan-50 transition hover:border-cyan-200/60 hover:bg-cyan-300/20"
    : "inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-5 py-3 text-sm font-semibold text-cyan-100 opacity-60";

  if (!installer.isAvailable || !installer.downloadUrl) {
    return (
      <button className={className} disabled type="button">
        <Download className="h-4 w-4" />
        {label}
        <span className="rounded-full border border-cyan-200/20 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-cyan-200">Coming soon</span>
      </button>
    );
  }

  const isLocalPublicFile = installer.source === "local-public";

  return (
    <a
      className={className}
      download={isLocalPublicFile ? installer.localFileName : undefined}
      href={installer.downloadUrl}
      rel={isLocalPublicFile ? undefined : "noreferrer"}
      target={isLocalPublicFile ? undefined : "_blank"}
    >
      <Download className="h-4 w-4" />
      {label}
    </a>
  );
}

export default async function ZoneOsLandingPage() {
  const profile = await requirePageRole(["zone_owner", "manager"]);
  const activeZones = await selectRows<{ id: string }>(
    "zones",
    `owner_id=eq.${encodeURIComponent(profile.id)}&status=eq.active&select=id&limit=1`
  ).catch(() => []);

  if (!activeZones.length) {
    redirect("/list-your-zone?status=pending");
  }

  const runtime = getZoneOsRuntimeInfo();
  const installers = getInstallerDownloads();
  const zoneOsInstaller = installers.find((installer) => installer.id === "zone-os")!;
  const pcClientInstaller = installers.find((installer) => installer.id === "pc-client")!;

  return (
    <main className="min-h-screen bg-[#050508] px-5 py-10 text-white">
      <section className="mx-auto flex min-h-[70vh] max-w-4xl items-center">
        <div className="w-full rounded-2xl border border-white/10 bg-white/[0.055] p-6 shadow-nebula">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200">Approved operator access</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Download SPICA Zone OS</h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Install the local operator software on your gaming zone server PC. Zone OS runs on your LAN for PC pairing, session control, realtime commands, and settlement tracking.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <DownloadButton installer={zoneOsInstaller} label="Download SPICA Zone OS for Windows" />
            <DownloadButton installer={pcClientInstaller} label="Download SPICA PC Client for Windows" />
            <Link className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-white/25 hover:text-white" href="/zone">
              <ExternalLink className="h-4 w-4" />
              Open Local Zone OS
            </Link>
            <Link className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-white/25 hover:text-white" href="/docs/zone-os-local-runtime">
              View setup guide
            </Link>
          </div>

          <div className="mt-6 rounded-2xl border border-white/10 bg-black/25 p-4">
            <div className="flex items-center gap-2">
              <PackageCheck className="h-5 w-5 text-cyan-100" />
              <h2 className="text-sm font-semibold text-white">Latest installer updates</h2>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {installers.map((installer) => (
                <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4" key={installer.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-white">{installer.productName}</h3>
                      <p className="mt-1 text-xs text-slate-500">
                        v{installer.version} · {installer.fileSize} · Updated {installer.updatedAt}
                      </p>
                    </div>
                    <span className={installer.isAvailable ? "rounded-full border border-emerald-300/25 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-100" : "rounded-full border border-amber-300/25 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-100"}>
                      {installer.isAvailable ? "Available" : "Coming soon"}
                    </span>
                  </div>
                  <ul className="mt-3 space-y-2 text-sm leading-5 text-slate-400">
                    {installer.releaseNotes.map((note) => (
                      <li className="flex gap-2" key={`${installer.id}-${note}`}>
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-cyan-100" />
                        <span>{note}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4">
                    <DownloadButton installer={installer} label="Download latest" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {[
              { icon: Server, title: "Windows PC/server", detail: "Install on the main operator/server PC at your gaming zone." },
              { icon: Wifi, title: "Same LAN as gaming PCs", detail: "Client PCs must be on the same local network for pairing and control." },
              { icon: CheckCircle2, title: "Local database", detail: "Installer will bundle or configure PostgreSQL/local database setup." },
              { icon: CheckCircle2, title: "Internet for first login", detail: "Ezzstar verification is needed on first setup and owner sign-in." }
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div className="rounded-2xl border border-white/10 bg-black/25 p-4" key={item.title}>
                  <Icon className="h-5 w-5 text-cyan-100" />
                  <h3 className="mt-3 font-semibold text-white">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{item.detail}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Local URL</p>
              <p className="mt-2 truncate font-mono text-sm text-cyan-100">{runtime.localUrl}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">LAN URL</p>
              <p className="mt-2 truncate font-mono text-sm text-cyan-100">{runtime.lanUrl ?? "Detected after install"}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Runtime Status</p>
              <p className={runtime.localDatabaseReady ? "mt-2 text-sm font-semibold text-emerald-100" : "mt-2 text-sm font-semibold text-amber-100"}>
                {runtime.localDatabaseReady ? "Local database configured" : "Installer required"}
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-purple-300/15 bg-purple-300/10 p-4 text-sm text-purple-50">
            The Windows installer will automatically create/check the local database, generate runtime secrets, start local services, and expose a LAN URL for PC clients. Developer setup commands remain in the internal docs.
          </div>
        </div>
      </section>
    </main>
  );
}
