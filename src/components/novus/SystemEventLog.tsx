import { AlertTriangle, TrendingDown, Eye, Power } from "lucide-react";
import type { SystemEvent } from "@/types/novus";

interface SystemEventLogProps {
  events: SystemEvent[];
}

const eventIcons = {
  confidence_decay: TrendingDown,
  eligibility_change: AlertTriangle,
  internal_review: Eye,
  kill_switch: Power,
};

const eventColors = {
  confidence_decay: "text-warning",
  eligibility_change: "text-primary",
  internal_review: "text-muted-foreground",
  kill_switch: "text-destructive",
};

export const SystemEventLog = ({ events }: SystemEventLogProps) => {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit',
      hour12: false 
    });
  };

  return (
    <div className="card-grid">
      <div className="px-4 py-3 border-b border-border">
        <span className="system-header">System Events</span>
      </div>
      <div className="divide-y divide-border">
        {events.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-muted-foreground">
              No system events recorded.
            </p>
          </div>
        ) : (
          events.map((event) => {
            const Icon = eventIcons[event.type];
            const colorClass = eventColors[event.type];
            
            return (
              <div key={event.id} className="px-4 py-3 flex items-start gap-3">
                <Icon size={14} className={`mt-0.5 ${colorClass}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">{event.message}</p>
                  <span className="data-cell text-xs">{formatTime(event.timestamp)}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
