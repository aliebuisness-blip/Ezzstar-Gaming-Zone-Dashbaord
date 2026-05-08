import { ReactNode } from "react";
import clsx from "clsx";

type DashboardGridProps = {
  children: ReactNode;
  className?: string;
  columns?: "stats" | "cards" | "two";
};

const gridClasses = {
  stats: "grid gap-4 sm:grid-cols-2 2xl:grid-cols-4",
  cards: "grid gap-4 md:grid-cols-2 xl:grid-cols-3",
  two: "grid gap-4 xl:grid-cols-2"
};

export function DashboardGrid({ children, className, columns = "cards" }: DashboardGridProps) {
  return <div className={clsx(gridClasses[columns], className)}>{children}</div>;
}
