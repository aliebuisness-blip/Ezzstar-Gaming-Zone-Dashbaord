import { LucideIcon } from "lucide-react";
import { AppCard } from "@/components/ui/AppCard";

type StatCardProps = {
  title: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone?: "cyan" | "purple" | "green" | "red";
};

const toneClasses = {
  cyan: "border-cyan-300/25 bg-cyan-300/10 text-cyan-100",
  purple: "border-purple-300/25 bg-purple-300/10 text-purple-100",
  green: "border-emerald-300/25 bg-emerald-300/10 text-emerald-100",
  red: "border-red-300/25 bg-red-400/10 text-red-100"
};

export function StatCard({ title, value, detail, icon: Icon, tone = "cyan" }: StatCardProps) {
  return (
    <AppCard compact interactive>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">{title}</p>
          <h3 className="mt-2 text-lg font-semibold tracking-tight text-white md:text-xl">{value}</h3>
        </div>
        <div className={`rounded-2xl border p-2.5 ${toneClasses[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500">{detail}</p>
    </AppCard>
  );
}
