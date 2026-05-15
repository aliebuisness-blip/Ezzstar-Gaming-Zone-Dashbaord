"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthShell } from "@/components/AuthShell";

const rolePath = {
  player: "/player",
  zone_owner: "/zone",
  manager: "/zone",
  zone_manager: "/zone",
  admin: "/admin"
} as const;

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [redirectTarget, setRedirectTarget] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setRedirectTarget("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const payload = await response.json().catch(() => ({ ok: false, error: "Sign in failed. Please try again." }));
      const redirectTo = typeof payload.redirectTo === "string"
        ? payload.redirectTo
        : rolePath[payload.user?.role as keyof typeof rolePath];

      if (process.env.NODE_ENV === "development") {
        console.log("Login API status", response.status);
        console.log("Login API response", payload);
        console.log("Login redirectTo", redirectTo);
      }

      if (!response.ok || payload.ok === false) {
        setError(payload.error ?? "Sign in failed. Please try again.");
        setLoading(false);
        return;
      }

      if (!redirectTo) {
        setError("Login successful, but redirect failed. Go to dashboard");
        setRedirectTarget("/player");
        setLoading(false);
        return;
      }

      setRedirectTarget(redirectTo);

      window.setTimeout(() => {
        if (window.location.pathname === "/login") {
          setError("Login successful, but redirect failed. Go to dashboard");
          setLoading(false);
        }
      }, 1500);

      if (/^https?:\/\//.test(redirectTo)) {
        window.location.assign(redirectTo);
        return;
      }

      router.push(redirectTo);
      router.refresh();
    } catch (loginError) {
      if (process.env.NODE_ENV === "development") {
        console.log("Login request failed", loginError);
      }
      setError("Sign in failed. Please check your connection and try again.");
      setLoading(false);
    }
  }

  return (
    <AuthShell eyebrow="Command access" title="One account. Every arena." description="Sign in to your SPICA identity, gaming zone console, or Ezzstar command center with role-aware routing.">
      <Link className="inline-flex text-sm font-medium text-slate-400 transition hover:text-cyan-100" href="/">
        Back to home
      </Link>
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">SPICA ARENA OS</p>
      <h1 className="mt-3 text-3xl font-semibold text-white">Sign in</h1>
      <p className="mt-3 text-sm leading-6 text-slate-400">Use your player, zone owner, manager, or admin account.</p>
      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <input autoComplete="email" className="w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-200/50" onChange={(event) => setEmail(event.target.value)} placeholder="Email" type="email" value={email} />
        <input autoComplete="current-password" className="w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-200/50" onChange={(event) => setPassword(event.target.value)} placeholder="Password" type="password" value={password} />
        {error ? (
          <div className="rounded-2xl border border-red-400/20 bg-red-950/30 px-4 py-3 text-sm text-red-100">
            <p>{error}</p>
            {redirectTarget ? (
              <Link className="mt-2 inline-flex text-cyan-100 transition hover:text-white" href={redirectTarget}>
                Go to dashboard
              </Link>
            ) : null}
          </div>
        ) : null}
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
