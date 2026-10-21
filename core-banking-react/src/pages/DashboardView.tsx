import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  CreditCard,
  ShieldCheck,
  UserPlus,
  ArrowDownCircle,
  Building2,
  ArrowRight,
  RefreshCw,
  Wallet,
} from 'lucide-react';
import { customerService } from '../services/customerService';
import { accountService } from '../services/accountService';
import type { CustomerResponseDTO } from '../types/customer.types';
import type { AccountResponseDTO } from '../types/account.types';
import { StatusBadge, CustomerTypeBadge } from '../components/common/Badge';
import { CardSkeleton, TableSkeleton } from '../components/common/LoadingSkeleton';

export const DashboardView: React.FC = () => {
  const [customers, setCustomers] = useState<CustomerResponseDTO[]>([]);
  const [accounts, setAccounts] = useState<AccountResponseDTO[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const loadData = async () => {
    try {
      setRefreshing(true);
      const [custList, accList] = await Promise.all([
        customerService.getAllCustomers().catch(() => []),
        accountService.getAllAccounts().catch(() => []),
      ]);
      setCustomers(custList);
      setAccounts(accList);
    } catch (err) {
      console.error('Failed to load dashboard metrics:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Metrics Calculations
  const totalCustomers = customers.length;
  const totalAccounts = accounts.length;
  const activeAccounts = accounts.filter(
    (acc) => (acc.status || '').toUpperCase() === 'ACTIVE'
  ).length;
  const savingsCount = accounts.filter(
    (acc) => (acc.accountType || '').toUpperCase().includes('SAVING')
  ).length;
  const currentCount = accounts.filter(
    (acc) => (acc.accountType || '').toUpperCase() === 'CURRENT'
  ).length;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Welcome & Refresh Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Core Banking Staff Overview
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time branch customer records, retail accounts, and corporate services monitoring.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadData}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-xs transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
            <span>Refresh Live Data</span>
          </button>
        </div>
      </div>

      {/* 1. Summary Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Total Customers */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Total Customers
              </span>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {totalCustomers.toLocaleString()}
            </div>
            <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
              <span>Personal & Corporate</span>
              <Link to="/customers" className="text-blue-600 font-semibold hover:underline">
                View all →
              </Link>
            </div>
          </div>

          {/* Total Accounts */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Total Accounts
              </span>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <CreditCard className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {totalAccounts.toLocaleString()}
            </div>
            <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
              <span>Savings: {savingsCount} | Current: {currentCount}</span>
              <Link to="/accounts" className="text-blue-600 font-semibold hover:underline">
                Details →
              </Link>
            </div>
          </div>

          {/* Active Accounts */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Active Accounts
              </span>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-emerald-700 tracking-tight">
              {activeAccounts.toLocaleString()}
            </div>
            <div className="mt-2 text-xs text-slate-500">
              {totalAccounts > 0 ? (
                <span className="text-emerald-600 font-semibold">
                  {((activeAccounts / totalAccounts) * 100).toFixed(0)}% operational
                </span>
              ) : (
                'System ready'
              )}
            </div>
          </div>

          {/* Deposit Counter */}
          <div className="bg-gradient-to-br from-[#0B192C] to-[#1E3E62] text-white p-6 rounded-2xl shadow-md">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-blue-200 uppercase tracking-wider">
                Counter Operations
              </span>
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 text-blue-300 flex items-center justify-center">
                <Wallet className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl font-bold tracking-tight">Teller Station</div>
            <div className="mt-3">
              <Link
                to="/accounts/deposit"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-200 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors border border-white/10"
              >
                Deposit Cash Now <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* 2. Quick Navigation Shortcuts */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">
          Quick Banking Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            to="/customers/new"
            className="flex items-center gap-3.5 p-4 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 transition-all group"
          >
            <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 group-hover:text-blue-700">
                Register Customer
              </div>
              <div className="text-[11px] text-slate-500">Personal & Corporate</div>
            </div>
          </Link>

          <Link
            to="/accounts/new"
            className="flex items-center gap-3.5 p-4 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 transition-all group"
          >
            <div className="w-11 h-11 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 group-hover:text-indigo-700">
                Open Retail Account
              </div>
              <div className="text-[11px] text-slate-500">Savings & Current</div>
            </div>
          </Link>

          <Link
            to="/accounts/corporate/new"
            className="flex items-center gap-3.5 p-4 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 transition-all group"
          >
            <div className="w-11 h-11 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 group-hover:text-violet-700">
                Corporate Joint Account
              </div>
              <div className="text-[11px] text-slate-500">CEO & Accountant Signatory</div>
            </div>
          </Link>

          <Link
            to="/accounts/deposit"
            className="flex items-center gap-3.5 p-4 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 transition-all group"
          >
            <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <ArrowDownCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 group-hover:text-emerald-700">
                Counter Deposit
              </div>
              <div className="text-[11px] text-slate-500">Instant Cash Inward</div>
            </div>
          </Link>
        </div>
      </div>

      {/* 3. Recent Customers & Recent Accounts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Customers */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Recently Enrolled Customers</h3>
              <p className="text-xs text-slate-500">Latest CIF records in system</p>
            </div>
            <Link
              to="/customers"
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              All Customers <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="flex-1 overflow-x-auto">
            {loading ? (
              <TableSkeleton rows={4} columns={3} />
            ) : customers.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No customer records found yet.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2.5">Code</th>
                    <th className="px-4 py-2.5">Name</th>
                    <th className="px-4 py-2.5">Type</th>
                    <th className="px-4 py-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customers.slice(0, 5).map((cust) => (
                    <tr key={cust.customerCode} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-blue-700">
                        {cust.customerCode}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {cust.fullName || 'N/A'}
                      </td>
                      <td className="px-4 py-3">
                        <CustomerTypeBadge type={cust.customerType} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          to={`/accounts/new?customerCode=${cust.customerCode}`}
                          className="font-semibold text-blue-600 hover:text-blue-800"
                        >
                          Open Acct
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Recent Accounts */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Latest Active Accounts</h3>
              <p className="text-xs text-slate-500">Operational banking ledgers</p>
            </div>
            <Link
              to="/accounts"
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              All Accounts <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="flex-1 overflow-x-auto">
            {loading ? (
              <TableSkeleton rows={4} columns={3} />
            ) : accounts.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No accounts created yet.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2.5">Account No</th>
                    <th className="px-4 py-2.5">Holder / Code</th>
                    <th className="px-4 py-2.5">Type</th>
                    <th className="px-4 py-2.5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {accounts.slice(0, 5).map((acc) => (
                    <tr key={acc.accountNumber} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">
                        {acc.accountNumber}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-700">
                        {acc.customerName || acc.customerCode}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-600">
                          {acc.accountType} ({acc.currency})
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <StatusBadge status={acc.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
