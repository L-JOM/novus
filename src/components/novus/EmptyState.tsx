import { Inbox } from "lucide-react";

interface EmptyStateProps {
  message: string;
}

export const EmptyState = ({ message }: EmptyStateProps) => {
  return (
    <div className="card-grid p-12 flex flex-col items-center justify-center text-center">
      <div className="w-16 h-16 flex items-center justify-center bg-secondary mb-6">
        <Inbox size={24} className="text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground max-w-sm">
        {message}
      </p>
    </div>
  );
};
