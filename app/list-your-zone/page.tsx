"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Building2, CheckCircle2 } from "lucide-react";
import { AuthShell } from "@/components/AuthShell";

type FormState = {
  ownerName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
  zoneName: string;
  city: string;
  pcCount: number;
  rentPerHour: number;
  currentPricingModel: string;
  message: string;
};

const initialForm: FormState = {
  ownerName: "",
  email: "",
  password: "",
  confirmPassword: "",
  phone: "",
  zoneName: "",
  city: "",
  pcCount: 12,
  rentPerHour: 100,
  currentPricingModel: "",
  message: ""
};

export default function ListYourZonePage() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function uploadAttachment(file: File) {
    setError(null);
    setUploadingAttachment(true);

    try {
      const formData = new FormData();
      formData.append("purpose", "listing-request-attachment");
      formData.append("file", file);
      const response = await fetch("/api/uploads", { method: "POST", body: formData });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(payload.error ?? "Attachment upload is not available.");
        return;
      }

      setAttachmentUrl(payload.publicUrl ?? payload.path ?? "");
    } catch {
      setError("Attachment upload failed. Please try again.");
    } finally {
      setUploadingAttachment(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const response = await fetch("/api/listing-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        message: attachmentUrl ? `${form.message}\n\nAttachment: ${attachmentUrl}`.trim() : form.message
      })
    });
    const payload = await response.json().catch(() => ({}));
    setSubmitting(false);

    if (!response.ok) {
      setError(payload.error ?? "Could not submit listing request.");
      return;
    }

    setSuccess(true);
    setForm(initialForm);
    setAttachmentUrl("");
  }

  return (
    <AuthShell
      eyebrow="Zone Network"
      title="List your gaming zone"
      description="Create your zone owner account and submit your gaming cafe for Ezzstar approval."
    >
      {success ? (
        <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-5 text-emerald-50">
          <CheckCircle2 className="h-6 w-6" />
          <h2 className="mt-3 text-xl font-semibold">Zone account created</h2>
          <p className="mt-2 text-sm text-emerald-100/80">Your owner account and pending zone are ready. Sign in with your business email while Ezzstar reviews approval.</p>
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
              <p className="text-sm text-slate-500">Owner access is created now; Zone OS activates after Ezzstar approval.</p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {[
              ["ownerName", "Owner name", "text"],
              ["email", "Business email", "email"],
              ["password", "Password", "password"],
              ["confirmPassword", "Confirm password", "password"],
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
            <label className="block">
              <span className="text-sm text-slate-400">Rent per hour (SPICA)</span>
              <input
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-200/50"
                min={1}
                onChange={(event) => setForm((current) => ({ ...current, rentPerHour: Number(event.target.value) }))}
                required
                type="number"
                value={form.rentPerHour}
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

          <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/25 px-4 py-3 transition hover:border-cyan-200/30">
            <span>
              <span className="block text-sm font-semibold text-white">Attachment</span>
              <span className="mt-1 block text-xs text-slate-500">{uploadingAttachment ? "Uploading..." : attachmentUrl ? "Attachment uploaded" : "Optional logo, floor plan, or business document"}</span>
            </span>
            <input
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="sr-only"
              disabled={uploadingAttachment}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) uploadAttachment(file);
                event.target.value = "";
              }}
              type="file"
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
