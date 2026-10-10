import axiosInstance from '../lib/axios';
import type {
  DailyLedgerSummary,
  AccountStatusReport,
  AuditTrailPage,
  LedgerFilterParams,
  AccountFilterParams,
  AuditFilterParams,
} from '../types/reports/reporting.types';

const BASE = '/api/v1/reports';

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchDailyLedgerSummary(
  params: LedgerFilterParams
): Promise<DailyLedgerSummary[]> {
  const res = await axiosInstance.get<DailyLedgerSummary[]>(
    `${BASE}/daily-ledger-summary`,
    {
      headers: authHeaders(),
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
      headers: authHeaders(),
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
      headers: authHeaders(),
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

function triggerDownload(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.parentNode?.removeChild(a);
  window.URL.revokeObjectURL(url);
}

export async function exportDailyLedger(
  params: LedgerFilterParams,
  format: 'csv' | 'excel' | 'pdf'
): Promise<void> {
  const res = await axiosInstance.get(`${BASE}/daily-ledger-summary/export`, {
    headers: authHeaders(),
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
    headers: authHeaders(),
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
    headers: authHeaders(),
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
