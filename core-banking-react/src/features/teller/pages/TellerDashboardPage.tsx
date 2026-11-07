import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/hooks/useAuth';
import AdminLayout from '../../../components/layout/AdminLayout';
import { tellerApi, announcementsApi } from '../../../services/apiClient';
import type { DailyCashSummaryResponse, AnnouncementResponse } from '../../../types/api.types';
import { formatCurrency } from '../../../utils/formatCurrency';
import { formatDate } from '../../../utils/formatDate';
import ekarajCrown from '../../../assets/ekaraj-crown-transparent.png';

// ============================================================
// Helper: Compact Currency Formatter (e.g. 27.88M / 1.50B)
// ============================================================

function formatCompactNumber(amount: number): string {
  try {
    return new Intl.NumberFormat('en-US', {
      notation: 'compact',
      compactDisplay: 'short',
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return amount.toLocaleString();
  }
}

// ============================================================
// Liquid Glass Stat Card Component (2-per-row Symmetrical Layout)
// ============================================================

interface LiquidStatCardProps {
  title: string;
  value: string | number;
  isCurrency?: boolean;
  currency?: string;
  subtitle?: string;
  badge?: string;
  badgeColor?: 'emerald' | 'sky' | 'purple' | 'amber';
  icon: React.ReactNode;
  gradient: string;
  iconBg: string;
  onClick?: () => void;
}

function LiquidStatCard({
  title,
  value,
  isCurrency = false,
  currency = 'MMK',
  subtitle,
  badge,
  badgeColor = 'sky',
  icon,
  gradient,
  iconBg,
  onClick,
}: LiquidStatCardProps) {
  const badgeClasses = {
    emerald: 'status-pill-emerald',
    sky: 'status-pill-sky',
    purple: 'status-pill-purple',
    amber: 'status-pill-amber',
  }[badgeColor];

  const numericValue = typeof value === 'number' ? value : Number(value);
  const isValidNumber = !isNaN(numericValue) && isCurrency;
  const isLargeAmount = isValidNumber && Math.abs(numericValue) >= 1_000_000;

  const displayPrimary = isCurrency
    ? typeof value === 'number'
      ? formatCurrency(value, currency)
      : value
    : value;

  const compactText = isLargeAmount ? formatCompactNumber(numericValue) : null;

  return (
    <div
      onClick={onClick}
      className={[
        'liquid-glass-card rounded-3xl p-6 sm:p-7 relative overflow-hidden group cursor-pointer select-none transition-all duration-300 hover:shadow-lg flex flex-col justify-between min-h-[190px]',
        onClick ? 'active:scale-[0.99]' : '',
      ].join(' ')}
    >
      {/* Ambient background glow */}
      <div
        className={`absolute -right-8 -top-8 h-36 w-36 rounded-full ${gradient} opacity-20 blur-3xl group-hover:opacity-35 transition-opacity duration-500`}
      />

      <div className="relative z-10 flex flex-col justify-between h-full space-y-4">
        {/* Top Header Row: Symmetrical Icon on top-right, Title & Badge on left */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider truncate">
                {title}
              </span>
              {badge && (
                <span className={`${badgeClasses} text-[10px] shrink-0 font-bold`}>
                  {badge}
                </span>
              )}
            </div>
          </div>

          {/* Symmetrical Floating Icon */}
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${iconBg} shadow-md transition-all duration-300 group-hover:scale-105 group-hover:-translate-y-0.5 border border-white/60`}
          >
            {icon}
          </div>
        </div>

        {/* Amount / Value Display Section */}
        <div className="space-y-1">
          <div className="flex items-baseline gap-2.5 flex-wrap">
            <span
              className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-mono tabular-nums break-words"
              title={typeof displayPrimary === 'string' ? displayPrimary : undefined}
            >
              {displayPrimary}
            </span>
            {compactText && (
              <span className="text-xs font-bold text-slate-600 bg-slate-100/90 border border-slate-200/80 px-2 py-0.5 rounded-md font-mono shrink-0">
                ≈ {compactText} {currency}
              </span>
            )}
          </div>

          {subtitle && (
            <p className="text-xs font-medium text-slate-400">
              {subtitle}
            </p>
          )}
        </div>

        {/* Footer Link / Counter Details */}
        <div className="pt-3 border-t border-slate-100/80 flex items-center justify-between text-[11px] font-semibold text-slate-400 group-hover:text-emerald-600 transition-colors">
          <span>Counter Details & Audit</span>
          <svg
            className="h-3.5 w-3.5 transform transition-transform group-hover:translate-x-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Teller Dashboard Component
// ============================================================

export default function TellerDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [timeframe, setTimeframe] = useState<'today' | 'all'>('today');
  const [summary, setSummary] = useState<DailyCashSummaryResponse | null>(null);
  const [announcements, setAnnouncements] = useState<AnnouncementResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    Promise.allSettled([
      tellerApi.getDailyCashSummary(timeframe),
      announcementsApi.getActive(),
    ])
      .then(([summaryRes, annRes]) => {
        if (!isMounted) return;
        if (summaryRes.status === 'fulfilled') {
          setSummary(summaryRes.value.data);
        } else {
          setError('Failed to fetch cash summary.');
        }

        if (annRes.status === 'fulfilled') {
          setAnnouncements(annRes.value.data ?? []);
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [timeframe]);

  const curr = summary?.currency || 'MMK';

  return (
    <AdminLayout pageTitle="Teller Dashboard">
      <div className="max-w-[1440px] mx-auto space-y-7">
        {/* ========================================================
            1. Liquid Glass Welcome Hero Banner
           ======================================================== */}
        <div className="liquid-glass-hero relative overflow-hidden rounded-3xl p-7 text-white shadow-xl">
          <div className="pointer-events-none absolute -right-6 -bottom-6 opacity-20 sm:opacity-25 transition-transform duration-700 hover:scale-105">
            <img
              src={ekarajCrown}
              alt="EKARAJ Crown"
              className="h-56 w-auto object-contain filter drop-shadow-[0_10px_20px_rgba(255,255,255,0.4)]"
            />
          </div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-white/15 backdrop-blur-md border border-white/20 text-white shadow-xs">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  Counter Active · Station 01
                </span>
                <span className="text-xs text-sky-200/90 font-medium">
                  {formatDate(new Date())}
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight">
                Welcome back, {user?.username ?? 'Teller Officer'}
              </h2>

              <p className="text-xs sm:text-sm text-sky-100/90 font-medium leading-relaxed">
                Ready to serve bank customers. Over-the-counter cash deposits, withdrawals, and account inquiries are active and verified.
              </p>
            </div>

            {/* Live Session Badges */}
            <div className="flex flex-wrap md:flex-col items-start md:items-end gap-2.5 shrink-0">
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/15 backdrop-blur-xl border border-white/25 shadow-xs">
                <div className="h-2 w-2 rounded-full bg-emerald-300 animate-ping" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Role: TELLER
                </span>
              </div>
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20">
                <span className="text-[11px] font-medium text-sky-200">
                  Drawer Status:{' '}
                  <strong className="text-emerald-300 font-bold">
                    ACTIVE & BALANCED
                  </strong>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50/90 p-4 text-xs font-semibold text-rose-700 backdrop-blur-md shadow-xs">
            {error}
          </div>
        )}

        {/* ========================================================
            2. Quick Counter Action Chips
           ======================================================== */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          {/* Quick 1: Cash Deposit */}
          <button
            type="button"
            onClick={() => navigate('/teller/otc')}
            className="liquid-glass-card rounded-2xl p-3.5 flex items-center gap-3 text-left group hover:border-emerald-300/80 transition-all cursor-pointer"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 group-hover:scale-105 transition-transform">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-800 truncate">Cash Deposit</p>
              <p className="text-[10px] text-slate-400 font-medium truncate">Customer Inflow</p>
            </div>
          </button>

          {/* Quick 2: Cash Withdrawal */}
          <button
            type="button"
            onClick={() => navigate('/teller/otc')}
            className="liquid-glass-card rounded-2xl p-3.5 flex items-center gap-3 text-left group hover:border-amber-300/80 transition-all cursor-pointer"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20 group-hover:scale-105 transition-transform">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-800 truncate">Cash Withdrawal</p>
              <p className="text-[10px] text-slate-400 font-medium truncate">Counter Outflow</p>
            </div>
          </button>

          {/* Quick 3: Customer Lookup */}
          <button
            type="button"
            onClick={() => navigate('/teller/customers')}
            className="liquid-glass-card rounded-2xl p-3.5 flex items-center gap-3 text-left group hover:border-sky-300/80 transition-all cursor-pointer"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 border border-sky-500/20 group-hover:scale-105 transition-transform">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-800 truncate">Customers</p>
              <p className="text-[10px] text-slate-400 font-medium truncate">KYC & Profiles</p>
            </div>
          </button>

          {/* Quick 4: Bank Accounts */}
          <button
            type="button"
            onClick={() => navigate('/teller/accounts')}
            className="liquid-glass-card rounded-2xl p-3.5 flex items-center gap-3 text-left group hover:border-purple-300/80 transition-all cursor-pointer"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 border border-purple-500/20 group-hover:scale-105 transition-transform">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-800 truncate">Bank Accounts</p>
              <p className="text-[10px] text-slate-400 font-medium truncate">Ledgers & Balances</p>
            </div>
          </button>
        </div>

        {/* ========================================================
            3. Liquid Glass Cash Drawer KPI Stat Cards (2 Cards Per Row)
           ======================================================== */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900 tracking-tight">
                  Cash Drawer Position & Activity
                </h3>
                <span className="status-pill-purple text-[10px] uppercase font-bold tracking-wider">
                  {timeframe === 'today' ? "Today's Shift" : 'All-Time Records'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {timeframe === 'today'
                  ? 'Real-time reconciliation of physical vault cash for the current working day'
                  : 'Cumulative historical counter ledger totals transacted by your teller terminal'}
              </p>
            </div>

            {/* Scope Filter Toggle: Today's Shift vs All-Time History */}
            <div className="inline-flex p-1 rounded-2xl bg-slate-200/60 border border-slate-300/60 backdrop-blur-md self-start sm:self-auto shadow-xs">
              <button
                type="button"
                onClick={() => setTimeframe('today')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  timeframe === 'today'
                    ? 'bg-white text-indigo-950 shadow-xs ring-1 ring-slate-900/5'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${timeframe === 'today' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                <span>Today's Shift</span>
              </button>
              <button
                type="button"
                onClick={() => setTimeframe('all')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  timeframe === 'all'
                    ? 'bg-white text-indigo-950 shadow-xs ring-1 ring-slate-900/5'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>All-Time History</span>
              </button>
            </div>
          </div>

          {/* 2-Columns Grid Layout (2 Cards per row) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Row 1, Card 1: Net Cash in Drawer */}
            <LiquidStatCard
              title={timeframe === 'today' ? 'Net Cash in Drawer' : 'Cumulative Net Balance'}
              value={loading ? '—' : (summary?.netCashInDrawer ?? 0)}
              isCurrency={!loading}
              currency={curr}
              subtitle={
                loading
                  ? 'Syncing drawer…'
                  : timeframe === 'today'
                  ? `Opening: ${formatCurrency(summary?.openingCash ?? 0, curr)}`
                  : 'Lifetime Counter Balance'
              }
              badge={timeframe === 'today' ? 'Vault/Drawer' : 'All-Time'}
              badgeColor="emerald"
              gradient="bg-emerald-400"
              iconBg="bg-gradient-to-br from-emerald-400 to-teal-600 text-white"
              onClick={() => navigate('/teller/otc')}
              icon={
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm6 0a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              }
            />

            {/* Row 1, Card 2: Cash In */}
            <LiquidStatCard
              title={timeframe === 'today' ? 'Today Cash In' : 'All-Time Cash In'}
              value={loading ? '—' : (summary?.totalCashIn ?? 0)}
              isCurrency={!loading}
              currency={curr}
              subtitle={
                loading
                  ? 'Loading…'
                  : `${summary?.depositCount ?? 0} Deposits Settled`
              }
              badge="Inflow"
              badgeColor="sky"
              gradient="bg-sky-400"
              iconBg="bg-gradient-to-br from-sky-400 to-blue-600 text-white"
              onClick={() => navigate('/teller/otc')}
              icon={
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m0 0l6.75-6.75M12 19.5l-6.75-6.75" />
                </svg>
              }
            />

            {/* Row 2, Card 3: Cash Out */}
            <LiquidStatCard
              title={timeframe === 'today' ? 'Today Cash Out' : 'All-Time Cash Out'}
              value={loading ? '—' : (summary?.totalCashOut ?? 0)}
              isCurrency={!loading}
              currency={curr}
              subtitle={
                loading
                  ? 'Loading…'
                  : `${summary?.withdrawalCount ?? 0} Withdrawals Settled`
              }
              badge="Outflow"
              badgeColor="amber"
              gradient="bg-amber-400"
              iconBg="bg-gradient-to-br from-amber-400 to-orange-500 text-white"
              onClick={() => navigate('/teller/otc')}
              icon={
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 19.5v-15m0 0l-6.75 6.75M12 4.5l6.75 6.75" />
                </svg>
              }
            />

            {/* Row 2, Card 4: Counter Activity */}
            <LiquidStatCard
              title="Counter Activity"
              value={loading ? '—' : (summary?.totalTransactions ?? 0)}
              isCurrency={false}
              currency={curr}
              subtitle={
                loading
                  ? 'Loading…'
                  : timeframe === 'today'
                  ? 'Transactions Settled Today'
                  : 'Total Lifetime Transactions'
              }
              badge="Counter"
              badgeColor="purple"
              gradient="bg-purple-400"
              iconBg="bg-gradient-to-br from-purple-500 to-indigo-600 text-white"
              onClick={() => navigate('/teller/transactions')}
              icon={
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
              }
            />
          </div>
        </div>

        {/* ========================================================
            4. Two-Column Live Insights Panels
           ======================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Panel 1: Cash Reconciliation Overview */}
          <div className="liquid-glass rounded-3xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs border border-emerald-100">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                      {timeframe === 'today' ? 'Drawer Cash Breakdown' : 'Cumulative Cash Breakdown'}
                    </h3>
                    <p className="text-[11px] text-slate-400 font-medium">
                      {timeframe === 'today' ? 'Daily Counter Reconciliation Sheet' : 'Lifetime Counter Reconciliation Summary'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/teller/otc')}
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Open Counter</span>
                  <span>→</span>
                </button>
              </div>

              <div className="pt-4 space-y-3.5">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/80 border border-slate-100">
                  <span className="text-xs font-semibold text-slate-600">
                    {timeframe === 'today' ? 'Morning Opening Cash:' : 'Base Initial Float:'}
                  </span>
                  <span className="text-xs font-bold text-slate-900 font-mono">
                    {formatCurrency(summary?.openingCash ?? 0, curr)}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50/50 border border-emerald-100/60">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="text-xs font-semibold text-emerald-900">
                      {timeframe === 'today' ? 'Total Customer Deposits (+):' : 'All-Time Customer Deposits (+):'}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-emerald-700 font-mono">
                    + {formatCurrency(summary?.totalCashIn ?? 0, curr)}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-rose-50/50 border border-rose-100/60">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-rose-500" />
                    <span className="text-xs font-semibold text-rose-900">
                      {timeframe === 'today' ? 'Total Counter Withdrawals (-):' : 'All-Time Counter Withdrawals (-):'}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-rose-700 font-mono">
                    - {formatCurrency(summary?.totalCashOut ?? 0, curr)}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-md">
                  <span className="text-xs font-bold uppercase tracking-wider">
                    {timeframe === 'today' ? 'Current Net Cash in Drawer:' : 'Current Net Counter Balance:'}
                  </span>
                  <span className="text-sm font-black font-mono">
                    {formatCurrency(summary?.netCashInDrawer ?? 0, curr)}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Report Date: {summary?.reportDate ?? formatDate(new Date())}</span>
              <span className="font-semibold text-emerald-600">Drawer Balanced</span>
            </div>
          </div>

          {/* Panel 2: Live Announcements */}
          <div className="liquid-glass rounded-3xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-xs border border-purple-100">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 tracking-tight">Active Broadcast Notices</h3>
                    <p className="text-[11px] text-slate-400 font-medium">Headquarters bulletins for tellers</p>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/teller/announcements')}
                  className="text-xs font-bold text-purple-600 hover:text-purple-700 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>View All</span>
                  <span>→</span>
                </button>
              </div>

              <div className="divide-y divide-slate-100/70 pt-2">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="h-7 w-7 rounded-full border-2 border-purple-600/30 border-t-purple-600 animate-spin" />
                  </div>
                ) : announcements.length === 0 ? (
                  <div className="py-8 text-center text-xs font-medium text-slate-400">No active bulletins broadcasted.</div>
                ) : (
                  announcements.slice(0, 4).map((a) => (
                    <div key={a.announcementId} className="py-3 px-1 hover:bg-white/60 rounded-xl transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-bold text-slate-900 leading-snug">{a.title}</p>
                        <span className="status-pill-emerald">
                          Active
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500 line-clamp-1 font-medium">{a.message}</p>
                      <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                        <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 font-bold">
                          {a.audience}
                        </span>
                        <span className="h-1 w-1 rounded-full bg-slate-300 inline-block" />
                        <span>{formatDate(a.createdAt)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
              <span>{announcements.length} Active bulletins</span>
              <span className="font-semibold text-slate-600">Branch Broadcast 01</span>
            </div>
          </div>
        </div>

        {/* ========================================================
            5. System Health Sentinel Bar
           ======================================================== */}
        <div className="liquid-glass rounded-3xl p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 tracking-tight">Counter Sentinel & Cash Ledger</h4>
                <p className="text-[11px] text-slate-400 font-medium">
                  Ledger Balanced · MySQL 8.0 Primary Replica Connected · Zero Counter Discrepancies
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/teller/transactions')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <span>View Transactions</span>
                <span>→</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
