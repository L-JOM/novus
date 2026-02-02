import { useMemo, useState } from "react";
import { EmptyState } from "./EmptyState";
import type { Request } from "@/types/novus";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Mock requests for demo
const mockRequests: Request[] = [
  {
    id: "1",
    name: "Marcus Chen",
    email: "m.chen@enterprise.io",
    phone: "+1 (415) 555-0142",
    status: "eligible",
    timestamp: new Date(Date.now() - 1000 * 60 * 12),
    summary: "This request meets eligibility criteria for human follow-up.",
    intakeResponses: [
      { question: "Primary use case", answer: "Outbound qualification and lead routing." },
      { question: "Team size", answer: "14 SDRs across two regions." },
      { question: "Timeline", answer: "Pilot in 30 days, full rollout in Q2." },
    ],
  },
  {
    id: "2",
    name: "Sarah Okonkwo",
    email: "sarah.o@techcorp.com",
    phone: "+1 (312) 555-0198",
    status: "eligible",
    timestamp: new Date(Date.now() - 1000 * 60 * 45),
    summary: "This request meets eligibility criteria for human follow-up.",
    intakeResponses: [
      { question: "Primary use case", answer: "Qualify inbound demo requests." },
      { question: "Current CRM", answer: "Salesforce, plus Gong." },
      { question: "Target launch", answer: "End of this quarter." },
    ],
  },
  {
    id: "3",
    name: "Diego Ruiz",
    email: "d.ruiz@midmarket.co",
    phone: "+1 (646) 555-0131",
    status: "deferred",
    timestamp: new Date(Date.now() - 1000 * 60 * 90),
    summary: "Needs additional verification before outreach.",
    intakeResponses: [
      { question: "Primary use case", answer: "Routing inbound web leads." },
      { question: "Budget", answer: "Under review by finance." },
      { question: "Decision maker", answer: "VP of Revenue Ops." },
    ],
  },
  {
    id: "4",
    name: "Avery Patel",
    email: "avery@startup.example",
    phone: "+1 (213) 555-0109",
    status: "rejected",
    timestamp: new Date(Date.now() - 1000 * 60 * 140),
    summary: "Failed the required qualification criteria.",
    intakeResponses: [
      { question: "Primary use case", answer: "Cold outreach automation." },
      { question: "Monthly volume", answer: "Under 50 leads." },
      { question: "Timeline", answer: "No defined plan." },
    ],
  },
];

export const SalesRepDashboard = () => {
  const [requests, setRequests] = useState<Request[]>(mockRequests);
  const [activeRequest, setActiveRequest] = useState<Request | null>(null);

  const handleAction = (requestId: string, action: 'accept' | 'contacted' | 'no_response') => {
    setRequests(prev => prev.filter(r => r.id !== requestId));
    
    const actionMessages = {
      accept: "Request accepted. Contact initiated.",
      contacted: "Request marked as contacted.",
      no_response: "Request marked as no response.",
    };
    
    toast.success(actionMessages[action], {
      className: "font-mono text-xs",
    });
  };

  const eligibleRequests = useMemo(() => requests.filter((request) => request.status === "eligible"), [requests]);

  const formatTimestamp = (timestamp: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(timestamp);
  };

  const statusClasses: Record<Request["status"], string> = {
    eligible: "status-badge status-eligible",
    deferred: "status-badge status-deferred",
    rejected: "status-badge status-rejected",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="system-header mb-1">Sales Rep Queue</h2>
          <p className="text-sm text-muted-foreground">
            {eligibleRequests.length} eligible · {requests.length} total in queue
          </p>
        </div>
      </div>

      <div className="glow-line" />

      <Tabs defaultValue="all">
        <TabsList className="bg-muted/30 border border-border">
          <TabsTrigger value="all" className="font-mono text-xs uppercase tracking-wider">
            All ({requests.length})
          </TabsTrigger>
          <TabsTrigger value="eligible" className="font-mono text-xs uppercase tracking-wider">
            Eligible ({eligibleRequests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          {requests.length === 0 ? (
            <EmptyState message="No requests are currently in the queue." />
          ) : (
            <div className="rounded-lg border border-border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="system-header">Lead</TableHead>
                    <TableHead className="system-header">Status</TableHead>
                    <TableHead className="system-header">Received</TableHead>
                    <TableHead className="system-header">Email</TableHead>
                    <TableHead className="system-header">Phone</TableHead>
                    <TableHead className="system-header">Intake</TableHead>
                    <TableHead className="system-header text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium text-foreground">{request.name}</TableCell>
                      <TableCell>
                        <span className={statusClasses[request.status]}>{request.status}</span>
                      </TableCell>
                      <TableCell className="data-cell">{formatTimestamp(request.timestamp)}</TableCell>
                      <TableCell className="data-cell">{request.email}</TableCell>
                      <TableCell className="data-cell">{request.phone}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          className="font-mono text-xs uppercase tracking-wider"
                          onClick={() => setActiveRequest(request)}
                        >
                          View Intake
                        </Button>
                      </TableCell>
                      <TableCell className="text-right">
                        {request.status === "eligible" ? (
                          <div className="flex items-center justify-end gap-2">
                            <Button size="sm" onClick={() => handleAction(request.id, "accept")}>Accept</Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleAction(request.id, "contacted")}
                            >
                              Contacted
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleAction(request.id, "no_response")}
                            >
                              No Response
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="eligible" className="mt-6">
          {eligibleRequests.length === 0 ? (
            <EmptyState message="No requests are currently eligible for human review." />
          ) : (
            <div className="rounded-lg border border-border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="system-header">Lead</TableHead>
                    <TableHead className="system-header">Status</TableHead>
                    <TableHead className="system-header">Received</TableHead>
                    <TableHead className="system-header">Email</TableHead>
                    <TableHead className="system-header">Phone</TableHead>
                    <TableHead className="system-header">Intake</TableHead>
                    <TableHead className="system-header text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {eligibleRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium text-foreground">{request.name}</TableCell>
                      <TableCell>
                        <span className={statusClasses[request.status]}>{request.status}</span>
                      </TableCell>
                      <TableCell className="data-cell">{formatTimestamp(request.timestamp)}</TableCell>
                      <TableCell className="data-cell">{request.email}</TableCell>
                      <TableCell className="data-cell">{request.phone}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          className="font-mono text-xs uppercase tracking-wider"
                          onClick={() => setActiveRequest(request)}
                        >
                          View Intake
                        </Button>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button size="sm" onClick={() => handleAction(request.id, "accept")}>Accept</Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleAction(request.id, "contacted")}
                          >
                            Contacted
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleAction(request.id, "no_response")}
                          >
                            No Response
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!activeRequest} onOpenChange={(open) => (!open ? setActiveRequest(null) : undefined)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              Intake Responses
            </DialogTitle>
          </DialogHeader>
          {activeRequest ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="font-medium text-foreground">{activeRequest.name}</span>
                <span className="text-muted-foreground">{activeRequest.email}</span>
                <span className="text-muted-foreground">{activeRequest.phone}</span>
                <span className={statusClasses[activeRequest.status]}>{activeRequest.status}</span>
              </div>
              <div className="space-y-3">
                {(activeRequest.intakeResponses ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No intake responses available.</p>
                ) : (
                  activeRequest.intakeResponses?.map((item, index) => (
                    <div key={`${activeRequest.id}-${index}`} className="rounded-md border border-border p-3">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground font-mono">{item.question}</p>
                      <p className="mt-2 text-sm text-foreground">{item.answer}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
};
