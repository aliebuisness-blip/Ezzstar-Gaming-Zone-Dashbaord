import { Bell, CircleDollarSign, Gamepad2, Megaphone, ShieldAlert, Trophy, Wifi } from "lucide-react";
import { ActivityItem, DashboardRole } from "@/lib/spica";
import { AppCard } from "@/components/ui/AppCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";

type NotificationCenterProps = {
  activity: ActivityItem[];
  role: DashboardRole;
  variant?: "card" | "drawer";
  readAt?: number;
  onMarkRead?: () => void;
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

function categoryFor(item: ActivityItem) {
  const text = `${item.label} ${item.detail}`.toLowerCase();

  if (text.includes("settlement") || text.includes("spica") || text.includes("earning")) return { label: "earnings", icon: CircleDollarSign };
  if (text.includes("session") || text.includes("pc")) return { label: "session", icon: Gamepad2 };
  if (text.includes("tournament")) return { label: "tournaments", icon: Trophy };
  if (text.includes("warning") || text.includes("rejected") || text.includes("failed")) return { label: "moderation", icon: ShieldAlert };
  if (text.includes("connected") || text.includes("sync")) return { label: "system", icon: Wifi };
  return { label: "updates", icon: Megaphone };
}

function formatAge(createdAt: number) {
  const seconds = Math.max(1, Math.floor((Date.now() - createdAt) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function NotificationCenter({ activity, role, variant = "card", readAt = 0, onMarkRead }: NotificationCenterProps) {
  const seen = new Set<string>();
  const notifications = activity
    .filter((item) => {
      const key = `${item.id}-${item.createdAt}`;

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    })
    .slice(0, 4);

  const grouped = notifications.reduce<Record<string, ActivityItem[]>>((groups, item) => {
    const category = categoryFor(item).label;
    groups[category] = [...(groups[category] ?? []), item];
    return groups;
  }, {});

  const content = (
    <div className="space-y-4">
      {notifications.length ? Object.entries(grouped).map(([category, items]) => {
        const CategoryIcon = categoryFor(items[0]).icon;
        return (
          <div className="space-y-2" key={category}>
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-slate-500">
              <CategoryIcon className="h-3.5 w-3.5" />
              {category}
            </div>
            {items.map((item, index) => {
              const unread = item.createdAt > readAt;
              return (
                <button className="w-full animate-notification-in rounded-2xl border border-white/10 bg-black/25 p-3 text-left transition hover:border-cyan-200/25 hover:bg-white/[0.045]" key={`${item.id}-${item.createdAt}-${index}`} type="button">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{item.label}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">{item.detail}</p>
                      <p className="mt-2 text-[11px] text-slate-600">{formatAge(item.createdAt)}</p>
                    </div>
                    <StatusBadge pulse={unread} tone={toneFor(item.label)}>
                      {unread ? "Unread" : "Read"}
                    </StatusBadge>
                  </div>
                </button>
              );
            })}
          </div>
        );
      }) : <EmptyState description="Role-aware alerts will appear here when sessions, earnings, updates, or system events need attention." icon={Bell} title="No alerts" />}
    </div>
  );

  if (variant === "drawer") {
    return (
      <div>
        {notifications.length ? (
          <div className="mb-4 flex justify-end">
            <button className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-cyan-200/30 hover:text-white" onClick={onMarkRead} type="button">
              Mark all read
            </button>
          </div>
        ) : null}
        {content}
      </div>
    );
  }

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

      <div className="mt-5">{content}</div>
    </AppCard>
  );
}
