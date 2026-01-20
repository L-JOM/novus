import { Activity } from "lucide-react";

export const SystemStatus = () => {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary/50 border border-border">
      <div className="relative flex items-center justify-center">
        <div className="w-2 h-2 bg-success rounded-full" />
        <div className="absolute w-2 h-2 bg-success rounded-full animate-ping" />
      </div>
      <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
        System Operational
      </span>
      <Activity size={12} className="text-muted-foreground ml-1" />
    </div>
  );
};
