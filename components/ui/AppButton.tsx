import { ButtonHTMLAttributes, ReactNode } from "react";
import clsx from "clsx";

type AppButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "primary" | "secondary" | "danger" | "ghost";
};

const variants = {
  primary: "border-cyan-300/25 bg-cyan-300/15 text-cyan-50 hover:border-cyan-100/60 hover:shadow-[0_0_24px_rgba(34,211,238,0.2)]",
  secondary: "border-purple-300/20 bg-purple-300/10 text-purple-100 hover:border-purple-200/50 hover:shadow-[0_0_24px_rgba(168,85,247,0.18)]",
  danger: "border-red-300/20 bg-red-400/10 text-red-100 hover:border-red-200/45 hover:shadow-[0_0_24px_rgba(248,113,113,0.18)]",
  ghost: "border-white/10 bg-white/[0.035] text-slate-300 hover:border-white/20 hover:bg-white/[0.065] hover:text-white"
};

export function AppButton({ children, className, variant = "primary", ...props }: AppButtonProps) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition duration-200 disabled:cursor-not-allowed disabled:opacity-45",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
