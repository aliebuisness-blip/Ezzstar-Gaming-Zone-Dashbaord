"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthShell } from "@/components/AuthShell";

export default function SignupPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: username, username, email, password, role: "player", phone })
    });
    const payload = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(payload.error ?? "Could not create account");
      return;
    }

    router.push("/player");
  }

  return (
    <AuthShell eyebrow="Player network" title="Create your SPICA identity." description="A single player account works across connected Ezzstar gaming zones. Zone owner onboarding is handled through listing requests.">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">PLAYER SIGNUP</p>
      <h1 className="mt-3 text-3xl font-semibold text-white">Create account</h1>
      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <input autoComplete="username" className="w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none focus:border-cyan-200/50" onChange={(event) => setUsername(event.target.value)} placeholder="Username" value={username} />
        <input autoComplete="email" className="w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none focus:border-cyan-200/50" onChange={(event) => setEmail(event.target.value)} placeholder="Email" type="email" value={email} />
        <input className="w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none focus:border-cyan-200/50" onChange={(event) => setPhone(event.target.value)} placeholder="Phone (optional)" value={phone} />
        <input autoComplete="new-password" className="w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none focus:border-cyan-200/50" onChange={(event) => setPassword(event.target.value)} placeholder="Password" type="password" value={password} />
        <input autoComplete="new-password" className="w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none focus:border-cyan-200/50" onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Confirm password" type="password" value={confirmPassword} />
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
        <button className="w-full rounded-2xl border border-cyan-300/25 bg-cyan-300/15 px-5 py-3 font-semibold text-cyan-50" disabled={loading} type="submit">
          {loading ? "Setting up your dashboard..." : "Create player account"}
        </button>
      </form>
    </AuthShell>
  );
}
