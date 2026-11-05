import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { TransactionDetail, TransactionDetailFilterParams } from '../../../types/reports/reporting.types';
import { fetchTransactionDetails, exportTransactionDetails } from '../../../services/reportingService';
import MetricCard from './MetricCard';
import DataTable, { type Column } from './DataTable';
import ExportButtons from './ExportButtons';
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
  const [data, setData] = useState<TransactionDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadDuration, setLoadDuration] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 30;

  const onLoadingRef = useRef(onLoadingChange);
  useEffect(() => {
    onLoadingRef.current = onLoadingChange;
  }, [onLoadingChange]);

  const getParams = useCallback((): TransactionDetailFilterParams => ({
    startDate,
    endDate,
    status: status || undefined,
    transactionType: transactionType || undefined,
    channel: channel || undefined,
    minAmount,
    maxAmount,
  }), [startDate, endDate, status, transactionType, channel, minAmount, maxAmount]);

  const load = useCallback(async () => {
    setLoading(true);
    onLoadingRef.current?.(true);
    setError(null);
    const startTime = performance.now();
    try {
      const result = await fetchTransactionDetails(getParams());
      const elapsedSec = (performance.now() - startTime) / 1000;
      setLoadDuration(elapsedSec);
      setData(result || []);
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
    load();
  }, [searchKey, load]);

  useEffect(() => {
    setPage(1);
  }, [searchKey, data.length]);

  const totalPages = Math.ceil(data.length / PAGE_SIZE) || 1;
  const paginatedData = data.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totalCount = data.length;
  const totalVolume = data.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const totalFees = data.reduce((sum, item) => sum + (Number(item.fee) || 0), 0);

  const handleExport = async (format: 'csv' | 'excel' | 'pdf') => {
    setExportLoading(true);
    try {
      await exportTransactionDetails(getParams(), format);
    } catch (err: unknown) {
      setError((err as Error).message || `Failed to export ${format}`);
    } finally {
      setExportLoading(false);
    }
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
      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4 mb-5">
        <MetricCard
          icon="💳"
          label="Total Transactions"
          value={totalCount.toLocaleString()}
          sub="Filtered records"
          color="#2563EB"
        />
        <MetricCard
          icon="📊"
          label="Total Volume"
          value={totalVolume.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          sub="Settled amount sum"
          color="#1E40AF"
        />
        <MetricCard
          icon="💰"
          label="Total Fee Revenue"
          value={totalFees.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          sub="Collected fees"
          color="#7c3aed"
        />
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 border-b border-slate-100">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">
              Transaction Details ({data.length} records{totalPages > 1 ? ` — Page ${page} of ${totalPages}` : ''})
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

        {error && (
          <div className="p-3 sm:p-4 text-xs sm:text-sm text-red-600 bg-red-50 border-b border-red-100">
            {error}
          </div>
        )}

        <div className="p-4 sm:p-5">
          <DataTable
            columns={columns}
            data={paginatedData}
            loading={loading}
            emptyMessage="No transaction detail records found for the selected period."
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      </div>
    </div>
  );
};

export default TransactionDetailPanel;
