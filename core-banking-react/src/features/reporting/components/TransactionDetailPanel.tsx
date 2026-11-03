import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { TransactionDetail, TransactionDetailFilterParams } from '../../../types/reports/reporting.types';
import { fetchTransactionDetails, exportTransactionDetails } from '../../../services/reportingService';
import MetricCard from './MetricCard';
import DataTable, { type Column } from './DataTable';
import ExportButtons from './ExportButtons';

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
    { key: 'date', label: 'Date & Time' },
    {
      key: 'amount',
      label: 'Amount',
      render: (r) => (
        <span style={{ fontWeight: 600 }}>
          {r.amount != null ? Number(r.amount).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}
        </span>
      ),
    },
    {
      key: 'fee',
      label: 'Fee',
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
          style={{
            padding: '2px 8px',
            borderRadius: '10px',
            fontSize: '11px',
            fontWeight: 600,
            backgroundColor: (statusColors[r.status] ?? '#64748b') + '22',
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
    <div>
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '20px' }}>
        <MetricCard
          icon="Transactions"
          label="Total Transactions"
          value={totalCount.toLocaleString()}
          sub="Filtered records"
          color="#2563EB"
        />
        <MetricCard
          icon="Volume"
          label="Total Volume"
          value={totalVolume.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          sub="Settled amount sum"
          color="#1E40AF"
        />
        <MetricCard
          icon="Fees"
          label="Total Fee Revenue"
          value={totalFees.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          sub="Collected fees"
          color="#7c3aed"
        />
      </div>

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
            Transaction Details ({data.length} records{totalPages > 1 ? ` — Page ${page} of ${totalPages}` : ''})
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
                }}
              >
                ⏱️ {loadDuration.toFixed(2)}s
              </span>
            )}
          </span>
          <ExportButtons
            onExportCsv={() => handleExport('csv')}
            onExportExcel={() => handleExport('excel')}
            onExportPdf={() => handleExport('pdf')}
            loading={exportLoading}
          />
        </div>

        {error && (
          <div style={{ padding: '12px 20px', color: '#dc2626', backgroundColor: '#fef2f2', fontSize: '13px' }}>
            {error}
          </div>
        )}

        <DataTable
          columns={columns}
          data={paginatedData}
          loading={loading}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
};

export default TransactionDetailPanel;
