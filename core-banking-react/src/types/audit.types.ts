export type ActorType =
  | 'STAFF'
  | 'CUSTOMER'
  | 'SYSTEM'
  | 'CORPORATE_USER'
  | 'GUEST';

export interface AuditLogItem {
  auditId: number;
  actorType: ActorType | string;
  actorStaffId?: string | null;
  actorStaffUsername?: string | null;
  actorCustomerId?: string | null;
  actionCategory?: string | null;
  actionType: string;
  entityType?: string | null;
  entityId?: string | null;
  description?: string | null;
  requestUrl?: string | null;
  oldValues?: string | null;
  newValues?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
  createdAt: string;
}

export interface AuditSearchParams {
  staffUsername?: string;
  staffId?: string;
  customerId?: string;
  actorType?: string;
  actionCategory?: string;
  actionType?: string;
  entityType?: string;
  entityId?: string;
  ipAddress?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
  numberOfElements?: number;
}
