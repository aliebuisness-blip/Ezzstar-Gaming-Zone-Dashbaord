"use client";

import { ReactNode, useEffect } from "react";
import { X } from "lucide-react";

type OverlayDrawerProps = {
  open: boolean;
  title: string;
  eyebrow?: string;
  onClose: () => void;
  children: ReactNode;
};

export function OverlayDrawer({ open, title, eyebrow, onClose, children }: OverlayDrawerProps) {
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70]">
      <button aria-label="Close drawer" className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} type="button" />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-md animate-drawer-in flex-col border-l border-white/10 bg-[#070910]/95 shadow-nebula backdrop-blur-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-5">
          <div>
            {eyebrow ? <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">{eyebrow}</p> : null}
            <h2 className="mt-1 text-xl font-semibold text-white">{title}</h2>
          </div>
          <button className="rounded-xl border border-white/10 bg-white/[0.045] p-2 text-slate-300 transition hover:border-cyan-200/30 hover:text-white" onClick={onClose} type="button">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
      </aside>
    </div>
  );
}
