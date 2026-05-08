"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Building2, CheckCircle2 } from "lucide-react";
import { AuthShell } from "@/components/AuthShell";

type FormState = {
  ownerName: string;
  email: string;
  phone: string;
  zoneName: string;
  city: string;
  pcCount: number;
  currentPricingModel: string;
  message: string;
};

const initialForm: FormState = {
  ownerName: "",
  email: "",
  phone: "",
  zoneName: "",
  city: "",
  pcCount: 12,
  currentPricingModel: "",
  message: ""
};

export default function ListYourZonePage() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const response = await fetch("/api/listing-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    const payload = await response.json().catch(() => ({}));
    setSubmitting(false);

    if (!response.ok) {
      setError(payload.error ?? "Could not submit listing request.");
      return;
    }

    setSuccess(true);
    setForm(initialForm);
  }

  return (
    <AuthShell
      eyebrow="Zone Network"
      title="List your gaming zone"
      description="Apply to connect your gaming cafe to SPICA ARENA OS. Ezzstar reviews every business request before creating owner access."
    >
      {success ? (
        <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-5 text-emerald-50">
          <CheckCircle2 className="h-6 w-6" />
          <h2 className="mt-3 text-xl font-semibold">Request received</h2>
          <p className="mt-2 text-sm text-emerald-100/80">Ezzstar will review your zone and contact you before onboarding.</p>
          <Link className="mt-5 inline-flex rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-white" href="/login">
            Back to sign in
          </Link>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-cyan-300/25 bg-cyan-300/10 p-3 text-cyan-100">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-white">Business listing request</h1>
              <p className="text-sm text-slate-500">Zone owner signup is private after approval.</p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {[
              ["ownerName", "Owner name", "text"],
              ["email", "Business email", "email"],
              ["phone", "Phone", "tel"],
              ["zoneName", "Gaming zone name", "text"],
              ["city", "City", "text"],
              ["currentPricingModel", "Current pricing model", "text"]
            ].map(([key, label, type]) => (
              <label className="block" key={key}>
                <span className="text-sm text-slate-400">{label}</span>
                <input
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-200/50"
                  onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
                  required
                  type={type}
                  value={String(form[key as keyof FormState])}
                />
              </label>
            ))}
            <label className="block">
              <span className="text-sm text-slate-400">Number of PCs</span>
              <input
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-200/50"
                min={1}
                onChange={(event) => setForm((current) => ({ ...current, pcCount: Number(event.target.value) }))}
                required
                type="number"
                value={form.pcCount}
              />
            </label>
          </div>

          <label className="block">
            <span className="text-sm text-slate-400">Message / requirements</span>
            <textarea
              className="mt-2 min-h-28 w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-200/50"
              onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
              value={form.message}
            />
          </label>

          {error ? <p className="rounded-2xl border border-red-300/20 bg-red-400/10 px-4 py-3 text-sm text-red-100">{error}</p> : null}

          <button className="w-full rounded-2xl border border-cyan-300/25 bg-cyan-300/15 px-5 py-3 text-sm font-semibold text-cyan-50 transition hover:border-cyan-100/60 hover:shadow-[0_0_28px_rgba(34,211,238,0.22)]" disabled={submitting} type="submit">
            {submitting ? "Sending request..." : "Submit listing request"}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
