import { ActivityItem } from "@/lib/spica";
import { AppCard } from "@/components/ui/AppCard";
import { EmptyState } from "@/components/ui/EmptyState";

type SystemActivityFeedProps = {
  activity: ActivityItem[];
  variant?: "card" | "drawer";
};

export function SystemActivityFeed({ activity, variant = "card" }: SystemActivityFeedProps) {
  const seen = new Set<string>();
  const feed = activity
    .filter((item) => {
      const key = `${item.id}-${item.createdAt}`;

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    })
    .slice(0, 6);

  const content = (
    <div className="space-y-3">
      {feed.length ? feed.map((item, index) => (
        <div className="relative animate-notification-in rounded-2xl border border-white/10 bg-black/25 p-3 pl-5" key={`${item.id}-${item.createdAt}-${index}`}>
          <span className="absolute left-2 top-4 h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_14px_rgba(34,211,238,0.75)]" />
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-cyan-100">{item.label}</p>
            <p className="text-xs text-slate-600">{new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
          </div>
          <p className="mt-2 text-sm leading-5 text-slate-400">{item.detail}</p>
        </div>
      )) : <EmptyState description="Realtime events will appear here as players, PCs, and sessions update." title="No activity yet" />}
    </div>
  );

  if (variant === "drawer") {
    return content;
  }

  return (
    <AppCard className="h-full">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">System Activity</p>
          <h3 className="mt-2 text-lg font-semibold text-white">Live Feed</h3>
        </div>
        <span className="h-2.5 w-2.5 rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(34,211,238,0.85)]" />
      </div>

      <div className="mt-5">{content}</div>
    </AppCard>
  );
}
