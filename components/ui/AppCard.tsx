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
        "rounded-2xl border border-white/10 bg-white/[0.052] shadow-nebula backdrop-blur-xl",
        compact ? "p-4" : "p-5",
        interactive && "transition duration-200 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.072]",
        className
      )}
    >
      {children}
    </article>
  );
}
