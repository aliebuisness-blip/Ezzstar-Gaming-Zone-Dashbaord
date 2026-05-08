import { Bell } from "lucide-react";
import { ActivityItem, DashboardRole } from "@/lib/spica";
import { AppCard } from "@/components/ui/AppCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";

type NotificationCenterProps = {
  activity: ActivityItem[];
  role: DashboardRole;
};

const roleTitle = {
  player: "Player notifications",
  zone: "Zone alerts",
  admin: "Admin alerts"
};

function toneFor(label: string) {
  const lower = label.toLowerCase();

  if (lower.includes("offline") || lower.includes("failed") || lower.includes("rejected")) {
    return "danger" as const;
  }

  if (lower.includes("pending") || lower.includes("warning") || lower.includes("cleanup")) {
    return "warning" as const;
  }

  if (lower.includes("started") || lower.includes("connected") || lower.includes("approved")) {
    return "success" as const;
  }

  return "active" as const;
}

export function NotificationCenter({ activity, role }: NotificationCenterProps) {
  const notifications = activity.slice(0, 4);

  return (
    <AppCard className="h-full">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Notification Center</p>
          <h3 className="mt-2 text-lg font-semibold text-white">{roleTitle[role]}</h3>
        </div>
        <div className="relative rounded-2xl border border-purple-300/25 bg-purple-300/10 p-3 text-purple-100">
          <Bell className="h-5 w-5" />
          {notifications.length ? <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-cyan-300 shadow-[0_0_16px_rgba(34,211,238,0.75)]" /> : null}
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {notifications.length ? notifications.map((item, index) => (
          <div className="animate-notification-in rounded-2xl border border-white/10 bg-black/25 p-3" key={item.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">{item.label}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">{item.detail}</p>
              </div>
              <StatusBadge pulse={index === 0} tone={toneFor(item.label)}>
                {index === 0 ? "New" : "Read"}
              </StatusBadge>
            </div>
          </div>
        )) : <EmptyState description="Role-aware alerts will appear here when the realtime system emits updates." icon={Bell} title="No alerts" />}
      </div>
    </AppCard>
  );
}
