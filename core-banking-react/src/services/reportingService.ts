import axiosInstance from '../lib/axios';
import type {
  DailyLedgerSummary,
  AccountStatusReport,
  AuditTrailPage,
  LedgerFilterParams,
  AccountFilterParams,
  AuditFilterParams,
  FeeRevenueReport,
  FeeFilterParams,
  LargeTransactionReport,
  LargeTxFilterParams,
  TransactionDetailPage,
  ExportJobResponse,
  TransactionDetailFilterParams,
} from '../types/reports/reporting.types';

const BASE = '/api/v1/reports';

export async function fetchDailyLedgerSummary(
  params: LedgerFilterParams
): Promise<DailyLedgerSummary[]> {
  const res = await axiosInstance.get<DailyLedgerSummary[]>(
    `${BASE}/daily-ledger-summary`,
    {
      params: {
        startDate: params.startDate,
        endDate: params.endDate,
        status: params.status || undefined,
      },
    }
  );
  return res.data;
}

export async function fetchAccountStatusSummary(
  params: AccountFilterParams
): Promise<AccountStatusReport> {
  const res = await axiosInstance.get<AccountStatusReport>(
    `${BASE}/account-status-summary`,
    {
      params: {
        startDate: params.startDate,
        endDate: params.endDate,
        accountStatus: params.accountStatus || undefined,
      },
    }
  );
  return res.data;
}

export async function fetchAuditTrailLogs(
  params: AuditFilterParams
): Promise<AuditTrailPage> {
  const res = await axiosInstance.get<AuditTrailPage>(
    `${BASE}/audit-trail-logs`,
    {
      params: {
        staffId: params.staffId || undefined,
        actionType: params.actionType || undefined,
        startDate: params.startDate || undefined,
        endDate: params.endDate || undefined,
        accountNo: params.accountNo || undefined,
        page: params.page,
        pageSize: params.pageSize,
      },
    }
  );
  return res.data;
}

export async function fetchFeeRevenueSummary(
  params: FeeFilterParams
): Promise<FeeRevenueReport> {
  const res = await axiosInstance.get<FeeRevenueReport>(`${BASE}/fee-revenue`, {
    params: {
      startDate: params.startDate,
      endDate: params.endDate,
      channel: params.channel || undefined,
    },
  });
  return res.data;
}

export async function fetchLargeTransactions(
  params: LargeTxFilterParams
): Promise<LargeTransactionReport> {
  const res = await axiosInstance.get<LargeTransactionReport>(`${BASE}/large-transactions`, {
    params: {
      startDate: params.startDate,
      endDate: params.endDate,
      threshold: params.threshold || undefined,
      transactionType: params.transactionType || undefined,
      page: params.page || 1,
      pageSize: params.pageSize || 30,
    },
  });
  return res.data;
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    a.parentNode?.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, 1000);
}

export async function exportDailyLedger(
  params: LedgerFilterParams,
  format: 'csv' | 'excel' | 'pdf'
): Promise<void> {
  const res = await axiosInstance.get(`${BASE}/daily-ledger-summary/export`, {
    params: {
      startDate: params.startDate,
      endDate: params.endDate,
      status: params.status || undefined,
      format,
    },
    responseType: 'blob',
  });
  const ext = format === 'excel' ? 'xlsx' : format === 'pdf' ? 'pdf' : 'csv';
  triggerDownload(res.data as Blob, `Daily_Ledger_Summary.${ext}`);
}

export async function exportAccountStatus(
  params: AccountFilterParams,
  format: 'csv' | 'excel' | 'pdf'
): Promise<void> {
  const res = await axiosInstance.get(`${BASE}/account-status-summary/export`, {
    params: {
      startDate: params.startDate,
      endDate: params.endDate,
      accountStatus: params.accountStatus || undefined,
      format,
    },
    responseType: 'blob',
  });
  const ext = format === 'excel' ? 'xlsx' : format === 'pdf' ? 'pdf' : 'csv';
  triggerDownload(res.data as Blob, `Account_Status_Summary.${ext}`);
}

