import { LucideIcon, Inbox } from "lucide-react";
import { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description: string;
  icon?: LucideIcon;
  action?: ReactNode;
};

export function EmptyState({ title, description, icon: Icon = Inbox, action }: EmptyStateProps) {
  return (
    <div className="player-card-in rounded-2xl border border-white/10 bg-black/25 p-5 text-center">
      <div className="player-empty-icon mx-auto flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.055] text-cyan-100">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-3 font-semibold text-white">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{description}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}
