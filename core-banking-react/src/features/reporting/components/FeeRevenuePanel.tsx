import React, { useState, useEffect, useCallback, useRef } from 'react';
import type {
  FeeRevenueItem,
  FeeRevenueReport,
  FeeFilterParams,
} from '../../../types/reports/reporting.types';
import {
  fetchFeeRevenueSummary,
  exportFeeRevenue,
} from '../../../services/reportingService';
import MetricCard from './MetricCard';
import DataTable, { type Column } from './DataTable';
import ExportButtons from './ExportButtons';

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
          style={{
            padding: '2px 8px',
            borderRadius: '10px',
            fontSize: '11px',
            fontWeight: 600,
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
        <span
          style={{
            padding: '2px 8px',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: 500,
            backgroundColor: '#f1f5f9',
            color: '#334155',
          }}
        >
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
        <span style={{ fontWeight: 700, color: '#16a34a' }}>
          {Number(r.totalFeeRevenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: 'avgFeePerTx',
      label: 'Avg Fee / Tx',
      render: (r: FeeRevenueItem) =>
        Number(r.avgFeePerTx || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }),
    },
  ];

  return (
    <div>
      {/* Metric Cards Row */}
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '20px' }}>
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
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 20px',
            borderBottom: '1px solid #f1f5f9',
          }}
        >
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
            Fee & Revenue Breakdown ({items.length} rows
            {totalPages > 1 ? ` — Page ${page} of ${totalPages} (30 rows/page)` : ''})
            {loadDuration !== null && (
              <span
                style={{
                  marginLeft: '10px',
                  fontSize: '11px',
                  fontWeight: 500,
                  color: '#64748b',
                  backgroundColor: '#f1f5f9',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                ⏱️ {loadDuration.toFixed(2)}s
              </span>
            )}
          </span>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <ExportButtons
              onExportCsv={() => exportFeeRevenue(params, 'csv')}
              onExportExcel={() => exportFeeRevenue(params, 'excel')}
              onExportPdf={() => exportFeeRevenue(params, 'pdf')}
              loading={loading}
            />
            <button
              onClick={load}
              disabled={loading}
              style={{
                padding: '8px 16px',
                backgroundColor: '#2563EB',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {loading ? 'Loading...' : 'Load Data'}
            </button>
          </div>
        </div>

        {error && (
          <div
            style={{
              padding: '12px 20px',
              color: '#dc2626',
              fontSize: '13px',
              backgroundColor: '#fef2f2',
            }}
          >
            Error: {error}
          </div>
        )}

        <div style={{ padding: '16px 20px' }}>
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
