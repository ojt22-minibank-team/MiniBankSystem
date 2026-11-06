import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { TransactionDetail, TransactionDetailFilterParams, TransactionDetailPage } from '../../../types/reports/reporting.types';
import { fetchTransactionDetails } from '../../../services/reportingService';
import MetricCard from './MetricCard';
import DataTable, { type Column } from './DataTable';
import ExportButtons from './ExportButtons';
import { ExportNotificationBanner } from './ExportNotificationBanner';
import { useAsyncExport } from '../hooks/useAsyncExport';
import { formatDateTime } from '../../../utils/formatDate';

interface Props {
  startDate: string;
  endDate: string;
  status?: string;
  transactionType?: string;
  channel?: string;
  minAmount?: number;
  maxAmount?: number;
  searchKey?: number;
  onLoadingChange?: (loading: boolean) => void;
}

const statusColors: Record<string, string> = {
  COMPLETED: '#16a34a',
  PENDING: '#d97706',
  FAILED: '#dc2626',
  REVERSED: '#9333ea',
};

const PAGE_SIZE = 30;

const TransactionDetailPanel: React.FC<Props> = ({
  startDate,
  endDate,
  status = '',
  transactionType = '',
  channel = '',
  minAmount,
  maxAmount,
  searchKey,
  onLoadingChange,
}) => {
  const [pageData, setPageData] = useState<TransactionDetailPage>({
    rows: [],
    totalCount: 0,
    totalVolume: 0,
    totalFees: 0,
    page: 1,
    pageSize: PAGE_SIZE,
    totalPages: 0,
  });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadDuration, setLoadDuration] = useState<number | null>(null);

  const {
    exportLoading,
    exportNotice,
    activeJob,
    exportError,
    triggerExport,
    clearNotice,
  } = useAsyncExport('TRANSACTION_DETAIL');

  const onLoadingRef = useRef(onLoadingChange);
  useEffect(() => {
    onLoadingRef.current = onLoadingChange;
  }, [onLoadingChange]);

  const getParams = useCallback((targetPage = 1): TransactionDetailFilterParams => ({
    startDate,
    endDate,
    status: status || undefined,
    transactionType: transactionType || undefined,
    channel: channel || undefined,
    minAmount,
    maxAmount,
    page: targetPage,
    pageSize: PAGE_SIZE,
  }), [startDate, endDate, status, transactionType, channel, minAmount, maxAmount]);

  const load = useCallback(async (targetPage = 1) => {
    setLoading(true);
    onLoadingRef.current?.(true);
    setError(null);
    const startTime = performance.now();
    try {
      const result = await fetchTransactionDetails(getParams(targetPage));
      const elapsedSec = (performance.now() - startTime) / 1000;
      setLoadDuration(elapsedSec);
      setPageData(result || {
        rows: [],
        totalCount: 0,
        totalVolume: 0,
        totalFees: 0,
        page: targetPage,
        pageSize: PAGE_SIZE,
        totalPages: 0,
      });
      setPage(targetPage);
    } catch (e: unknown) {
      const elapsedSec = (performance.now() - startTime) / 1000;
      setLoadDuration(elapsedSec);
      setError((e as Error).message ?? 'Failed to load transaction details');
    } finally {
      setLoading(false);
      onLoadingRef.current?.(false);
    }
  }, [getParams]);

  useEffect(() => {
    if (!searchKey) return;
    load(1);
  }, [searchKey, load]);

  const handlePageChange = (newPage: number) => {
    load(newPage);
  };

  const handleExport = (format: 'csv' | 'excel' | 'pdf') => {
    triggerExport(getParams(1), format);
  };

  const columns: Column<TransactionDetail>[] = [
    {
      key: 'no',
      label: 'No',
      render: (_r, index) => (page - 1) * PAGE_SIZE + index + 1,
    },
    { key: 'ref', label: 'Reference' },
    {
      key: 'date',
      label: 'Date & Time',
      render: (r) => formatDateTime(r.date),
    },
    {
      key: 'amount',
      label: 'Amount (MMK)',
      render: (r) => (
        <span className="font-semibold text-slate-800">
          {r.amount != null ? Number(r.amount).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}
        </span>
      ),
    },
    {
      key: 'fee',
      label: 'Fee (MMK)',
      render: (r) => (
        <span>
          {r.fee != null ? Number(r.fee).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}
        </span>
      ),
    },
    { key: 'sourceAccount', label: 'Source Account' },
    { key: 'destAccount', label: 'Destination Account' },
    {
      key: 'status',
      label: 'Status',
      render: (r) => (
        <span
          className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold"
          style={{
            backgroundColor: (statusColors[r.status] ?? '#64748b') + '18',
            color: statusColors[r.status] ?? '#64748b',
          }}
        >
          {r.status}
        </span>
      ),
    },
    { key: 'channel', label: 'Channel' },
    { key: 'currency', label: 'Currency' },
  ];

  return (
    <div className="w-full">
      {/* Metric Cards Grid - computed fast by DB server-side */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4 mb-5">
        <MetricCard
          icon="💳"
          label="Total Transactions"
          value={pageData.totalCount.toLocaleString()}
          sub="Filtered records"
          color="#2563EB"
        />
        <MetricCard
          icon="📊"
          label="Total Volume"
          value={Number(pageData.totalVolume || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          sub="Settled amount sum"
          color="#1E40AF"
        />
        <MetricCard
          icon="💰"
          label="Total Fee Revenue"
          value={Number(pageData.totalFees || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          sub="Collected fees"
          color="#7c3aed"
        />
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 border-b border-slate-100">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">
              Transaction Details ({pageData.totalCount.toLocaleString()} records{pageData.totalPages > 1 ? ` — Page ${pageData.page} of ${pageData.totalPages}` : ''})
            </span>
            {loadDuration !== null && (
              <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                ⏱️ {loadDuration.toFixed(2)}s
              </span>
            )}
          </div>
          <ExportButtons
            onExportCsv={() => handleExport('csv')}
            onExportExcel={() => handleExport('excel')}
            onExportPdf={() => handleExport('pdf')}
            loading={exportLoading}
          />
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
            {error}
          </div>
        )}

        <div className="p-4 sm:p-5">
          <DataTable
            columns={columns}
            data={pageData.rows}
            loading={loading}
            emptyMessage="No transaction detail records found for the selected period."
            page={pageData.page}
            totalPages={pageData.totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      </div>
    </div>
  );
};

export default TransactionDetailPanel;
