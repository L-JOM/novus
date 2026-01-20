import { useState } from "react";
import { StatsPanel } from "./StatsPanel";
import { SystemEventLog } from "./SystemEventLog";
import { Button } from "@/components/ui/button";
import { Power, Clock, Mic, AlertTriangle } from "lucide-react";
import type { AggregateStats, SystemEvent } from "@/types/novus";
import { toast } from "sonner";

const mockStats: AggregateStats = {
  eligible: 12,
  deferred: 34,
  rejected: 89,
  totalToday: 135,
};

const mockEvents: SystemEvent[] = [
  {
    id: "1",
    type: "eligibility_change",
    message: "Eligibility threshold adjusted: confidence decay detected",
    timestamp: new Date(Date.now() - 1000 * 60 * 5),
  },
  {
    id: "2",
    type: "internal_review",
    message: "System-initiated review completed for batch #4782",
    timestamp: new Date(Date.now() - 1000 * 60 * 23),
  },
  {
    id: "3",
    type: "confidence_decay",
    message: "Pattern degradation observed in segment A-3",
    timestamp: new Date(Date.now() - 1000 * 60 * 67),
  },
];

export const ManagerDashboard = () => {
  const [intakeEnabled, setIntakeEnabled] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  const handleKillSwitch = () => {
    setIntakeEnabled(false);
    toast.warning("Intake paused. All incoming requests are now held.", {
      className: "font-mono text-xs",
    });
  };

  const handleEnableIntake = () => {
    setIntakeEnabled(true);
    toast.success("Intake resumed. System is now accepting requests.", {
      className: "font-mono text-xs",
    });
  };

  const toggleVoice = () => {
    setVoiceEnabled(!voiceEnabled);
    toast.info(`Voice intake ${!voiceEnabled ? 'enabled' : 'disabled'}.`, {
      className: "font-mono text-xs",
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="system-header mb-1">Aggregate Overview</h2>
        <p className="text-sm text-muted-foreground">
          Intake flow operating within expected parameters
        </p>
      </div>

      <StatsPanel stats={mockStats} />

      <div className="glow-line" />

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SystemEventLog events={mockEvents} />
        </div>

        <div className="space-y-4">
          <div className="card-grid p-4">
            <span className="system-header block mb-4">Governance Controls</span>
            
            <div className="space-y-3">
              {intakeEnabled ? (
                <Button 
                  variant="destructive" 
                  className="w-full font-mono text-xs tracking-wide justify-start"
                  onClick={handleKillSwitch}
                >
                  <Power size={14} className="mr-2" />
                  PAUSE INTAKE (KILL SWITCH)
                </Button>
              ) : (
                <Button 
                  variant="default" 
                  className="w-full font-mono text-xs tracking-wide justify-start"
                  onClick={handleEnableIntake}
                >
                  <Power size={14} className="mr-2" />
                  RESUME INTAKE
                </Button>
              )}

              <Button 
                variant="outline" 
                className="w-full font-mono text-xs tracking-wide justify-start"
                onClick={toggleVoice}
              >
                <Mic size={14} className="mr-2" />
                {voiceEnabled ? 'DISABLE' : 'ENABLE'} VOICE INTAKE
              </Button>

              <Button 
                variant="ghost" 
                className="w-full font-mono text-xs tracking-wide justify-start text-muted-foreground"
                disabled
              >
                <Clock size={14} className="mr-2" />
                ADJUST TIME WINDOWS
              </Button>
            </div>
          </div>

          {!intakeEnabled && (
            <div className="card-grid p-4 border-destructive bg-destructive/5">
              <div className="flex items-start gap-3">
                <AlertTriangle size={16} className="text-destructive mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-destructive">Intake Paused</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    All incoming requests are being held. Resume when ready.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
