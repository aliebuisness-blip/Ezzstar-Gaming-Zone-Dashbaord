import { ReactNode } from "react";

type AppHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
};

export function AppHeader({ eyebrow, title, description, action }: AppHeaderProps) {
  return (
    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
      <div>
        {eyebrow ? <p className="text-xs font-medium uppercase tracking-[0.2em] text-cyan-200/80">{eyebrow}</p> : null}
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-white md:text-2xl">{title}</h2>
        {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
