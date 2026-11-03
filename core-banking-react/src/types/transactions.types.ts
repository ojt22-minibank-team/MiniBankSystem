export type TransactionType =
  | 'INTERNAL_TRANSFER'
  | 'OTC_DEPOSIT'
  | 'OTC_WITHDRAWAL'
  | 'EXTERNAL_PAYMENT'
  | 'LEDGER_ADJUSTMENT'
  | 'REFUND'
  | string;

export type TransactionStatus =
  | 'COMPLETED'
  | 'PENDING_AUTHORIZATION'
  | 'HELD'
  | 'FAILED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'REVERSED'
  | string;

export type TransactionChannel =
  | 'WEB'
  | 'MOBILE'
  | 'BRANCH'
  | 'ATM'
  | 'API'
  | 'STAFF_PORTAL'
  | string;

export interface StaffTransactionSummary {
  transactionId: string;
  transactionRef: string;
  transactionType: TransactionType;
  status: TransactionStatus;
  channel: TransactionChannel;
  amount: number;
  serviceFee: number;
  currency: string;
  sourceAccountNo: string | null;
  sourceCustomerName: string | null;
  destAccountNo: string | null;
  destCustomerName: string | null;
  initiatedByType: string;
  initiatedByName: string;
  description: string | null;
  initiatedAt: string;
  completedAt: string | null;
}

export interface TransactionReviewAction {
  transactionId: string;
  transactionRef: string;
  amount: number;
  currency: string;
  previousStatus: string;
  currentStatus: string;
  action: string;
  reason: string;
  riskLevel: string;
  resolutionNote: string;
  performedByStaff: string;
  performedAt: string;
}

export interface StaffTransactionDetail {
  transactionId: string;
  transactionRef: string;
  externalReference: string | null;
  idempotencyKey: string | null;
  transactionType: TransactionType;
  status: TransactionStatus;
  channel: TransactionChannel;
  amount: number;
  serviceFee: number;
  totalDebited: number;
  currency: string;

  sourceAccountId: string | null;
  sourceAccountNo: string | null;
  sourceAccountType: string | null;
  sourceCustomerCode: string | null;
  sourceCustomerName: string | null;

  destAccountId: string | null;
  destAccountNo: string | null;
  destAccountType: string | null;
  destCustomerCode: string | null;
  destCustomerName: string | null;

  initiatedByType: string;
  initiatedByName: string;
  initiatedByUsername: string | null;

  description: string | null;
  auditNote: string | null;
  failureCode: string | null;
  failureMessage: string | null;

  initiatedAt: string;
  authorizedAt: string | null;
  completedAt: string | null;
  expiresAt: string | null;
  updatedAt: string | null;

  reviewHistory: TransactionReviewAction[];
}

export interface StaffTransactionStats {
  totalCount: number;
  completedCount: number;
  heldOrPendingCount: number;
  failedCount: number;
  totalCompletedVolume: number;
}

export interface StaffTransactionSearchParams {
  search?: string;
  status?: string;
  transactionType?: string;
  channel?: string;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
  page?: number;
  size?: number;
  sort?: string;
}

export interface SpringPage<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}