export async function exportAuditTrail(
  params: AuditFilterParams,
  format: 'csv' | 'excel' | 'pdf'
): Promise<void> {
  const res = await axiosInstance.get(`${BASE}/audit-trail-logs/export`, {
    params: {
      staffId: params.staffId || undefined,
      actionType: params.actionType || undefined,
      startDate: params.startDate || undefined,
      endDate: params.endDate || undefined,
      accountNo: params.accountNo || undefined,
      page: params.page,
      pageSize: params.pageSize,
      format,
    },
    responseType: 'blob',
  });
  const ext = format === 'excel' ? 'xlsx' : format === 'pdf' ? 'pdf' : 'csv';
  triggerDownload(res.data as Blob, `Audit_Trail_Log.${ext}`);
}

export async function exportFeeRevenue(
  params: FeeFilterParams,
  format: 'csv' | 'excel' | 'pdf'
): Promise<void> {
  const res = await axiosInstance.get(`${BASE}/fee-revenue/export`, {
    params: {
      startDate: params.startDate,
      endDate: params.endDate,
      channel: params.channel || undefined,
      format,
    },
    responseType: 'blob',
  });
  const ext = format === 'excel' ? 'xlsx' : format === 'pdf' ? 'pdf' : 'csv';
  triggerDownload(res.data as Blob, `Fee_Revenue_Report.${ext}`);
}

export async function exportLargeTransactions(
  params: LargeTxFilterParams,
  format: 'csv' | 'excel' | 'pdf'
): Promise<void> {
  const res = await axiosInstance.get(`${BASE}/large-transactions/export`, {
    params: {
      startDate: params.startDate,
      endDate: params.endDate,
      threshold: params.threshold || undefined,
      transactionType: params.transactionType || undefined,
      format,
    },
    responseType: 'blob',
  });
  const ext = format === 'excel' ? 'xlsx' : format === 'pdf' ? 'pdf' : 'csv';
  triggerDownload(res.data as Blob, `Large_Transactions.${ext}`);
}

// Transaction Detail Report endpoints
export async function fetchTransactionDetails(
  params: TransactionDetailFilterParams
): Promise<TransactionDetailPage> {
  const res = await axiosInstance.get<TransactionDetailPage>(
    `${BASE}/transaction-detail`,
    {
      params: {
        startDate: params.startDate,
        endDate: params.endDate,
        status: params.status || undefined,
        transactionType: params.transactionType || undefined,
        channel: params.channel || undefined,
        minAmount: params.minAmount,
        maxAmount: params.maxAmount,
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 30,
      },
    }
  );
  return res.data;
}

export async function exportTransactionDetails(
  params: TransactionDetailFilterParams,
  format: 'csv' | 'excel' | 'pdf'
): Promise<void> {
  const res = await axiosInstance.get(`${BASE}/transaction-detail/export`, {
    params: {
      startDate: params.startDate,
      endDate: params.endDate,
      status: params.status || undefined,
      transactionType: params.transactionType || undefined,
      channel: params.channel || undefined,
      minAmount: params.minAmount,
      maxAmount: params.maxAmount,
      format,
    },
    responseType: 'blob',
  });
  const ext = format === 'excel' ? 'xlsx' : format === 'pdf' ? 'pdf' : 'csv';
  triggerDownload(res.data as Blob, `Transaction_Detail_Report.${ext}`);
}

// -------------------------------------------------------------
// Enterprise Async Background Export Methods
// -------------------------------------------------------------

export async function startAsyncExport(
  params: Record<string, any>,
  format: 'csv' | 'excel' | 'pdf',
  reportType = 'TRANSACTION_DETAIL'
): Promise<ExportJobResponse> {
  const res = await axiosInstance.post<ExportJobResponse>(
    `${BASE}/export-async`,
    null,
    {
      params: {
        ...params,
        reportType,
        format,
      },
    }
  );
  return res.data;
}

export const startAsyncReportExport = (
  reportType: string,
  params: Record<string, any>,
  format: 'csv' | 'excel' | 'pdf'
): Promise<ExportJobResponse> => startAsyncExport(params, format, reportType);

export async function checkExportJobStatus(
  jobId: string
): Promise<ExportJobResponse> {
  const res = await axiosInstance.get<ExportJobResponse>(
    `${BASE}/export-jobs/${encodeURIComponent(jobId)}`
  );
  return res.data;
}

export async function downloadExportJobFile(
  jobId: string,
  fileName: string
): Promise<void> {
  const res = await axiosInstance.get(
    `${BASE}/export-jobs/${encodeURIComponent(jobId)}/download`,
    {
      responseType: 'blob',
    }
  );
  triggerDownload(res.data as Blob, fileName);
}
