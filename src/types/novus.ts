export type UserRole = 'sales_rep' | 'manager';

export type RequestStatus = 'rejected' | 'deferred' | 'eligible';

export interface Request {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: RequestStatus;
  timestamp: Date;
  summary?: string;
}

export interface SystemEvent {
  id: string;
  type: 'confidence_decay' | 'eligibility_change' | 'internal_review' | 'kill_switch';
  message: string;
  timestamp: Date;
}

export interface AggregateStats {
  eligible: number;
  deferred: number;
  rejected: number;
  totalToday: number;
}
