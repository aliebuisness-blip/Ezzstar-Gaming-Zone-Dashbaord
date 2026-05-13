"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import clsx from "clsx";

export type ActionMenuItem = {
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  disabled?: boolean;
  destructive?: boolean;
};

type ActionMenuProps = {
  label?: string;
  items: ActionMenuItem[];
};

export function ActionMenu({ label = "Actions", items }: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        aria-expanded={open}
        aria-label={label}
        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.045] text-slate-300 transition hover:border-cyan-200/30 hover:bg-white/[0.075] hover:text-white"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-2xl border border-white/10 bg-[#080a10]/95 p-1.5 shadow-nebula backdrop-blur-xl">
          {items.map((item) => (
            <button
              className={clsx(
                "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-40",
                item.destructive ? "text-red-100 hover:bg-red-400/10" : "text-slate-300 hover:bg-white/[0.06] hover:text-white"
              )}
              disabled={item.disabled}
              key={item.label}
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
              type="button"
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
