import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  onLoadingChange?: (loading: boolean) => void;
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
  onLoadingChange,
}) => {
  const [report, setReport] = useState<AccountStatusReport>({
    statusSummaries: [],
    bracketDistribution: [],
  });
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const params: AccountFilterParams = { startDate, endDate, accountStatus };

  const onLoadingChangeRef = useRef(onLoadingChange);
  useEffect(() => {
    onLoadingChangeRef.current = onLoadingChange;
  }, [onLoadingChange]);

  const load = useCallback(async () => {
    setLoading(true);
    onLoadingChangeRef.current?.(true);
    setError(null);
    try {
      const result = await fetchAccountStatusSummary(params);
      setReport(result);
      setFetched(true);
    } catch (e: unknown) {
      setError((e as Error).message || 'Failed to load data');
    } finally {
      setLoading(false);
      onLoadingChangeRef.current?.(false);
    }
  }, [startDate, endDate, accountStatus]);

  useEffect(() => {
    if (!searchKey) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchKey]);

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
          className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold"
          style={{
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
      label: 'Avg Balance (MMK)',
      render: (r: AccountStatusSummary) =>
        r.avgBalance?.toLocaleString('en-US', { minimumFractionDigits: 2 }),
    },
    {
      key: 'minBalance',
      label: 'Min Balance (MMK)',
      render: (r: AccountStatusSummary) =>
        r.minBalance?.toLocaleString('en-US', { minimumFractionDigits: 2 }),
    },
    {
      key: 'maxBalance',
      label: 'Max Balance (MMK)',
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
      label: 'Total Balance (MMK)',
      render: (r: BalanceBracket) =>
        r.bracketTotalBalance?.toLocaleString('en-US', { minimumFractionDigits: 2 }),
    },
  ];

  return (
    <div className="w-full">
      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 mb-5">
        <MetricCard
          icon="👥"
          label="Total Accounts"
          value={totalAccounts.toLocaleString()}
          sub="All statuses"
          color="#1E40AF"
        />
        <MetricCard
          icon="✅"
          label="Active Accounts"
          value={(
            report.statusSummaries.find((s) => s.accountStatus === 'ACTIVE')?.accountCount ?? 0
          ).toLocaleString()}
          sub="Currently active"
          color="#16a34a"
        />
        <MetricCard
          icon="🔒"
          label="Frozen / Suspended"
          value={(
            (report.statusSummaries.find((s) => s.accountStatus === 'FROZEN')?.accountCount ?? 0) +
            (report.statusSummaries.find((s) => s.accountStatus === 'SUSPENDED')?.accountCount ?? 0)
          ).toLocaleString()}
          sub="Restricted accounts"
          color="#d97706"
        />
        <MetricCard
          icon="✨"
          label="New in Range"
          value={totalNew.toLocaleString()}
          sub="Opened in date range"
          color="#0891b2"
        />
      </div>

      {/* Account Status Distribution Chart */}
      {fetched && report.statusSummaries.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 mb-5 shadow-xs flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
          <div className="shrink-0 flex flex-col items-center">
            <div className="text-xs sm:text-sm font-bold text-blue-900 mb-3">
              Account Status Distribution
            </div>
            <svg width="140" height="140" viewBox="0 0 140 140" className="drop-shadow-xs">
              {donutSegments.map((seg, i) => (
                <path key={i} d={seg.path} fill={seg.color} fillOpacity={0.88} />
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

          <div className="flex flex-col gap-2 w-full sm:w-auto">
            {donutSegments.map((seg) => (
              <div key={seg.label} className="flex items-center gap-2 text-xs">
                <span
                  className="w-3.5 h-3.5 rounded-sm shrink-0"
                  style={{ backgroundColor: seg.color }}
                />
                <span className="font-semibold text-slate-700 w-24 truncate">{seg.label}</span>
                <span className="text-slate-600 font-medium">{seg.count.toLocaleString()}</span>
                <span className="text-slate-400">
                  ({totalAccounts > 0 ? ((seg.count / totalAccounts) * 100).toFixed(1) : 0}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Table Card */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden mb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 border-b border-slate-100">
          <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">
            Account Status Summary
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            <ExportButtons
              onExportCsv={() => exportAccountStatus(params, 'csv')}
              onExportExcel={() => exportAccountStatus(params, 'excel')}
              onExportPdf={() => exportAccountStatus(params, 'pdf')}
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
            columns={statusColumns}
            data={report.statusSummaries}
            loading={loading}
            emptyMessage="No account status data found for the selected criteria."
          />
        </div>
      </div>

      {/* Balance Bracket Distribution */}
      {fetched && (
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100">
            <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">
              Balance Bracket Distribution
            </span>
          </div>
          <div className="p-4 sm:p-5">
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
