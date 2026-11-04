import React, { useState, useEffect, useCallback, useRef } from 'react';
import type {
  LargeTransactionItem,
  LargeTransactionReport,
  LargeTxFilterParams,
} from '../../../types/reports/reporting.types';
import {
  fetchLargeTransactions,
  exportLargeTransactions,
} from '../../../services/reportingService';
import MetricCard from './MetricCard';
import DataTable, { type Column } from './DataTable';
import ExportButtons from './ExportButtons';

interface Props {
  startDate: string;
  endDate: string;
  threshold?: number;
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

const LargeTransactionPanel: React.FC<Props> = ({
  startDate,
  endDate,
  threshold = 10000000,
  transactionType = '',
  searchKey,
  onLoadingChange,
}) => {
  const [report, setReport] = useState<LargeTransactionReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, setLoadDuration] = useState<number | null>(null);

  const [page, setPage] = useState(1);
  const PAGE_SIZE = 30;

  const params: LargeTxFilterParams = {
    startDate,
    endDate,
    threshold,
    transactionType: transactionType || undefined,
  };

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
      const result = await fetchLargeTransactions({
        startDate,
        endDate,
        threshold,
        transactionType: transactionType || undefined,
      });
      const elapsedSec = (performance.now() - startTime) / 1000;
      setLoadDuration(elapsedSec);
      setReport(result);
      setFetched(true);
    } catch (e: unknown) {
      const elapsedSec = (performance.now() - startTime) / 1000;
      setLoadDuration(elapsedSec);
      setError((e as Error).message || 'Failed to load large transaction data');
    } finally {
      setLoading(false);
      onLoadingChangeRef.current?.(false);
    }
  }, [startDate, endDate, threshold, transactionType]);

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

  const totalFlaggedCount = report?.totalFlaggedCount ?? items.length;
  const totalFlaggedVol = report?.totalFlaggedVolume ?? items.reduce((s, r) => s + Number(r.amount || 0), 0);
  const highRiskCount = items.filter((r) => r.riskLevel === 'HIGH RISK').length;
  const medRiskCount = items.filter((r) => r.riskLevel === 'MEDIUM RISK').length;

  const columns: Column<LargeTransactionItem>[] = [
    {
      key: 'no',
      label: 'No',
      render: (_r: LargeTransactionItem, index: number) => (page - 1) * PAGE_SIZE + index + 1,
    },
    {
      key: 'transactionRef',
      label: 'Tx Reference',
      render: (r: LargeTransactionItem) => (
        <span className="font-mono font-semibold text-teal-700">
          {r.transactionRef}
        </span>
      ),
    },
    {
      key: 'transactionTime',
      label: 'Timestamp',
      render: (r: LargeTransactionItem) =>
        r.transactionTime ? r.transactionTime.replace('T', ' ') : '—',
    },
    {
      key: 'transactionType',
      label: 'Type',
      render: (r: LargeTransactionItem) => (
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
      render: (r: LargeTransactionItem) => (
        <span className="inline-block px-2 py-0.5 rounded text-[11px] bg-slate-100 text-slate-600">
          {r.channel}
        </span>
      ),
    },
    {
      key: 'amount',
      label: 'Amount (MMK)',
      render: (r: LargeTransactionItem) => (
        <span className="font-bold text-red-600">
          {Number(r.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: 'sourceAccount',
      label: 'Source Account / Customer',
      render: (r: LargeTransactionItem) => (
        <div>
          <div className="font-semibold text-slate-800">{r.sourceAccountNo}</div>
          <div className="text-[11px] text-slate-500">{r.sourceCustomerName}</div>
        </div>
      ),
    },
    {
      key: 'destAccount',
      label: 'Destination Account / Customer',
      render: (r: LargeTransactionItem) => (
        <div>
          <div className="font-semibold text-slate-800">{r.destAccountNo}</div>
          <div className="text-[11px] text-slate-500">{r.destCustomerName}</div>
        </div>
      ),
    },
    {
      key: 'riskLevel',
      label: 'Risk Level',
      render: (r: LargeTransactionItem) => {
        const isHigh = r.riskLevel === 'HIGH RISK';
        const isMed = r.riskLevel === 'MEDIUM RISK';
        const bg = isHigh ? 'bg-red-100 text-red-700' : isMed ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-700';
        return (
          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${bg}`}>
            {r.riskLevel}
          </span>
        );
      },
    },
  ];

  return (
    <div className="w-full">
      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 mb-5">
        <MetricCard
          icon="⚠️"
          label="Flagged Transactions"
          value={totalFlaggedCount.toLocaleString()}
          sub="Exceeding threshold"
          color="#dc2626"
        />
        <MetricCard
          icon="💼"
          label="Total Flagged Volume"
          value={totalFlaggedVol.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          sub="High-value AML volume"
          color="#1E40AF"
        />
        <MetricCard
          icon="🛡️"
          label="Threshold Cutoff"
          value={`${Number(threshold || 10000000).toLocaleString()} MMK`}
          sub="Monitoring limit"
          color="#d97706"
        />
        <MetricCard
          icon="🚨"
          label="Risk Distribution"
          value={`${highRiskCount} High / ${medRiskCount} Med`}
          sub="High risk = 2x threshold"
          color="#7c3aed"
        />
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 border-b border-slate-100">
          <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">
            Large Transactions & AML Monitoring ({items.length} rows
            {totalPages > 1 ? ` — Page ${page} of ${totalPages} (30 rows/page)` : ''})
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            <ExportButtons
              onExportCsv={() => exportLargeTransactions(params, 'csv')}
              onExportExcel={() => exportLargeTransactions(params, 'excel')}
              onExportPdf={() => exportLargeTransactions(params, 'pdf')}
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
            emptyMessage={
              fetched
                ? 'No high-value transactions found above the specified threshold.'
                : 'Click "Search" above to generate the AML report.'
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

export default LargeTransactionPanel;
