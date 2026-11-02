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
  actorType?: string;
  actionCategory?: string;
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


export interface FeeRevenueItem {
  transactionType: string;
  channel: string;
  transactionCount: number;
  totalVolume: number;
  totalFeeRevenue: number;
  avgFeePerTx: number;
}

export interface FeeRevenueReport {
  startDate: string;
  endDate: string;
  channel: string;
  grandTotalTransactions: number;
  grandTotalVolume: number;
  grandTotalFeeRevenue: number;
  items: FeeRevenueItem[];
}

export interface FeeFilterParams {
  startDate: string;
  endDate: string;
  channel?: string;
}

export interface LargeTransactionItem {
  transactionRef: string;
  transactionTime: string;
  transactionType: string;
  channel: string;
  amount: number;
  currency: string;
  sourceAccountNo: string;
  sourceCustomerName: string;
  destAccountNo: string;
  destCustomerName: string;
  riskLevel: 'STANDARD' | 'MEDIUM RISK' | 'HIGH RISK';
}

export interface LargeTransactionReport {
  startDate: string;
  endDate: string;
  thresholdAmount: number;
  transactionType: string;
  totalFlaggedCount: number;
  totalFlaggedVolume: number;
  items: LargeTransactionItem[];
}

export interface LargeTxFilterParams {
  startDate: string;
  endDate: string;
  threshold?: number;
  transactionType?: string;
}
