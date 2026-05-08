import { ReactNode } from "react";
import clsx from "clsx";

type AppSectionProps = {
  children: ReactNode;
  className?: string;
};

export function AppSection({ children, className }: AppSectionProps) {
  return <section className={clsx("space-y-4", className)}>{children}</section>;
}
