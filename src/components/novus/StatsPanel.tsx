import { CheckCircle, Clock, XCircle, BarChart3 } from "lucide-react";
import type { AggregateStats } from "@/types/novus";

interface StatsPanelProps {
  stats: AggregateStats;
}

export const StatsPanel = ({ stats }: StatsPanelProps) => {
  const statItems = [
    {
      label: "Eligible",
      value: stats.eligible,
      icon: CheckCircle,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      label: "Deferred",
      value: stats.deferred,
      icon: Clock,
      color: "text-deferred",
      bgColor: "bg-deferred/10",
    },
    {
      label: "Rejected",
      value: stats.rejected,
      icon: XCircle,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
    },
    {
      label: "Total Today",
      value: stats.totalToday,
      icon: BarChart3,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {statItems.map((item) => (
        <div key={item.label} className="card-grid p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="system-header">{item.label}</span>
            <div className={`p-1.5 ${item.bgColor}`}>
              <item.icon size={14} className={item.color} />
            </div>
          </div>
          <div className="font-mono text-3xl font-semibold tracking-tight">
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
};
