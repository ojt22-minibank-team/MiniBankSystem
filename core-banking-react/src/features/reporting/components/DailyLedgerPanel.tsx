import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { DailyLedgerSummary, LedgerFilterParams } from '../../../types/reports/reporting.types';
import {
  fetchDailyLedgerSummary,
  exportDailyLedger,
} from '../../../services/reportingService';
import MetricCard from './MetricCard';
import DataTable, { type Column } from './DataTable';
import ExportButtons from './ExportButtons';

interface Props {
  startDate: string;
  endDate: string;
  ledgerStatus: string;
  transactionType?: string;
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

const DailyLedgerPanel: React.FC<Props> = ({
  startDate,
  endDate,
  ledgerStatus,
  transactionType = '',
  searchKey,
  onLoadingChange,
}) => {
  const [data, setData] = useState<DailyLedgerSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadDuration, setLoadDuration] = useState<number | null>(null);

  const [page, setPage] = useState(1);
  const PAGE_SIZE = 30;

  const params: LedgerFilterParams = { startDate, endDate, status: ledgerStatus };

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
      const result = await fetchDailyLedgerSummary({
        startDate,
        endDate,
        status: ledgerStatus,
      });
      const elapsedSec = (performance.now() - startTime) / 1000;
      setLoadDuration(elapsedSec);
      setData(result);
    } catch (e: unknown) {
      const elapsedSec = (performance.now() - startTime) / 1000;
      setLoadDuration(elapsedSec);
      setError((e as Error).message || 'Failed to load data');
    } finally {
      setLoading(false);
      onLoadingChangeRef.current?.(false);
    }
  }, [startDate, endDate, ledgerStatus]);

  useEffect(() => {
    if (!searchKey) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchKey]);

  useEffect(() => {
    setPage(1);
  }, [searchKey, data.length, transactionType]);

  const filteredData = transactionType
    ? data.filter((r) => r.transactionType === transactionType)
    : data;

  const totalPages = Math.ceil(filteredData.length / PAGE_SIZE) || 1;
  const paginatedData = filteredData.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totalTxns = filteredData.reduce((s, r) => s + Number(r.transactionCount || 0), 0);
  const totalAmt = filteredData.reduce((s, r) => s + Number(r.totalAmount || 0), 0);
  const totalFee = filteredData.reduce((s, r) => s + Number(r.totalFee || 0), 0);
  const uniqueDates = new Set(filteredData.map((r) => r.reportDate)).size;

  const columns: Column<DailyLedgerSummary>[] = [
    {
      key: 'no',
      label: 'No',
      render: (_r: DailyLedgerSummary, index: number) => (page - 1) * PAGE_SIZE + index + 1,
    },
    {
      key: 'transactionType',
      label: 'Transaction Type',
      render: (r: DailyLedgerSummary) => (
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
    { key: 'reportDate', label: 'Date' },
    { key: 'transactionCount', label: 'Count' },
    {
      key: 'totalAmount',
      label: 'Total Amount (MMK)',
      render: (r: DailyLedgerSummary) =>
        r.totalAmount?.toLocaleString('en-US', { minimumFractionDigits: 2 }),
    },
    {
      key: 'totalFee',
      label: 'Total Fee (MMK)',
      render: (r: DailyLedgerSummary) =>
        r.totalFee?.toLocaleString('en-US', { minimumFractionDigits: 2 }),
    },
    { key: 'currency', label: 'Currency' },
  ];

  return (
    <div className="w-full">
      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 mb-5">
        <MetricCard
          icon="💳"
          label="Total Transactions"
          value={totalTxns.toLocaleString()}
          sub="Across all types"
          color="#2563EB"
        />
        <MetricCard
          icon="📊"
          label="Total Volume"
          value={totalAmt.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          sub="Sum of amounts"
          color="#1E40AF"
        />
        <MetricCard
          icon="💰"
          label="Total Fees Collected"
          value={totalFee.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          sub="All fee types"
          color="#7c3aed"
        />
        <MetricCard
          icon="📅"
          label="Active Days"
          value={uniqueDates}
          sub="Days with transactions"
          color="#0891b2"
        />
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 border-b border-slate-100">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">
              Daily Ledger Records ({filteredData.length} rows{totalPages > 1 ? ` — Page ${page} of ${totalPages} (30 rows/page)` : ''})
            </span>
            {loadDuration !== null && (
              <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                ⏱️ {loadDuration.toFixed(2)}s
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <ExportButtons
              onExportCsv={() => exportDailyLedger(params, 'csv')}
              onExportExcel={() => exportDailyLedger(params, 'excel')}
              onExportPdf={() => exportDailyLedger(params, 'pdf')}
              loading={loading}
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
            emptyMessage="No daily ledger records found for the selected period."
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      </div>
    </div>
  );
};

export default DailyLedgerPanel;
