import React, { useState, useEffect, useCallback, useRef } from 'react';
import type {
  FeeRevenueItem,
  FeeRevenueReport,
  FeeFilterParams,
} from '../../../types/reports/reporting.types';
import { fetchFeeRevenueSummary } from '../../../services/reportingService';
import MetricCard from './MetricCard';
import DataTable, { type Column } from './DataTable';
import ExportButtons from './ExportButtons';
import { ExportNotificationBanner } from './ExportNotificationBanner';
import { useAsyncExport } from '../hooks/useAsyncExport';

interface Props {
  startDate: string;
  endDate: string;
  channel?: string;
  searchKey?: number;
  onLoadingChange?: (loading: boolean) => void;
}

const typeColors: Record<string, string> = {
  INTERNAL_TRANSFER: '#2563EB',
  OTC_DEPOSIT: '#16a34a',
  OTC_WITHDRAWAL: '#dc2626',
  EXTERNAL_PAYMENT: '#0891b2',
  LEDGER_ADJUSTMENT: '#7c3aed',
  REFUND: '#ea580c',
};

const FeeRevenuePanel: React.FC<Props> = ({
  startDate,
  endDate,
  channel = '',
  searchKey,
  onLoadingChange,
}) => {
  const [report, setReport] = useState<FeeRevenueReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadDuration, setLoadDuration] = useState<number | null>(null);

  const {
    exportLoading,
    exportNotice,
    activeJob,
    exportError,
    triggerExport,
    clearNotice,
  } = useAsyncExport('FEE_REVENUE');

  const [page, setPage] = useState(1);
  const PAGE_SIZE = 30;

  const params: FeeFilterParams = { startDate, endDate, channel };

  const onLoadingChangeRef = useRef(onLoadingChange);
  useEffect(() => {
    onLoadingChangeRef.current = onLoadingChange;
  }, [onLoadingChange]);

  const load = useCallback(async () => {
    setLoading(true);
    onLoadingChangeRef.current?.(true);
    setError(null);
    const startTime = performance.now();
    try {
      const result = await fetchFeeRevenueSummary({
        startDate,
        endDate,
        channel: channel || undefined,
      });
      const elapsedSec = (performance.now() - startTime) / 1000;
      setLoadDuration(elapsedSec);
      setReport(result);
      setFetched(true);
    } catch (e: unknown) {
      const elapsedSec = (performance.now() - startTime) / 1000;
      setLoadDuration(elapsedSec);
      setError((e as Error).message || 'Failed to load fee revenue data');
    } finally {
      setLoading(false);
      onLoadingChangeRef.current?.(false);
    }
  }, [startDate, endDate, channel]);

  useEffect(() => {
    if (!searchKey) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchKey]);

  useEffect(() => {
    setPage(1);
  }, [searchKey, report?.items?.length]);

  const items = report?.items || [];
  const totalPages = Math.ceil(items.length / PAGE_SIZE) || 1;
  const paginatedData = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const grandTotalTx = report?.grandTotalTransactions ?? items.reduce((s, r) => s + Number(r.transactionCount || 0), 0);
  const grandTotalVol = report?.grandTotalVolume ?? items.reduce((s, r) => s + Number(r.totalVolume || 0), 0);
  const grandTotalFee = report?.grandTotalFeeRevenue ?? items.reduce((s, r) => s + Number(r.totalFeeRevenue || 0), 0);
  const avgFeeOverall = grandTotalTx > 0 ? grandTotalFee / grandTotalTx : 0;

  const columns: Column<FeeRevenueItem>[] = [
    {
      key: 'no',
      label: 'No',
      render: (_r: FeeRevenueItem, index: number) => (page - 1) * PAGE_SIZE + index + 1,
    },
    {
      key: 'transactionType',
      label: 'Transaction Type',
      render: (r: FeeRevenueItem) => (
        <span
          className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold"
          style={{
            backgroundColor: (typeColors[r.transactionType] ?? '#94a3b8') + '22',
            color: typeColors[r.transactionType] ?? '#64748b',
          }}
        >
          {r.transactionType}
        </span>
      ),
    },
    {
      key: 'channel',
      label: 'Channel',
      render: (r: FeeRevenueItem) => (
        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
          {r.channel}
        </span>
      ),
    },
    {
      key: 'transactionCount',
      label: 'Tx Count',
      render: (r: FeeRevenueItem) => Number(r.transactionCount || 0).toLocaleString(),
    },
    {
      key: 'totalVolume',
      label: 'Total Volume (MMK)',
      render: (r: FeeRevenueItem) =>
        Number(r.totalVolume || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }),
    },
    {
      key: 'totalFeeRevenue',
      label: 'Fee Revenue (MMK)',
      render: (r: FeeRevenueItem) => (
        <span className="font-bold text-emerald-600">
          {Number(r.totalFeeRevenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: 'avgFeePerTx',
      label: 'Avg Fee / Tx (MMK)',
      render: (r: FeeRevenueItem) =>
        Number(r.avgFeePerTx || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }),
    },
  ];

  return (
    <div className="w-full">
      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 mb-5">
        <MetricCard
          icon="💰"
          label="Total Fee Revenue"
          value={grandTotalFee.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          sub="All fee types & channels"
          color="#16a34a"
        />
        <MetricCard
          icon="📊"
          label="Total Transaction Volume"
          value={grandTotalVol.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          sub="Completed volume"
          color="#1E40AF"
        />
        <MetricCard
          icon="🔄"
          label="Total Transactions"
          value={grandTotalTx.toLocaleString()}
          sub="Fee-bearing operations"
          color="#2563EB"
        />
        <MetricCard
          icon="📈"
          label="Average Fee / Tx"
          value={avgFeeOverall.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          sub="Overall average yield"
          color="#7c3aed"
        />
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 border-b border-slate-100">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">
              Fee & Revenue Breakdown ({items.length} rows
              {totalPages > 1 ? ` — Page ${page} of ${totalPages} (30 rows/page)` : ''})
            </span>
            {loadDuration !== null && (
              <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                ⏱️ {loadDuration.toFixed(2)}s
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
              onClick={load}
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
            data={paginatedData}
            loading={loading}
            emptyMessage={
              fetched
                ? 'No fee revenue records found for the selected period.'
                : 'Click "Search" above to generate the fee revenue report.'
            }
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      </div>
    </div>
  );
};

export default FeeRevenuePanel;
