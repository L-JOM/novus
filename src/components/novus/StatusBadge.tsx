import type { RequestStatus } from "@/types/novus";

interface StatusBadgeProps {
  status: RequestStatus;
}

const statusConfig = {
  rejected: {
    label: "REJECTED",
    className: "status-badge status-rejected",
  },
  deferred: {
    label: "DEFERRED BY REALITY",
    className: "status-badge status-deferred",
  },
  eligible: {
    label: "ELIGIBLE FOR HUMAN REVIEW",
    className: "status-badge status-eligible",
  },
};

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  const config = statusConfig[status];

  return (
    <span className={config.className}>
      {config.label}
    </span>
  );
};
