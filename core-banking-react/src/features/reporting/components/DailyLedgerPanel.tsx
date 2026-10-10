import React, { useState, useEffect, useCallback } from 'react';
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
}

const typeColors: Record<string, string> = {
  TRANSFER: '#2563EB',
  INTERNAL_TRANSFER: '#2563EB',
  OTC_DEPOSIT: '#16a34a',
  OTC_WITHDRAWAL: '#dc2626',
  EXTERNAL_PAYMENT: '#0891b2',
  LEDGER_ADJUSTMENT: '#7c3aed',
  REFUND: '#ea580c',
  MERCHANT_CHECKOUT: '#d97706',
};

const DailyLedgerPanel: React.FC<Props> = ({
  startDate,
  endDate,
  ledgerStatus,
  transactionType = '',
  searchKey,
}) => {
  const [data, setData] = useState<DailyLedgerSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const PAGE_SIZE = 30;

  const params: LedgerFilterParams = { startDate, endDate, status: ledgerStatus };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchDailyLedgerSummary(params);
      setData(result);
      setFetched(true);
    } catch (e: unknown) {
      setError((e as Error).message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, ledgerStatus]);

  useEffect(() => {
    load();
  }, [load, searchKey]);

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

  const chartData = [...filteredData].sort((a, b) => b.totalAmount - a.totalAmount).slice(0, 8);
  const maxAmt = Math.max(...chartData.map((r) => r.totalAmount), 1);
  const BAR_H = 120;

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
    { key: 'reportDate', label: 'Date' },
    { key: 'transactionCount', label: 'Count' },
    {
      key: 'totalAmount',
      label: 'Total Amount',
      render: (r: DailyLedgerSummary) =>
        r.totalAmount?.toLocaleString('en-US', { minimumFractionDigits: 2 }),
    },
    {
      key: 'totalFee',
      label: 'Total Fee',
      render: (r: DailyLedgerSummary) =>
        r.totalFee?.toLocaleString('en-US', { minimumFractionDigits: 2 }),
    },
    { key: 'currency', label: 'Currency' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '20px' }}>
        <MetricCard
          icon="Transactions"
          label="Total Transactions"
          value={totalTxns.toLocaleString()}
          sub="Across all types"
          color="#2563EB"
        />
        <MetricCard
          icon="Volume"
          label="Total Volume"
          value={totalAmt.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          sub="Sum of amounts"
          color="#1E40AF"
        />
        <MetricCard
          icon="Fees"
          label="Total Fees Collected"
          value={totalFee.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          sub="All fee types"
          color="#7c3aed"
        />
        <MetricCard
          icon="Days"
          label="Active Days"
          value={uniqueDates}
          sub="Days with transactions"
          color="#0891b2"
        />
      </div>

      {fetched && chartData.length > 0 && (
        <div
          style={{
            backgroundColor: '#fff',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            padding: '20px 24px',
            marginBottom: '20px',
          }}
        >
          <div
            style={{
              fontSize: '13px',
              fontWeight: 700,
              color: '#1E40AF',
              marginBottom: '12px',
            }}
          >
            Top Transactions by Volume
          </div>
          <svg
            width="100%"
            height={BAR_H + 40}
            viewBox={`0 0 ${chartData.length * 72} ${BAR_H + 40}`}
            preserveAspectRatio="xMidYMid meet"
          >
            {chartData.map((r, i) => {
              const barH = Math.max(4, (r.totalAmount / maxAmt) * BAR_H);
              const color = typeColors[r.transactionType] ?? '#2563EB';
              return (
                <g key={i} transform={`translate(${i * 72}, 0)`}>
                  <rect
                    x={10}
                    y={BAR_H - barH}
                    width={50}
                    height={barH}
                    fill={color}
                    rx={4}
                    fillOpacity={0.85}
                  />
                  <text x={35} y={BAR_H + 14} textAnchor="middle" fontSize="9" fill="#64748b">
                    {r.reportDate}
                  </text>
                  <text
                    x={35}
                    y={BAR_H - barH - 4}
                    textAnchor="middle"
                    fontSize="9"
                    fill={color}
                    fontWeight="bold"
                  >
                    {r.transactionCount}
                  </text>
                </g>
              );
            })}
          </svg>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '8px' }}>
            {Object.entries(typeColors).map(([k, v]) => (
              <span
                key={k}
                style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <span
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '2px',
                    backgroundColor: v,
                    display: 'inline-block',
                  }}
                />
                {k}
              </span>
            ))}
          </div>
        </div>
      )}

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
            Daily Ledger Records ({filteredData.length} rows{totalPages > 1 ? ` — Page ${page} of ${totalPages} (30 rows/page)` : ''})
          </span>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <ExportButtons
              onExportCsv={() => exportDailyLedger(params, 'csv')}
              onExportExcel={() => exportDailyLedger(params, 'excel')}
              onExportPdf={() => exportDailyLedger(params, 'pdf')}
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
