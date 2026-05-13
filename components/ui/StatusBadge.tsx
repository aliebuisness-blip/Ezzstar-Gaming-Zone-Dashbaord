import clsx from "clsx";

type StatusTone = "online" | "offline" | "active" | "warning" | "neutral" | "success" | "danger" | "recovering" | "maintenance";

type StatusBadgeProps = {
  children: string;
  tone?: StatusTone;
  pulse?: boolean;
};

const toneClasses: Record<StatusTone, string> = {
  online: "border-emerald-300/25 bg-emerald-300/10 text-emerald-200",
  offline: "border-slate-500/25 bg-slate-500/10 text-slate-300",
  active: "border-cyan-300/25 bg-cyan-300/10 text-cyan-100",
  warning: "border-amber-300/30 bg-amber-300/10 text-amber-100",
  neutral: "border-white/10 bg-white/[0.055] text-slate-300",
  success: "border-emerald-300/25 bg-emerald-300/10 text-emerald-100",
  danger: "border-red-300/25 bg-red-400/10 text-red-100",
  recovering: "border-sky-300/25 bg-sky-300/10 text-sky-100",
  maintenance: "border-amber-300/30 bg-amber-300/10 text-amber-100"
};

export function StatusBadge({ children, tone = "neutral", pulse = false }: StatusBadgeProps) {
  return (
    <span className={clsx("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold", toneClasses[tone])}>
      {pulse ? <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" /> : null}
      {children}
    </span>
  );
}
