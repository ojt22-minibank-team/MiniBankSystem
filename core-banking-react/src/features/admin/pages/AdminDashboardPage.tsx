import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/hooks/useAuth';
import AdminLayout from '../../../components/layout/AdminLayout';
import { adminDashboardApi } from '../../../services/apiClient';
import type { AdminDashboardSummaryResponse, AnnouncementResponse } from '../../../types/api.types';
import type { AxiosError } from 'axios';
import { formatDate } from '../../../utils/formatDate';
import { formatCurrency } from '../../../utils/formatCurrency';

// ============================================================
// Liquid Glass Stat Card Component
// ============================================================

function getAnnouncementStatus(a: AnnouncementResponse): { label: string; className: string } {
  const isExplicitlyActive = a.isActive !== undefined ? a.isActive : a.active !== undefined ? a.active : true;
  if (!isExplicitlyActive) {
    return { label: 'Inactive', className: 'status-pill-crimson' };
  }
  const now = Date.now();
  const start = a.startsAt ? new Date(a.startsAt).getTime() : -Infinity;
  const end = a.endsAt ? new Date(a.endsAt).getTime() : Infinity;
  if (now > end) {
    return { label: 'Expired', className: 'status-pill-amber' };
  }
  if (now < start) {
    return { label: 'Scheduled', className: 'status-pill-purple' };
  }
  return { label: 'Active', className: 'status-pill-emerald' };
}

interface LiquidStatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  badge?: string;
  badgeColor?: 'emerald' | 'sky' | 'purple' | 'amber';
  icon: React.ReactNode;
  gradient: string;
  iconBg: string;
  onClick?: () => void;
  headerAction?: React.ReactNode;
}

function LiquidStatCard({
  title,
  value,
  subtitle,
  badge,
  badgeColor = 'sky',
  icon,
  gradient,
  iconBg,
  onClick,
  headerAction,
}: LiquidStatCardProps) {
  const badgeClasses = {
    emerald: 'status-pill-emerald',
    sky: 'status-pill-sky',
    purple: 'status-pill-purple',
    amber: 'status-pill-amber',
  }[badgeColor];

  return (
    <div
      onClick={onClick}
      className={[
        'liquid-glass-card rounded-3xl p-6 relative overflow-hidden group cursor-pointer select-none',
        onClick ? 'active:scale-[0.99]' : '',
      ].join(' ')}
    >
      {/* Background soft ambient gradient glow */}
      <div
        className={`absolute -right-8 -top-8 h-32 w-32 rounded-full ${gradient} opacity-20 blur-2xl group-hover:opacity-40 transition-opacity duration-500`}
      />

      <div className="relative z-10 flex items-start justify-between">
        <div className="space-y-1 min-w-0 pr-2">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {title}
            </p>
            {headerAction}
          </div>
          <div className="flex items-baseline gap-2 pt-1 flex-wrap">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-mono tabular-nums">
              {value}
            </span>
            {badge && <span className={`${badgeClasses} text-[10px]`}>{badge}</span>}
          </div>
          {subtitle && (
            <p className="text-xs font-medium text-slate-400 pt-0.5 truncate">{subtitle}</p>
          )}
        </div>

        {/* Floating Glossy Icon Container */}
        <div
          className={`flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl ${iconBg} shadow-md transition-all duration-300 group-hover:scale-110 group-hover:-translate-y-0.5 border border-white/60`}
        >
          {icon}
        </div>
      </div>

      {/* Sweet Bottom Micro-indicator */}
      <div className="mt-4 pt-3 border-t border-slate-100/80 flex items-center justify-between text-[11px] font-semibold text-slate-400 group-hover:text-sky-600 transition-colors">
        <span>View details</span>
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
  );
}

// ============================================================
// Main Admin Dashboard Component
// ============================================================

