// src/types/report.types.ts

export interface TransactionReportRequest {
  fromDate: string; // ISO string (e.g., '2026-09-01T00:00:00')
  toDate: string;
  transactionType?: string;
  status?: string;
  channel?: string;
  accountNumber?: string;
  limit?: number;
}
