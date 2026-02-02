import { useMemo, useState } from "react";
import { SystemEventLog } from "./SystemEventLog";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Power, Clock, Mic, AlertTriangle } from "lucide-react";
import type { SystemEvent } from "@/types/novus";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

const timelineData = [
  { day: "Mon", volume: 42, eligible: 14, deferred: 18, rejected: 10 },
  { day: "Tue", volume: 55, eligible: 19, deferred: 23, rejected: 13 },
  { day: "Wed", volume: 63, eligible: 22, deferred: 25, rejected: 16 },
  { day: "Thu", volume: 49, eligible: 17, deferred: 20, rejected: 12 },
  { day: "Fri", volume: 71, eligible: 24, deferred: 30, rejected: 17 },
  { day: "Sat", volume: 38, eligible: 11, deferred: 16, rejected: 11 },
  { day: "Sun", volume: 46, eligible: 15, deferred: 19, rejected: 12 },
];

const metricCards = [
  { label: "Total Volume", value: "364", delta: "+8.2%" },
  { label: "Eligible Rate", value: "32.7%", delta: "+2.1%" },
  { label: "Avg Response Time", value: "14m", delta: "-1.8m" },
  { label: "Human Follow-ups", value: "81", delta: "+6" },
];

const chartConfig = {
  volume: { label: "Total Volume", color: "hsl(var(--primary))" },
  eligible: { label: "Eligible", color: "hsl(var(--success))" },
  deferred: { label: "Deferred", color: "hsl(var(--warning))" },
  rejected: { label: "Rejected", color: "hsl(var(--destructive))" },
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
  const [activeMetric, setActiveMetric] = useState<keyof typeof chartConfig>("volume");
  const [range, setRange] = useState("7d");

  const barData = useMemo(() => {
    return timelineData.map((item) => ({
      day: item.day,
      eligible: item.eligible,
      deferred: item.deferred,
      rejected: item.rejected,
    }));
  }, []);

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
      <section className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="system-header">Analytics</p>
            <h2 className="text-xl font-semibold mt-1">Intake performance</h2>
            <p className="text-sm text-muted-foreground">
              Explore the pipeline with quick toggles and timeline views.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {[
              { value: "7d", label: "7D" },
              { value: "30d", label: "30D" },
              { value: "90d", label: "90D" },
            ].map((option) => (
              <Button
                key={option.value}
                variant={range === option.value ? "default" : "outline"}
                size="sm"
                onClick={() => setRange(option.value)}
                className="font-mono text-xs uppercase tracking-wider"
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        <Tabs defaultValue="numbers" className="space-y-4">
          <TabsList className="bg-muted/30 border border-border">
            <TabsTrigger value="numbers" className="font-mono text-xs uppercase tracking-wider">
              Numbers
            </TabsTrigger>
            <TabsTrigger value="timeline" className="font-mono text-xs uppercase tracking-wider">
              Timeline
            </TabsTrigger>
            <TabsTrigger value="status" className="font-mono text-xs uppercase tracking-wider">
              Status Mix
            </TabsTrigger>
          </TabsList>

          <TabsContent value="numbers">
            <div className="grid gap-4 md:grid-cols-4">
              {metricCards.map((metric) => (
                <Card key={metric.label} className="card-grid">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">{metric.label}</p>
                    <p className="text-2xl font-semibold mt-2">{metric.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{metric.delta} vs last {range}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="timeline">
            <Card className="card-grid">
              <CardHeader>
                <CardTitle className="text-lg">Timeline view</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Toggle which series is highlighted.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(chartConfig) as Array<keyof typeof chartConfig>).map((key) => (
                    <Button
                      key={key}
                      size="sm"
                      variant={activeMetric === key ? "default" : "outline"}
                      className="font-mono text-xs uppercase tracking-wider"
                      onClick={() => setActiveMetric(key)}
                    >
                      {chartConfig[key].label}
                    </Button>
                  ))}
                </div>
                <ChartContainer config={chartConfig} className="w-full h-56">
                  <LineChart data={timelineData}>
                    <CartesianGrid strokeDasharray="4 4" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line
                      type="monotone"
                      dataKey={activeMetric}
                      stroke={`var(--color-${activeMetric})`}
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="status">
            <Card className="card-grid">
              <CardHeader>
                <CardTitle className="text-lg">Status mix</CardTitle>
                <p className="text-sm text-muted-foreground">
                  How each day breaks down by decision.
                </p>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="w-full h-56">
                  <BarChart data={barData} stackOffset="expand">
                    <CartesianGrid strokeDasharray="4 4" />
                    <XAxis dataKey="day" />
                    <YAxis tickFormatter={(value) => `${Math.round(value * 100)}%`} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar dataKey="eligible" stackId="status" fill="var(--color-eligible)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="deferred" stackId="status" fill="var(--color-deferred)" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="rejected" stackId="status" fill="var(--color-rejected)" radius={[0, 0, 4, 4]} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </section>

      <div className="glow-line" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="system-header mb-1">Intake Studio</p>
          <p className="text-sm text-muted-foreground">
            Manage prompts, questions, and analytics for the intake process.
          </p>
        </div>
        <Button asChild className="font-mono text-xs uppercase tracking-wider">
          <Link href="/manager/intake">Open Intake Studio</Link>
        </Button>
      </div>

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
