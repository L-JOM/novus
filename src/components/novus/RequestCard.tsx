import { User, Mail, Phone, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./StatusBadge";
import type { Request } from "@/types/novus";

interface RequestCardProps {
  request: Request;
  onAction: (action: 'accept' | 'contacted' | 'no_response') => void;
}

export const RequestCard = ({ request, onAction }: RequestCardProps) => {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  return (
    <div className="card-grid p-6 space-y-4">
      <div className="flex items-start justify-between">
        <StatusBadge status={request.status} />
        <span className="data-cell">{formatTime(request.timestamp)}</span>
      </div>

      <div className="space-y-3 pt-2">
        <div className="flex items-center gap-3">
          <User size={14} className="text-muted-foreground" />
          <span className="text-sm font-medium">{request.name}</span>
        </div>
        <div className="flex items-center gap-3">
          <Mail size={14} className="text-muted-foreground" />
          <span className="data-cell">{request.email}</span>
        </div>
        <div className="flex items-center gap-3">
          <Phone size={14} className="text-muted-foreground" />
          <span className="data-cell">{request.phone}</span>
        </div>
      </div>

      {request.summary && (
        <div className="pt-2 border-t border-border">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {request.summary}
          </p>
        </div>
      )}

      <div className="flex gap-2 pt-4">
        <Button 
          variant="default" 
          size="sm" 
          className="flex-1 font-mono text-xs tracking-wide"
          onClick={() => onAction('accept')}
        >
          ACCEPT & CONTACT
          <ArrowRight size={14} className="ml-2" />
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          className="font-mono text-xs tracking-wide"
          onClick={() => onAction('contacted')}
        >
          CONTACTED
        </Button>
        <Button 
          variant="ghost" 
          size="sm"
          className="font-mono text-xs tracking-wide text-muted-foreground"
          onClick={() => onAction('no_response')}
        >
          NO RESPONSE
        </Button>
      </div>
    </div>
  );
};