export default function AdminDashboardPage() {
  const { user, isAdmin, isAuditor, isTeller } = useAuth();
  const navigate = useNavigate();

  const [summary, setSummary] = useState<AdminDashboardSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feeTimeframe, setFeeTimeframe] = useState<'today' | 'all'>('today');

  useEffect(() => {
    setLoading(true);
    setError(null);

    adminDashboardApi
      .getSummary()
      .then((res) => {
        setSummary(res.data);
      })
      .catch((err: AxiosError) => {
        setError(
          err.response?.status === 403
            ? 'Access denied to dashboard metrics.'
            : 'Failed to load dashboard summary.',
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const recentStaff = summary?.recentStaff ?? [];
  const recentAnnouncements = summary?.recentAnnouncements ?? [];

  const todayFee = summary?.todayFeeRevenue ?? 0;
  const allTimeFee = summary?.allTimeFeeRevenue ?? 0;
  const displayedFee = feeTimeframe === 'today' ? todayFee : allTimeFee;

  return (
    <AdminLayout pageTitle="Dashboard">
      <div className="max-w-[1440px] mx-auto space-y-7">
        {/* ========================================================
            1. Liquid Glass Welcome Hero Banner
           ======================================================== */}
        <div className="liquid-glass-hero relative overflow-hidden rounded-3xl p-7 text-white shadow-xl">
          <div className="relative z-10 space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-white/15 backdrop-blur-md border border-white/20 text-white shadow-xs">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                System Operational · Node 01
              </span>
              <span className="text-xs text-sky-200/90 font-medium">
                {formatDate(new Date())}
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight">
              Welcome back, {user?.username ?? 'Administrator'}
            </h2>

            <p className="text-xs sm:text-sm text-sky-100/90 font-medium leading-relaxed">
              Welcome to the EKARAJ BANK Core Banking Operating System. Audit logging engine, account ledgers, and customer management services are operating smoothly.
            </p>
          </div>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50/90 p-4 text-xs font-semibold text-rose-700 backdrop-blur-md shadow-xs">
            {error}
          </div>
        )}

        {/* ========================================================
            2. Clean & Sweet Quick Launch Action Chips
           ======================================================== */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          {/* Quick 1: Customer Registry */}
          <button
            type="button"
            onClick={() => navigate('/admin/customers')}
            className="liquid-glass-card rounded-2xl p-3.5 flex items-center gap-3 text-left group hover:border-sky-300/80 transition-all cursor-pointer"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 border border-sky-500/20 group-hover:scale-105 transition-transform">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-800 truncate">Customers</p>
              <p className="text-[10px] text-slate-400 font-medium truncate">Register & KYC</p>
            </div>
          </button>

          {/* Quick 2: Open Bank Account */}
          <button
            type="button"
            onClick={() => navigate('/admin/accounts')}
            className="liquid-glass-card rounded-2xl p-3.5 flex items-center gap-3 text-left group hover:border-emerald-300/80 transition-all cursor-pointer"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 group-hover:scale-105 transition-transform">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-800 truncate">Bank Accounts</p>
              <p className="text-[10px] text-slate-400 font-medium truncate">Savings & Corporate</p>
            </div>
          </button>

          {/* Quick 3: Announcements */}
          <button
            type="button"
            onClick={() => navigate('/admin/announcements')}
            className="liquid-glass-card rounded-2xl p-3.5 flex items-center gap-3 text-left group hover:border-purple-300/80 transition-all cursor-pointer"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 border border-purple-500/20 group-hover:scale-105 transition-transform">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-800 truncate">Announcements</p>
              <p className="text-[10px] text-slate-400 font-medium truncate">Broadcast Alerts</p>
            </div>
          </button>

          {/* Quick 4: Audit Logs */}
          <button
            type="button"
            onClick={() => navigate('/admin/audit-logs')}
            className="liquid-glass-card rounded-2xl p-3.5 flex items-center gap-3 text-left group hover:border-amber-300/80 transition-all cursor-pointer"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20 group-hover:scale-105 transition-transform">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-800 truncate">Audit Trail</p>
              <p className="text-[10px] text-slate-400 font-medium truncate">Security Inspector</p>
            </div>
          </button>
        </div>

        {/* ========================================================
            3. Liquid Glass High-Impact KPI Stat Cards
           ======================================================== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Card 1: Staff Workforce */}
          <LiquidStatCard
            title="Staff Workforce"
            value={loading ? '—' : isTeller ? 'Directory' : (summary?.totalStaff ?? 0)}
            subtitle={
              loading
                ? 'Syncing staff…'
                : isTeller
                ? 'Bank Personnel'
                : `${summary?.activeStaff ?? 0} Active Officers`
            }
            badge="Team"
            badgeColor="sky"
            gradient="bg-sky-400"
            iconBg="bg-gradient-to-br from-sky-400 to-blue-600 text-white"
            onClick={() => (!isTeller ? navigate('/admin/staff') : undefined)}
            icon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
              </svg>
            }
          />

          {/* Card 2: Customers & Portfolios */}
          <LiquidStatCard
            title="Total Customers"
            value={loading ? '—' : (summary?.totalCustomers ?? 0)}
            subtitle={loading ? 'Loading records…' : 'Active Client Accounts'}
            badge="Verified"
            badgeColor="emerald"
            gradient="bg-emerald-400"
            iconBg="bg-gradient-to-br from-emerald-400 to-teal-600 text-white"
            onClick={() => navigate('/admin/customers')}
            icon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
            }
          />

          {/* Card 3: Bank Accounts */}
          <LiquidStatCard
            title="Bank Accounts"
            value={loading ? '—' : (summary?.totalAccounts ?? 0)}
            subtitle={loading ? 'Syncing ledger…' : `${summary?.activeAccounts ?? 0} Normal Standing`}
            badge="Accounts"
            badgeColor="purple"
            gradient="bg-indigo-400"
            iconBg="bg-gradient-to-br from-indigo-400 to-purple-600 text-white"
            onClick={() => navigate('/admin/accounts')}
            icon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm6 0a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            }
          />

          {/* Card 4: System Parameters */}
          <LiquidStatCard
            title="System Parameters"
            value={loading ? '—' : (summary?.totalParameters ?? 0)}
            subtitle={loading ? 'Loading rules…' : 'Dynamic Business Rules'}
            badge="Rules"
            badgeColor="amber"
            gradient="bg-amber-400"
            iconBg="bg-gradient-to-br from-amber-400 to-orange-500 text-white"
            onClick={() => navigate('/admin/system-rules')}
            icon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" />
              </svg>
            }
          />

          {/* Card 5: Fee Revenue (GL-FEE-REVENUE) */}
          {(isAdmin || isAuditor) && (
            <LiquidStatCard
              title="Fee Revenue"
              value={loading ? '—' : formatCurrency(displayedFee, 'MMK')}
              subtitle={
                loading
                  ? 'Calculating ledger fees…'
                  : feeTimeframe === 'today'
                  ? `All-Time: ${formatCurrency(allTimeFee, 'MMK')}`
                  : `Today: ${formatCurrency(todayFee, 'MMK')}`
              }
              badge={feeTimeframe === 'today' ? 'Today' : 'All-Time'}
              badgeColor="emerald"
              gradient="bg-emerald-400"
              iconBg="bg-gradient-to-br from-emerald-500 to-teal-700 text-white"
              onClick={() => navigate('/admin/reporting')}
              headerAction={
                <div
                  className="inline-flex p-0.5 rounded-xl bg-slate-200/80 border border-slate-300/60 shadow-xs"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFeeTimeframe('today');
                    }}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                      feeTimeframe === 'today'
                        ? 'bg-white text-emerald-700 shadow-xs ring-1 ring-slate-900/5'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFeeTimeframe('all');
                    }}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                      feeTimeframe === 'all'
                        ? 'bg-white text-emerald-700 shadow-xs ring-1 ring-slate-900/5'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    All Time
                  </button>
                </div>
              }
              icon={
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
          )}

          {/* Card 6: Operational Analytics (Admin & Auditor) */}
          {(isAdmin || isAuditor) && (
            <LiquidStatCard
              title="Operational Reports"
              value="Reports"
              subtitle="Ledger & Analytics"
              badge="Auditor"
              badgeColor="purple"
              gradient="bg-purple-400"
              iconBg="bg-gradient-to-br from-purple-500 to-indigo-600 text-white"
              onClick={() => navigate('/admin/reporting')}
              icon={
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
              }
            />
          )}
        </div>

        {/* ========================================================
            4. Two-Column Live Insights & Directory Panels
           ======================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Panel 1: Recent Staff Members */}
          <div className="liquid-glass rounded-3xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold text-xs border border-sky-100">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 tracking-tight">Recent Staff Officers</h3>
                    <p className="text-[11px] text-slate-400 font-medium">Bank workforce directory</p>
                  </div>
                </div>
                {!isTeller && (
                  <button
                    onClick={() => navigate('/admin/staff')}
                    className="text-xs font-bold text-sky-600 hover:text-sky-700 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Manage Staff</span>
                    <span>→</span>
                  </button>
                )}
              </div>

              <div className="divide-y divide-slate-100/70 pt-2">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="h-7 w-7 rounded-full border-2 border-sky-600/30 border-t-sky-600 animate-spin" />
                  </div>
                ) : isTeller ? (
                  <div className="py-8 text-center text-xs font-medium text-slate-400">
                    Workforce management is restricted to Administrators & Auditors.
                  </div>
                ) : recentStaff.length === 0 ? (
                  <div className="py-8 text-center text-xs font-medium text-slate-400">No staff found.</div>
                ) : (
                  recentStaff.slice(0, 5).map((s) => (
                    <div key={s.staffId} className="flex items-center gap-3 py-3 px-1 hover:bg-white/60 rounded-xl transition-colors">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-100 to-blue-100 text-sky-700 font-bold text-xs shrink-0 border border-sky-200/60 shadow-xs">
                        {s.username?.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-xs font-bold text-slate-900">{s.fullName || s.username}</p>
                          <span className="text-[10px] font-mono text-slate-400">({s.staffNo})</span>
                        </div>
                        <p className="truncate text-[11px] text-slate-400 font-medium">{s.email ?? '—'}</p>
                      </div>
                      <span
                        className={
                          s.status === 'ACTIVE'
                            ? 'status-pill-emerald'
                            : 'status-pill-crimson'
                        }
                      >
                        {s.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Showing up to 5 recent officers</span>
              <span className="font-semibold text-slate-600">
                {loading ? '—' : isTeller ? 'Restricted' : `${summary?.activeStaff ?? 0} active`}
              </span>
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
                    <p className="text-[11px] text-slate-400 font-medium">Customer & staff announcements</p>
                  </div>
                </div>
                {!isTeller && (
                  <button
                    onClick={() => navigate('/admin/announcements')}
                    className="text-xs font-bold text-purple-600 hover:text-purple-700 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Manage</span>
                    <span>→</span>
                  </button>
                )}
              </div>

              <div className="divide-y divide-slate-100/70 pt-2">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="h-7 w-7 rounded-full border-2 border-purple-600/30 border-t-purple-600 animate-spin" />
                  </div>
                ) : recentAnnouncements.length === 0 ? (
                  <div className="py-8 text-center text-xs font-medium text-slate-400">No active notices broadcasted.</div>
                ) : (
                  recentAnnouncements.map((a) => {
                    const statusInfo = getAnnouncementStatus(a);
                    return (
                    <div key={a.announcementId} className="py-3 px-1 hover:bg-white/60 rounded-xl transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-bold text-slate-900 leading-snug">{a.title}</p>
                        <span className={statusInfo.className}>
                          {statusInfo.label}
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
                    );
                  })
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
              <span>{loading ? '—' : `${summary?.activeAnnouncements ?? 0} Active bulletins`}</span>
              <span className="font-semibold text-slate-600">Broadcast Channel 01</span>
            </div>
          </div>
        </div>

        {/* ========================================================
            5. System Health & Security Sentinel Bar
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
                <h4 className="text-xs font-bold text-slate-900 tracking-tight">Security & System Sentinel</h4>
                <p className="text-[11px] text-slate-400 font-medium">
                  Audit Logging Active · MySQL 8.0 Primary Replica Connected · Zero Detected Anomalies
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/admin/audit-logs')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <span>Audit Logs</span>
                <span>→</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
