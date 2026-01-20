import { useState } from "react";
import { RequestCard } from "./RequestCard";
import { EmptyState } from "./EmptyState";
import type { Request } from "@/types/novus";
import { toast } from "sonner";

// Mock eligible requests for demo
const mockEligibleRequests: Request[] = [
  {
    id: "1",
    name: "Marcus Chen",
    email: "m.chen@enterprise.io",
    phone: "+1 (415) 555-0142",
    status: "eligible",
    timestamp: new Date(Date.now() - 1000 * 60 * 12),
    summary: "This request meets eligibility criteria for human follow-up.",
  },
  {
    id: "2",
    name: "Sarah Okonkwo",
    email: "sarah.o@techcorp.com",
    phone: "+1 (312) 555-0198",
    status: "eligible",
    timestamp: new Date(Date.now() - 1000 * 60 * 45),
    summary: "This request meets eligibility criteria for human follow-up.",
  },
];

export const SalesRepDashboard = () => {
  const [requests, setRequests] = useState<Request[]>(mockEligibleRequests);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="system-header mb-1">Eligible Requests</h2>
          <p className="text-sm text-muted-foreground">
            {requests.length} request{requests.length !== 1 ? 's' : ''} pending review
          </p>
        </div>
      </div>

      <div className="glow-line" />

      {requests.length === 0 ? (
        <EmptyState message="No requests are currently eligible for human review." />
      ) : (
        <div className="grid gap-4">
          {requests.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              onAction={(action) => handleAction(request.id, action)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
