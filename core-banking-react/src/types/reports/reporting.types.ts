export interface DailyLedgerSummary {
  reportDate: string;
  transactionType: string;
  transactionCount: number;
  totalAmount: number;
  totalFee: number;
  currency: string;
}

export interface AccountStatusSummary {
  accountStatus: string;
  accountCount: number;
  newAccountsInRange: number;
  avgBalance: number;
  minBalance: number;
  maxBalance: number;
}

export interface BalanceBracket {
  balanceBracket: string;
  bracketCount: number;
  bracketTotalBalance: number;
  accountStatus: string;
}

export interface AccountStatusReport {
  statusSummaries: AccountStatusSummary[];
  bracketDistribution: BalanceBracket[];
}

export interface AuditTrailLog {
  logId: string;
  staffId: string;
  staffUsername: string;
  staffFullName: string;
  actionType: string;
  entityType: string;
  entityId: string;
  oldValue: string;
  newValue: string;
  ipAddress: string;
  description: string;
  createdAt: string;
}

export interface AuditTrailPage {
  logs: AuditTrailLog[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface LedgerFilterParams {
  startDate: string;
  endDate: string;
  status: string;
}

export interface AccountFilterParams {
  startDate: string;
  endDate: string;
  accountStatus: string;
}

export interface AuditFilterParams {
  staffId: string;
  actionType: string;
  startDate: string;
  endDate: string;
  accountNo: string;
  page: number;
  pageSize: number;
}
