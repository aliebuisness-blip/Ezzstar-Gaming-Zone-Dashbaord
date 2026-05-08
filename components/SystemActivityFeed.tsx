import { ActivityItem } from "@/lib/spica";
import { AppCard } from "@/components/ui/AppCard";
import { EmptyState } from "@/components/ui/EmptyState";

type SystemActivityFeedProps = {
  activity: ActivityItem[];
};

export function SystemActivityFeed({ activity }: SystemActivityFeedProps) {
  return (
    <AppCard className="h-full">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">System Activity</p>
          <h3 className="mt-2 text-lg font-semibold text-white">Live Feed</h3>
        </div>
        <span className="h-2.5 w-2.5 rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(34,211,238,0.85)]" />
      </div>

      <div className="mt-5 space-y-3">
        {activity.length ? activity.slice(0, 6).map((item) => (
          <div className="animate-notification-in rounded-2xl border border-white/10 bg-black/25 p-3" key={item.id}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-cyan-100">{item.label}</p>
              <p className="text-xs text-slate-600">{new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
            </div>
            <p className="mt-2 text-sm leading-5 text-slate-400">{item.detail}</p>
          </div>
        )) : <EmptyState description="Realtime events will appear here as players, PCs, and sessions update." title="No activity yet" />}
      </div>
    </AppCard>
  );
}
