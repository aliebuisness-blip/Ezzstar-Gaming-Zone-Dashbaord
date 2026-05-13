import { ReactNode } from "react";
import clsx from "clsx";

type AppCardProps = {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
  compact?: boolean;
};

export function AppCard({ children, className, compact = false, interactive = false }: AppCardProps) {
  return (
    <article
      className={clsx(
        "rounded-2xl border border-white/10 bg-white/[0.045] shadow-[0_18px_60px_rgba(0,0,0,0.24)] backdrop-blur-xl",
        compact ? "p-3.5 md:p-4" : "p-4 md:p-5",
        interactive && "transition duration-200 hover:-translate-y-0.5 hover:border-cyan-200/25 hover:bg-white/[0.065]",
        className
      )}
    >
      {children}
    </article>
  );
}
