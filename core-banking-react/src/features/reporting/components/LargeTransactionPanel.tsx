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
  const [loadDuration, setLoadDuration] = useState<number | null>(null);

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
        <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#0f766e' }}>
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
      render: (r: LargeTransactionItem) => (
        <span
          style={{
            padding: '2px 6px',
            borderRadius: '4px',
            fontSize: '11px',
            backgroundColor: '#f1f5f9',
            color: '#475569',
          }}
        >
          {r.channel}
        </span>
      ),
    },
    {
      key: 'amount',
      label: 'Amount (MMK)',
      render: (r: LargeTransactionItem) => (
        <span style={{ fontWeight: 700, color: '#dc2626' }}>
          {Number(r.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: 'sourceAccount',
      label: 'Source Account / Customer',
      render: (r: LargeTransactionItem) => (
        <div>
          <div style={{ fontWeight: 600, color: '#1e293b' }}>{r.sourceAccountNo}</div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>{r.sourceCustomerName}</div>
        </div>
      ),
    },
    {
      key: 'destAccount',
      label: 'Destination Account / Customer',
      render: (r: LargeTransactionItem) => (
        <div>
          <div style={{ fontWeight: 600, color: '#1e293b' }}>{r.destAccountNo}</div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>{r.destCustomerName}</div>
        </div>
      ),
    },
    {
      key: 'riskLevel',
      label: 'Risk Level',
      render: (r: LargeTransactionItem) => {
        const isHigh = r.riskLevel === 'HIGH RISK';
        const isMed = r.riskLevel === 'MEDIUM RISK';
        const bg = isHigh ? '#fee2e2' : isMed ? '#fef3c7' : '#eff6ff';
        const color = isHigh ? '#b91c1c' : isMed ? '#92400e' : '#1d4ed8';
        return (
          <span
            style={{
              padding: '3px 8px',
              borderRadius: '12px',
              fontSize: '10px',
              fontWeight: 700,
              backgroundColor: bg,
              color: color,
              display: 'inline-block',
            }}
          >
            {r.riskLevel}
          </span>
        );
      },
    },
  ];

  return (
    <div>
      {/* Metric Cards Row */}
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '20px' }}>
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
            Large Transactions & AML Monitoring ({items.length} rows
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
              onExportCsv={() => exportLargeTransactions(params, 'csv')}
              onExportExcel={() => exportLargeTransactions(params, 'excel')}
              onExportPdf={() => exportLargeTransactions(params, 'pdf')}
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
