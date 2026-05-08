"use client";

import { FormEvent, useState } from "react";
import { AuthShell } from "@/components/AuthShell";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const response = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    const payload = await response.json();
    setLoading(false);
    setMessage(payload.message ?? "If this account exists, reset instructions were prepared.");
  }

  return (
    <AuthShell eyebrow="Account recovery" title="Reset access safely." description="For now this uses a development placeholder flow. Production mail delivery can plug into the same endpoint later.">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">PASSWORD RESET</p>
      <h1 className="mt-3 text-3xl font-semibold text-white">Forgot password</h1>
      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <input autoComplete="email" className="w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none focus:border-cyan-200/50" onChange={(event) => setEmail(event.target.value)} placeholder="Email" type="email" value={email} />
        {message ? <p className="text-sm text-emerald-200">{message}</p> : null}
        <button className="w-full rounded-2xl border border-cyan-300/25 bg-cyan-300/15 px-5 py-3 font-semibold text-cyan-50" disabled={loading} type="submit">
          {loading ? "Preparing reset flow..." : "Send reset instructions"}
        </button>
      </form>
    </AuthShell>
  );
}
