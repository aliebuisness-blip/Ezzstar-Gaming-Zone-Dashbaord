"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";

type AuthShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
};

export function AuthShell({ eyebrow, title, description, children }: AuthShellProps) {
  return (
    <main className="grid min-h-screen lg:grid-cols-[0.92fr_1.08fr]">
      <section className="relative hidden overflow-hidden border-r border-white/10 px-10 py-9 lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(34,211,238,0.22),transparent_30%),radial-gradient(circle_at_80%_75%,rgba(168,85,247,0.2),transparent_28%)]" />
        <div className="relative">
          <Link className="flex items-center gap-3" href="/login">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-300/35 bg-cyan-300/10 shadow-glow">
              <Sparkles className="h-5 w-5 text-cyan-200" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-200">SPICA</p>
              <h1 className="text-lg font-semibold text-white">Arena OS</h1>
            </div>
          </Link>
          <div className="mt-20 max-w-xl">
            <p className="text-xs uppercase tracking-[0.22em] text-purple-200">{eyebrow}</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-tight text-white xl:text-5xl">{title}</h2>
            <p className="mt-5 text-base leading-7 text-slate-400">{description}</p>
          </div>
        </div>
        <div className="relative grid grid-cols-3 gap-3 text-sm">
          {["Global identity", "Zone-ready", "Realtime PCs"].map((item) => (
            <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-3 text-slate-300" key={item}>{item}</div>
          ))}
        </div>
      </section>
      <section className="flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.055] p-5 shadow-nebula backdrop-blur-xl md:p-6">
          {children}
        </div>
      </section>
    </main>
  );
}
