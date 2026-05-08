"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthShell } from "@/components/AuthShell";

const rolePath = {
  player: "/player",
  zone_owner: "/zone",
  manager: "/zone",
  admin: "/admin"
} as const;

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("player@spica.local");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const payload = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(payload.error ?? "Sign in failed");
      return;
    }

    router.push(rolePath[payload.user.role as keyof typeof rolePath]);
  }

  return (
    <AuthShell eyebrow="Command access" title="One account. Every arena." description="Sign in to your SPICA identity, gaming zone console, or Ezzstar command center with role-aware routing.">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">SPICA ARENA OS</p>
      <h1 className="mt-3 text-3xl font-semibold text-white">Sign in</h1>
      <p className="mt-3 text-sm leading-6 text-slate-400">Use your player, zone owner, manager, or admin account.</p>
      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <input autoComplete="email" className="w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-200/50" onChange={(event) => setEmail(event.target.value)} placeholder="Email" type="email" value={email} />
        <input autoComplete="current-password" className="w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-200/50" onChange={(event) => setPassword(event.target.value)} placeholder="Password" type="password" value={password} />
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
        <button className="w-full rounded-2xl border border-cyan-300/25 bg-cyan-300/15 px-5 py-3 font-semibold text-cyan-50 transition hover:border-cyan-100/60 hover:shadow-[0_0_28px_rgba(34,211,238,0.22)]" disabled={loading} type="submit">
          {loading ? "Syncing your profile..." : "Sign in"}
        </button>
      </form>
      <div className="mt-5 flex flex-col gap-2 text-sm text-slate-400">
        <Link className="text-cyan-100 hover:text-white" href="/forgot-password">Forgot password?</Link>
        <Link className="text-cyan-100 hover:text-white" href="/signup">Do not have an account? Create one</Link>
        <Link className="text-purple-100 hover:text-white" href="/list-your-zone">Want to list your gaming zone? Contact us</Link>
      </div>
    </AuthShell>
  );
}
