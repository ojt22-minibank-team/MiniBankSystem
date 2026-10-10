import React, { useState, useEffect, useCallback } from 'react';
import type {
  AccountStatusSummary,
  BalanceBracket,
  AccountStatusReport,
  AccountFilterParams,
} from '../../../types/reports/reporting.types';
import {
  fetchAccountStatusSummary,
  exportAccountStatus,
} from '../../../services/reportingService';
import MetricCard from './MetricCard';
import DataTable, { type Column } from './DataTable';
import ExportButtons from './ExportButtons';

interface Props {
  startDate: string;
  endDate: string;
  accountStatus: string;
  searchKey?: number;
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: '#16a34a',
  FROZEN: '#0891b2',
  SUSPENDED: '#d97706',
  CLOSED: '#dc2626',
};

const AccountStatusPanel: React.FC<Props> = ({
  startDate,
  endDate,
  accountStatus,
  searchKey,
}) => {
  const [report, setReport] = useState<AccountStatusReport>({
    statusSummaries: [],
    bracketDistribution: [],
  });
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const params: AccountFilterParams = { startDate, endDate, accountStatus };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchAccountStatusSummary(params);
      setReport(result);
      setFetched(true);
    } catch (e: unknown) {
      setError((e as Error).message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, accountStatus]);

  useEffect(() => {
    load();
  }, [load, searchKey]);

  const totalAccounts = report.statusSummaries.reduce((s, r) => s + Number(r.accountCount || 0), 0);
  const totalNew = report.statusSummaries.reduce((s, r) => s + Number(r.newAccountsInRange || 0), 0);

  const RADIUS = 55;
  const CX = 70;
  const CY = 70;
  const total = totalAccounts || 1;
  let cumAngle = -Math.PI / 2;
  const donutSegments = report.statusSummaries.map((s) => {
    const frac = s.accountCount / total;
    const angle = frac * 2 * Math.PI;
    const x1 = CX + RADIUS * Math.cos(cumAngle);
    const y1 = CY + RADIUS * Math.sin(cumAngle);
    cumAngle += angle;
    const x2 = CX + RADIUS * Math.cos(cumAngle);
    const y2 = CY + RADIUS * Math.sin(cumAngle);
    const largeArc = frac > 0.5 ? 1 : 0;
    return {
      path: `M ${CX} ${CY} L ${x1} ${y1} A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${x2} ${y2} Z`,
      color: STATUS_COLORS[s.accountStatus] ?? '#94a3b8',
      label: s.accountStatus,
      count: s.accountCount,
    };
  });

  const statusColumns: Column<AccountStatusSummary>[] = [
    {
      key: 'accountStatus',
      label: 'Status',
      render: (r: AccountStatusSummary) => (
        <span
          style={{
            padding: '2px 8px',
            borderRadius: '10px',
            fontSize: '11px',
            fontWeight: 600,
            backgroundColor: (STATUS_COLORS[r.accountStatus] ?? '#94a3b8') + '22',
            color: STATUS_COLORS[r.accountStatus] ?? '#64748b',
          }}
        >
          {r.accountStatus}
        </span>
      ),
    },
    { key: 'accountCount', label: 'Total Accounts' },
    { key: 'newAccountsInRange', label: 'New in Range' },
    {
      key: 'avgBalance',
      label: 'Avg Balance',
      render: (r: AccountStatusSummary) =>
        r.avgBalance?.toLocaleString('en-US', { minimumFractionDigits: 2 }),
    },
    {
      key: 'minBalance',
      label: 'Min Balance',
      render: (r: AccountStatusSummary) =>
        r.minBalance?.toLocaleString('en-US', { minimumFractionDigits: 2 }),
    },
    {
      key: 'maxBalance',
      label: 'Max Balance',
      render: (r: AccountStatusSummary) =>
        r.maxBalance?.toLocaleString('en-US', { minimumFractionDigits: 2 }),
    },
  ];

  const bracketColumns: Column<BalanceBracket>[] = [
    { key: 'balanceBracket', label: 'Balance Bracket' },
    { key: 'accountStatus', label: 'Status' },
    { key: 'bracketCount', label: 'Account Count' },
    {
      key: 'bracketTotalBalance',
      label: 'Total Balance',
      render: (r: BalanceBracket) =>
        r.bracketTotalBalance?.toLocaleString('en-US', { minimumFractionDigits: 2 }),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '20px' }}>
        <MetricCard
          icon="Accounts"
          label="Total Accounts"
          value={totalAccounts.toLocaleString()}
          sub="All statuses"
          color="#1E40AF"
        />
        <MetricCard
          icon="Active"
          label="Active Accounts"
          value={(
            report.statusSummaries.find((s) => s.accountStatus === 'ACTIVE')?.accountCount ?? 0
          ).toLocaleString()}
          sub="Currently active"
          color="#16a34a"
        />
        <MetricCard
          icon="Restricted"
          label="Frozen / Suspended"
          value={(
            (report.statusSummaries.find((s) => s.accountStatus === 'FROZEN')?.accountCount ?? 0) +
            (report.statusSummaries.find((s) => s.accountStatus === 'SUSPENDED')?.accountCount ?? 0)
          ).toLocaleString()}
          sub="Restricted accounts"
          color="#d97706"
        />
        <MetricCard
          icon="New"
          label="New in Range"
          value={totalNew.toLocaleString()}
          sub="Opened in date range"
          color="#0891b2"
        />
      </div>

      {fetched && report.statusSummaries.length > 0 && (
        <div
          style={{
            backgroundColor: '#fff',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            padding: '20px 24px',
            marginBottom: '20px',
            display: 'flex',
            gap: '32px',
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <div>
            <div
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color: '#1E40AF',
                marginBottom: '12px',
              }}
            >
              Account Status Distribution
            </div>
            <svg width="140" height="140" viewBox="0 0 140 140">
              {donutSegments.map((seg, i) => (
                <path key={i} d={seg.path} fill={seg.color} fillOpacity={0.85} />
              ))}
              <circle cx={CX} cy={CY} r={28} fill="#fff" />
              <text
                x={CX}
                y={CY + 5}
                textAnchor="middle"
                fontSize="13"
                fontWeight="bold"
                fill="#0f172a"
              >
                {totalAccounts}
              </text>
            </svg>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {donutSegments.map((seg) => (
              <div
                key={seg.label}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}
              >
                <span
                  style={{
                    width: '14px',
                    height: '14px',
                    borderRadius: '3px',
                    backgroundColor: seg.color,
                    display: 'inline-block',
                  }}
                />
                <span style={{ fontWeight: 600, color: '#334155' }}>{seg.label}</span>
                <span style={{ color: '#64748b' }}>{seg.count.toLocaleString()}</span>
                <span style={{ color: '#94a3b8' }}>
                  ({totalAccounts > 0 ? ((seg.count / totalAccounts) * 100).toFixed(1) : 0}%)
                </span>
              </div>
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
          marginBottom: '16px',
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
            Account Status Summary
          </span>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <ExportButtons
              onExportCsv={() => exportAccountStatus(params, 'csv')}
              onExportExcel={() => exportAccountStatus(params, 'excel')}
              onExportPdf={() => exportAccountStatus(params, 'pdf')}
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
            columns={statusColumns}
            data={report.statusSummaries}
            loading={loading}
            emptyMessage="No account status data found for the selected criteria."
          />
        </div>
      </div>

      {fetched && (
        <div
          style={{
            backgroundColor: '#fff',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
              Balance Bracket Distribution
            </span>
          </div>
          <div style={{ padding: '16px 20px' }}>
            <DataTable
              columns={bracketColumns}
              data={report.bracketDistribution}
              loading={loading}
              emptyMessage="No bracket data."
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountStatusPanel;
