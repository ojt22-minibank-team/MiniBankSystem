import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users,
  Building2,
  Landmark,
  ShieldCheck,
  UserPlus,
  CreditCard,
  ArrowUpRight,
  RefreshCw,
  Clock,
  AlertTriangle,
  Eye,
  CheckCircle2,
  Copy,
  Check,
  TrendingUp,
  Activity,
  Layers,
  Sparkles,
} from 'lucide-react';
import { customerService } from '../services/customerService';
import { accountService } from '../services/accountService';
import type { CustomerResponseDTO } from '../types/customer.types';
import type { AccountResponseDTO } from '../types/account.types';
import { StatusBadge, CustomerTypeBadge } from '../components/common/Badge';
import { CardSkeleton, TableSkeleton } from '../components/common/LoadingSkeleton';
import AdminLayout from '../components/layout/AdminLayout';
import { useAuth } from '../features/auth/hooks/useAuth';

interface StaffDashboardProps {
  /** If false, render dashboard body only without AdminLayout wrapper (useful when embedded in AppLayout) */
  withLayout?: boolean;
}

export const DashboardView: React.FC<StaffDashboardProps> = ({ withLayout = true }) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // State
  const [customers, setCustomers] = useState<CustomerResponseDTO[]>([]);
  const [accounts, setAccounts] = useState<AccountResponseDTO[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [backendConnected, setBackendConnected] = useState<boolean>(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Quick Customer Detail Modal
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerResponseDTO | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Digital Clock - Ticks every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Time & Date formatters
  const formattedTime = useMemo(() => {
    return currentTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  }, [currentTime]);

  const formattedDate = useMemo(() => {
    return currentTime.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, [currentTime]);

  // Greeting by time of day
  const greetingGreeting = useMemo(() => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }, [currentTime]);

  // Staff Name resolver from Redux Auth / LocalStorage
  const staffDisplayName = useMemo(() => {
    if (user?.username) {
      return user.username;
    }
    try {
      const stored = localStorage.getItem('staff_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.fullName) return parsed.fullName;
        if (parsed.username) return parsed.username;
      }
      const cbUser = localStorage.getItem('cb_username');
      if (cbUser) return cbUser;
    } catch {
      // ignore JSON parse fallback
    }
    return 'Teller / Operations Officer';
  }, [user]);

  // Load metrics from Spring Boot Backend
  const loadData = useCallback(async () => {
    try {
      setRefreshing(true);
      setConnectionError(null);

      const [custList, accList] = await Promise.all([
        customerService.getAllCustomers(),
        accountService.getAllAccounts(),
      ]);

      setCustomers(Array.isArray(custList) ? custList : []);
      setAccounts(Array.isArray(accList) ? accList : []);
      setBackendConnected(true);
    } catch (err: any) {
      console.error('Failed to synchronize Core Banking data:', err);
      setBackendConnected(false);
      setConnectionError(
        err?.response?.data?.message ||
          err?.message ||
          'Unable to reach Spring Boot Core Banking Engine on port 8080.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Copy helper
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Metrics Calculations
  const totalCustomers = customers.length;
  const individualCustomersCount = useMemo(() => {
    return customers.filter(
      (c) =>
        (c.customerType || '').toUpperCase() === 'PERSONAL' ||
        (c.customerType || '').toUpperCase() === 'INDIVIDUAL'
    ).length;
  }, [customers]);

  const corporateCustomersCount = useMemo(() => {
    return customers.filter(
      (c) =>
        (c.customerType || '').toUpperCase() === 'COMPANY' ||
        (c.customerType || '').toUpperCase() === 'CORPORATE'
    ).length;
  }, [customers]);

  const totalAccounts = accounts.length;
  const corporateJointCount = useMemo(() => {
    return accounts.filter(
      (acc) =>
        acc.isJointAccount === true ||
        (acc.accountCategory || '').toUpperCase() === 'CORPORATE'
    ).length;
  }, [accounts]);

  const retailAccountsCount = useMemo(() => {
    return Math.max(0, totalAccounts - corporateJointCount);
  }, [totalAccounts, corporateJointCount]);

  const totalLiquidity = useMemo(() => {
    return accounts.reduce((acc, curr) => acc + (Number(curr.currentBalance) || 0), 0);
  }, [accounts]);

  const activeAccountsCount = useMemo(() => {
    return accounts.filter((acc) => (acc.status || '').toUpperCase() === 'ACTIVE').length;
  }, [accounts]);

  // Top 5 Latest Customers (Sorted by createdAt descending)
  const recentCustomers = useMemo(() => {
    return [...customers]
      .sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      })
      .slice(0, 5);
  }, [customers]);

  // Top 5 Latest Accounts Opened (Sorted by openedAt or natural order)
  const recentAccounts = useMemo(() => {
    return [...accounts]
      .sort((a, b) => {
        const timeA = a.openedAt ? new Date(a.openedAt).getTime() : 0;
        const timeB = b.openedAt ? new Date(b.openedAt).getTime() : 0;
        return timeB - timeA;
      })
      .slice(0, 5);
  }, [accounts]);

  const dashboardContent = (
    <div className="space-y-8 animate-fade-in text-slate-900 pb-8">
      {/* ============================================================ */}
      {/* 1. Header & Live System Status Terminal Banner               */}
      {/* ============================================================ */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-[#0B192C] to-[#1E3E62] p-6 sm:p-8 text-white shadow-lg border border-slate-800">
        {/* Subtle decorative background glow */}
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-1/3 -bottom-16 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Left Greeting & Portal Identity */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                Group 2 Operations Portal
              </span>

              {/* Live Engine Status Pill Badge */}
              {backendConnected ? (
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-400/30 shadow-xs">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  Core Banking Engine: Connected (Port 8080)
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-400/30 shadow-xs">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                  </span>
                  Core Banking Engine: Disconnected (Port 8080)
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              {greetingGreeting}, <span className="text-blue-300">{staffDisplayName}</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl font-normal leading-relaxed">
              Real-time branch customer records, retail deposit accounts, and dual-signatory corporate joint ledgers monitoring.
            </p>
          </div>

          {/* Right Live Clock & Sync Control */}
          <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end gap-3 shrink-0">
            {/* Real-time Digital Clock (MMT / Local Time) */}
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-300">
                <Clock className="w-4 h-4" />
              </div>
              <div className="text-right">
                <div className="font-mono text-sm sm:text-base font-bold text-white tracking-wider">
                  {formattedTime}{' '}
                  <span className="text-[10px] font-sans font-medium text-blue-300">MMT</span>
                </div>
                <div className="text-[11px] text-slate-400 font-medium">
                  {formattedDate}
                </div>
              </div>
            </div>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={loadData}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-200 bg-white/10 hover:bg-white/20 active:bg-white/25 border border-white/15 rounded-xl transition-all shadow-xs disabled:opacity-50"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-blue-300 ${refreshing ? 'animate-spin' : ''}`}
              />
              <span>{refreshing ? 'Synchronizing Engine...' : 'Sync Live Metrics'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* Error & Offline Notification Banner (Non-Intrusive)          */}
      {/* ============================================================ */}
      {!backendConnected && (
        <div className="rounded-xl border border-rose-200 bg-rose-50/90 p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-rose-100 text-rose-700 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-rose-900">
                Core Banking Engine Offline or Unreachable
              </h4>
              <p className="text-xs text-rose-700 mt-0.5">
                {connectionError ||
                  'Could not connect to Spring Boot backend at http://localhost:8080. Please ensure the backend is running.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={loadData}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors shrink-0 shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Retry Connection
          </button>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. Top Row: Analytics & Metric Summary Cards                 */}
      {/* ============================================================ */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: Total Customers */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md hover:border-blue-300 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Total Customers
                </span>
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl font-black text-slate-900 tracking-tight">
                {totalCustomers.toLocaleString()}
              </div>
              <div className="flex flex-wrap items-center gap-1.5 mt-3">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200/60">
                  Individual: {individualCustomersCount}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                  Corporate: {corporateCustomersCount}
                </span>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">CIF Directory</span>
              <Link
                to="/customers"
                className="font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 hover:underline"
              >
                View all customers <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Card 2: Total Bank Accounts */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md hover:border-indigo-300 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Total Bank Accounts
                </span>
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center">
                  <CreditCard className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl font-black text-slate-900 tracking-tight">
                {totalAccounts.toLocaleString()}
              </div>
              <div className="flex flex-wrap items-center gap-1.5 mt-3">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                  Retail: {retailAccountsCount}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200/60">
                  Corporate Joint: {corporateJointCount}
                </span>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">General Ledgers</span>
              <Link
                to="/accounts"
                className="font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 hover:underline"
              >
                View all accounts <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Card 3: Total Ledger Liquidity */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md hover:border-emerald-300 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Total Ledger Liquidity
                </span>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
                  <Landmark className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-700 tracking-tight">
                {totalLiquidity.toLocaleString()}{' '}
                <span className="text-xs font-extrabold text-emerald-600">MMK</span>
              </div>
              <div className="flex items-center gap-1.5 mt-3 text-xs text-slate-500">
                <Activity className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>
                  {activeAccountsCount} active accounts (
                  {totalAccounts > 0
                    ? `${Math.round((activeAccountsCount / totalAccounts) * 100)}%`
                    : '100%'}
                  )
                </span>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span className="text-slate-400 font-medium">Branch Reserve</span>
              <span className="text-emerald-700 font-bold">Tier-1 Vault Stable</span>
            </div>
          </div>

          {/* Card 4: Corporate Joint Ledgers */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md hover:border-violet-300 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Corporate Joint Ledgers
                </span>
                <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 border border-violet-100 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl font-black text-violet-900 tracking-tight">
                {corporateJointCount}
              </div>
              <div className="mt-3">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-violet-50 text-violet-700 border border-violet-200/60">
                  CEO Approver + Accountant Maker
                </span>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Dual Signatory</span>
              <Link
                to="/accounts/corporate/new"
                className="font-bold text-violet-600 hover:text-violet-800 flex items-center gap-1 hover:underline"
              >
                Corporate Desk <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. Quick Actions Hub (4 High-Priority Shortcut Cards)        */}
      {/* ============================================================ */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              Quick Actions Hub
            </h2>
            <p className="text-xs text-slate-500">
              Direct shortcuts for customer enrollment and dual-mandate account ledger opening.
            </p>
          </div>
          <span className="hidden sm:inline-block text-[11px] font-semibold text-slate-400">
            Decommissioned modules (Cash Deposits, Manual Status) Excluded
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Action 1: Register Personal Customer */}
          <Link
            to="/customers/new?type=personal"
            className="group relative bg-white p-5 rounded-2xl border border-slate-200/90 hover:border-blue-500 hover:bg-blue-50/30 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center group-hover:scale-105 transition-transform shadow-xs">
                  <UserPlus className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                  Individual KYC
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                Register Personal Customer
              </h3>
              <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                Enroll individual client and prepare KYC profile for retail ledger.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-600">
              <span>Enroll Client</span>
              <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          </Link>

          {/* Action 2: Register Company Customer */}
          <Link
            to="/customers/new?type=company"
            className="group relative bg-white p-5 rounded-2xl border border-slate-200/90 hover:border-violet-500 hover:bg-violet-50/30 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-11 h-11 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center group-hover:scale-105 transition-transform shadow-xs">
                  <Building2 className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-violet-50 text-violet-700 border border-violet-200">
                  Corporate Entity
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 group-hover:text-violet-700 transition-colors">
                Register Company Customer
              </h3>
              <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                Onboard corporate entity before creating corporate bank ledgers.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-violet-600">
              <span>Onboard Company</span>
              <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          </Link>

          {/* Action 3: Open Retail Account */}
          <Link
            to="/accounts/new"
            className="group relative bg-white p-5 rounded-2xl border border-slate-200/90 hover:border-emerald-500 hover:bg-emerald-50/30 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center group-hover:scale-105 transition-transform shadow-xs">
                  <CreditCard className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Savings / Current
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                Open Retail Account
              </h3>
              <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                Open savings or current ledger for an existing personal customer code.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-emerald-600">
              <span>Generate Ledger</span>
              <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          </Link>

          {/* Action 4: Open Corporate Joint Account */}
          <Link
            to="/accounts/corporate/new"
            className="group relative bg-white p-5 rounded-2xl border border-slate-200/90 hover:border-indigo-500 hover:bg-indigo-50/30 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-11 h-11 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center group-hover:scale-105 transition-transform shadow-xs">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Dual-Signatory
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">
                Open Corporate Joint Account
              </h3>
              <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                Link registered company with CEO (Approver) & Accountant (Maker) credentials.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-indigo-600">
              <span>Dual Mandate Desk</span>
              <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          </Link>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 4. Live Data Tables / Recent Operations (Bottom Row)         */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Table 1: Recent Customers Table */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Recent Customers</h3>
                <p className="text-[11px] text-slate-500">Top 5 latest registered CIF records</p>
              </div>
            </div>
            <Link
              to="/customers"
              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 hover:underline"
            >
              All Customers ({customers.length}) <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="flex-1 overflow-x-auto">
            {loading ? (
              <TableSkeleton rows={5} columns={4} />
            ) : recentCustomers.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No customer records available.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/90 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Customer Code</th>
                    <th className="px-4 py-3">Customer Name</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Created Date</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {recentCustomers.map((cust) => (
                    <tr
                      key={cust.customerCode}
                      className="hover:bg-blue-50/40 transition-colors group"
                    >
                      {/* Customer Code */}
                      <td className="px-4 py-3 font-mono font-bold text-blue-700">
                        <div className="flex items-center gap-1.5">
                          <span>{cust.customerCode}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(cust.customerCode)}
                            title="Copy Code"
                            className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-blue-600 transition-opacity"
                          >
                            {copiedCode === cust.customerCode ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Customer Name */}
                      <td className="px-4 py-3 text-slate-900 font-bold">
                        <div className="truncate max-w-[140px] sm:max-w-[180px]">
                          {cust.fullName || 'N/A'}
                        </div>
                        {cust.email && (
                          <div className="text-[10px] text-slate-400 font-normal truncate max-w-[140px]">
                            {cust.email}
                          </div>
                        )}
                      </td>

                      {/* Type Badge */}
                      <td className="px-4 py-3">
                        <CustomerTypeBadge type={cust.customerType} />
                      </td>

                      {/* Created Date */}
                      <td className="px-4 py-3 text-slate-500 text-[11px] whitespace-nowrap">
                        {cust.createdAt
                          ? new Date(cust.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : 'Recent'}
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedCustomer(cust)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                          >
                            <Eye className="w-3 h-3" />
                            <span>View</span>
                          </button>
                          <Link
                            to={`/accounts/new?customerCode=${encodeURIComponent(cust.customerCode)}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200/60 rounded-lg transition-colors"
                          >
                            <span>Open Acct</span>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Table 2: Recent Accounts Opened Table */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Recent Accounts Opened</h3>
                <p className="text-[11px] text-slate-500">Top 5 latest opened ledger accounts</p>
              </div>
            </div>
            <Link
              to="/accounts"
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 hover:underline"
            >
              All Accounts ({accounts.length}) <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="flex-1 overflow-x-auto">
            {loading ? (
              <TableSkeleton rows={5} columns={5} />
            ) : recentAccounts.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No accounts created yet.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/90 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Account Number</th>
                    <th className="px-4 py-3">Customer / Company</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3 text-right">Balance</th>
                    <th className="px-4 py-3 text-center">Currency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {recentAccounts.map((acc) => {
                    const isCorporate =
                      acc.isJointAccount ||
                      (acc.accountCategory || '').toUpperCase() === 'CORPORATE';

                    return (
                      <tr
                        key={acc.accountNumber}
                        className="hover:bg-indigo-50/40 transition-colors group"
                      >
                        {/* Account Number */}
                        <td className="px-4 py-3 font-mono font-bold text-slate-900">
                          <div className="flex items-center gap-1.5">
                            <span>{acc.accountNumber}</span>
                            <button
                              type="button"
                              onClick={() => handleCopy(acc.accountNumber)}
                              title="Copy Account Number"
                              className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-indigo-600 transition-opacity"
                            >
                              {copiedCode === acc.accountNumber ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </td>

                        {/* Customer / Company */}
                        <td className="px-4 py-3 text-slate-800">
                          <div className="font-bold truncate max-w-[130px] sm:max-w-[160px]">
                            {acc.customerName || 'Holder Record'}
                          </div>
                          <div className="font-mono text-[10px] text-blue-600 truncate max-w-[130px]">
                            {acc.customerCode}
                          </div>
                        </td>

                        {/* Account Category */}
                        <td className="px-4 py-3">
                          {isCorporate ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                              <ShieldCheck className="w-3 h-3 text-purple-600" />
                              CORPORATE
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              RETAIL
                            </span>
                          )}
                          <div className="text-[10px] text-slate-400 mt-0.5 font-normal">
                            {acc.accountType}
                          </div>
                        </td>

                        {/* Balance */}
                        <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                          {(Number(acc.currentBalance) || 0).toLocaleString()}
                        </td>

                        {/* Currency */}
                        <td className="px-4 py-3 text-center">
                          <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            {acc.currency || 'MMK'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 5. Quick Customer Profile Modal                              */}
      {/* ============================================================ */}
      {selectedCustomer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setSelectedCustomer(null)}
        >
          <div
            className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-900 to-[#0B192C] text-white px-6 py-5 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-300">
                  CIF Quick Profile
                </span>
                <h3 className="text-lg font-extrabold text-white">
                  {selectedCustomer.fullName || selectedCustomer.customerCode}
                </h3>
              </div>
              <CustomerTypeBadge type={selectedCustomer.customerType} />
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Customer CIF Code
                  </span>
                  <span className="font-mono text-sm font-bold text-blue-700">
                    {selectedCustomer.customerCode}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Account Status
                  </span>
                  <div className="mt-0.5">
                    <StatusBadge status={selectedCustomer.status} />
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500 font-medium">Customer Type</span>
                  <span className="font-bold text-slate-800">{selectedCustomer.customerType}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500 font-medium">Primary Contact Phone</span>
                  <span className="font-bold text-slate-800">{selectedCustomer.phone || '—'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500 font-medium">Official Email Address</span>
                  <span className="font-bold text-slate-800">{selectedCustomer.email || '—'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500 font-medium">Registration Timestamp</span>
                  <span className="font-bold text-slate-800">
                    {selectedCustomer.createdAt
                      ? new Date(selectedCustomer.createdAt).toLocaleString()
                      : '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200/70 rounded-xl transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const isComp =
                    (selectedCustomer.customerType || '').toUpperCase() === 'COMPANY';
                  setSelectedCustomer(null);
                  if (isComp) {
                    navigate(
                      `/accounts/corporate/new?companyCustomerCode=${encodeURIComponent(
                        selectedCustomer.customerCode
                      )}`
                    );
                  } else {
                    navigate(
                      `/accounts/new?customerCode=${encodeURIComponent(
                        selectedCustomer.customerCode
                      )}`
                    );
                  }
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-xs flex items-center gap-1.5"
              >
                <span>Open Ledger Account</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Wrap in AdminLayout if requested (default true)
  if (withLayout) {
    return <AdminLayout pageTitle="Core Operations Dashboard">{dashboardContent}</AdminLayout>;
  }

  return dashboardContent;
};

// Aliases for maximum compatibility
export const StaffDashboard = DashboardView;
export default DashboardView;
