import React, { useState, useEffect, useCallback, useRef } from 'react';
import type {
  AuditTrailLog,
  AuditTrailPage,
  AuditFilterParams,
} from '../../../types/reports/reporting.types';
import { fetchAuditTrailLogs } from '../../../services/reportingService';
import DataTable, { type Column } from './DataTable';
import ExportButtons from './ExportButtons';
import MetricCard from './MetricCard';
import { ExportNotificationBanner } from './ExportNotificationBanner';
import { useAsyncExport } from '../hooks/useAsyncExport';
import { formatDateTime } from '../../../utils/formatDate';

interface Props {
  staffId: string;
  actionType: string;
  auditStartDate: string;
  auditEndDate: string;
  accountNo: string;
  searchKey?: number;
  onLoadingChange?: (loading: boolean) => void;
}

const ACTION_BADGE_COLOR: Record<string, string> = {
  LOGIN: '#2563EB',
  LOGOUT: '#64748b',
  CREATE_ACCOUNT: '#16a34a',
  UPDATE_ACCOUNT: '#d97706',
  FREEZE_ACCOUNT: '#0891b2',
  SUSPEND_ACCOUNT: '#dc2626',
  CREATE_CUSTOMER: '#7c3aed',
  APPROVE_KYC: '#16a34a',
  REJECT_KYC: '#dc2626',
  TRANSFER: '#1E40AF',
};

const AuditTrailPanel: React.FC<Props> = ({
  staffId,
  actionType,
  auditStartDate,
  auditEndDate,
  accountNo,
  searchKey,
  onLoadingChange,
}) => {
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;
  const [pageData, setPageData] = useState<AuditTrailPage>({
    logs: [],
    totalCount: 0,
    page: 1,
    pageSize: PAGE_SIZE,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    exportLoading,
    exportNotice,
    activeJob,
    exportError,
    triggerExport,
    clearNotice,
  } = useAsyncExport('AUDIT_TRAIL');

  const params: AuditFilterParams = {
    staffId,
    actionType,
    startDate: auditStartDate,
    endDate: auditEndDate,
    accountNo,
    page,
    pageSize: PAGE_SIZE,
  };

  const onLoadingChangeRef = useRef(onLoadingChange);
  useEffect(() => {
    onLoadingChangeRef.current = onLoadingChange;
  }, [onLoadingChange]);

  const load = useCallback(
    async (targetPage = 1) => {
      setLoading(true);
      onLoadingChangeRef.current?.(true);
      setError(null);
      try {
        const result = await fetchAuditTrailLogs({
          staffId,
          actionType,
          startDate: auditStartDate,
          endDate: auditEndDate,
          accountNo,
          page: targetPage,
          pageSize: PAGE_SIZE,
        });
        setPageData(result);
        setPage(targetPage);
      } catch (e: unknown) {
        setError((e as Error).message || 'Failed to load audit trail');
      } finally {
        setLoading(false);
        onLoadingChangeRef.current?.(false);
      }
    },
    [staffId, actionType, auditStartDate, auditEndDate, accountNo]
  );

  useEffect(() => {
    if (!searchKey) return;
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchKey]);

  const handlePageChange = (p: number) => load(p);

  const columns: Column<AuditTrailLog>[] = [
    {
      key: 'createdAt',
      label: 'Timestamp',
      render: (r: AuditTrailLog) => (
        <span className="text-[11px] text-slate-500 whitespace-nowrap">
          {formatDateTime(r.createdAt)}
        </span>
      ),
    },
    {
      key: 'staffUsername',
      label: 'Actor / User',
      render: (r: AuditTrailLog) => (
        <div>
          <div className="font-semibold text-blue-800 text-xs truncate max-w-[140px]">
            {r.staffUsername || r.staffId || '-'}
          </div>
          <div className="text-[10px] text-slate-400 truncate max-w-[140px]">
            {r.staffFullName ? `${r.staffFullName} (${r.actorType || 'STAFF'})` : (r.actorType || 'STAFF')}
          </div>
        </div>
      ),
    },
    {
      key: 'actionCategory',
      label: 'Category',
      render: (r: AuditTrailLog) => (
        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 uppercase tracking-wide">
          {r.actionCategory || '-'}
        </span>
      ),
    },
    {
      key: 'actionType',
      label: 'Action',
      render: (r: AuditTrailLog) => (
        <span
          className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap"
          style={{
            backgroundColor: (ACTION_BADGE_COLOR[r.actionType] ?? '#94a3b8') + '22',
            color: ACTION_BADGE_COLOR[r.actionType] ?? '#64748b',
          }}
        >
          {r.actionType}
        </span>
      ),
    },
    { key: 'entityType', label: 'Entity Type' },
    { key: 'entityId', label: 'Entity / Account' },
    {
      key: 'ipAddress',
      label: 'IP Address',
      render: (r: AuditTrailLog) => (
        <span className="font-mono text-xs text-slate-600">{r.ipAddress}</span>
      ),
    },
    {
      key: 'description',
      label: 'Description',
      render: (r: AuditTrailLog) => (
        <span
          className="text-xs text-slate-600 max-w-xs block truncate"
          title={r.description}
        >
          {r.description || '-'}
        </span>
      ),
    },
  ];

  return (
    <div className="w-full">
      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4 mb-5">
        <MetricCard
          icon="📜"
          label="Total Log Entries"
          value={pageData.totalCount.toLocaleString()}
          sub="Matching filters"
          color="#1E40AF"
        />
        <MetricCard
          icon="📑"
          label="Current Page"
          value={`${pageData.page} / ${pageData.totalPages || 1}`}
          sub={`${PAGE_SIZE} rows/page`}
          color="#2563EB"
        />
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 border-b border-slate-100">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs sm:text-sm font-bold text-slate-900">
              System Audit Trail Logs
            </span>
            {pageData.totalCount > 0 && (
              <span className="text-[11px] text-slate-400 font-medium">
                ({pageData.totalCount.toLocaleString()} total entries)
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <ExportButtons
              onExportCsv={() => triggerExport(params, 'csv')}
              onExportExcel={() => triggerExport(params, 'excel')}
              onExportPdf={() => triggerExport(params, 'pdf')}
              loading={exportLoading}
            />
            <button
              onClick={() => load(1)}
              disabled={loading}
              className="px-3 sm:px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Enterprise Async background export banner */}
        <ExportNotificationBanner
          exportNotice={exportNotice}
          exportLoading={exportLoading}
          activeJob={activeJob}
          exportError={exportError}
          onDismiss={clearNotice}
        />

        {error && (
          <div className="p-3 sm:p-4 text-xs sm:text-sm text-red-600 bg-red-50 border-b border-red-100">
            Error: {error}
          </div>
        )}

        <div className="p-4 sm:p-5">
          <DataTable
            columns={columns}
            data={pageData.logs}
            loading={loading}
            emptyMessage="No audit trail entries found matching the criteria."
            page={pageData.page}
            totalPages={pageData.totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      </div>
    </div>
  );
};

export default AuditTrailPanel;
