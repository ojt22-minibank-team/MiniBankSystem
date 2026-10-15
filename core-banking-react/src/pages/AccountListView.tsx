import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  CreditCard,
  Search,
  Plus,
  RefreshCw,
  ArrowDownCircle,
  ShieldAlert,
  Building2,
} from 'lucide-react';
import { accountService } from '../services/accountService';
import type { AccountResponseDTO } from '../types/account.types';
import { StatusBadge } from '../components/common/Badge';
import { TableSkeleton } from '../components/common/LoadingSkeleton';
import { useToast } from '../context/ToastContext';

export const AccountListView: React.FC = () => {
  const [accounts, setAccounts] = useState<AccountResponseDTO[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  const toast = useToast();

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const data = await accountService.getAllAccounts();
      setAccounts(data);
    } catch (err: any) {
      toast.error('Failed to load accounts', err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const filteredAccounts = accounts.filter((acc) => {
    const numMatch = acc.accountNumber?.toLowerCase().includes(searchQuery.toLowerCase());
    const codeMatch = acc.customerCode?.toLowerCase().includes(searchQuery.toLowerCase());
    const nameMatch = acc.customerName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSearch = numMatch || codeMatch || nameMatch;

    if (!matchesSearch) return false;

    if (statusFilter !== 'ALL' && acc.status?.toUpperCase() !== statusFilter) {
      return false;
    }

    if (typeFilter !== 'ALL' && !acc.accountType?.toUpperCase().includes(typeFilter)) {
      return false;
    }

    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Account Management Directory
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Browse all operational, savings, and corporate accounts across the core banking network.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchAccounts}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-xs transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            <span>Reload</span>
          </button>
          <Link
            to="/accounts/new"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Open Retail</span>
          </Link>
          <Link
            to="/accounts/corporate/new"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors"
          >
            <Building2 className="w-4 h-4" />
            <span>Open Corporate</span>
          </Link>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search Account No or Customer Code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:outline-none font-medium"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="FROZEN">FROZEN</option>
            <option value="CLOSED">CLOSED</option>
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:outline-none font-medium"
          >
            <option value="ALL">All Account Types</option>
            <option value="SAVING">SAVINGS</option>
            <option value="CURRENT">CURRENT</option>
          </select>
        </div>
      </div>

      {/* Account Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <TableSkeleton rows={6} columns={7} />
          ) : filteredAccounts.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <CreditCard className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">No Accounts Found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                No bank accounts match your search query. Open a new retail or corporate account.
              </p>
              <div className="mt-4 flex items-center justify-center gap-3">
                <Link
                  to="/accounts/new"
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 rounded-xl"
                >
                  Open Retail Account
                </Link>
                <Link
                  to="/accounts/corporate/new"
                  className="px-3.5 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-xl"
                >
                  Corporate Joint
                </Link>
              </div>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3.5 w-12 text-center">No</th>
                  <th className="px-4 py-3.5">Account Number</th>
                  <th className="px-4 py-3.5">Customer / Holder</th>
                  <th className="px-4 py-3.5">Type & Currency</th>
                  <th className="px-4 py-3.5 text-right">Current Balance</th>
                  <th className="px-4 py-3.5 text-center">Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAccounts.map((acc, idx) => (
                  <tr
                    key={acc.accountNumber || idx}
                    className="hover:bg-blue-50/30 transition-colors group"
                  >
                    <td className="px-4 py-3.5 text-center text-slate-400 font-mono">
                      {idx + 1}
                    </td>
                    <td className="px-4 py-3.5 font-mono font-bold text-slate-900">
                      {acc.accountNumber}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-slate-900">
                        {acc.customerName || '—'}
                      </div>
                      <div className="font-mono text-[10px] text-blue-700">
                        {acc.customerCode}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-semibold text-slate-700">
                        {acc.accountType}
                      </span>
                      <span className="ml-1 text-[10px] font-mono text-slate-400">
                        ({acc.currency})
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-black text-slate-900">
                      {acc.currentBalance?.toLocaleString()} {acc.currency}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <StatusBadge status={acc.status} />
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Deposit Shortcut */}
                        <Link
                          to={`/accounts/deposit?accountNumber=${encodeURIComponent(acc.accountNumber)}`}
                          title="Deposit Cash"
                          className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                        >
                          <ArrowDownCircle className="w-4 h-4" />
                        </Link>

                        {/* Status Change Shortcut */}
                        <Link
                          to={`/accounts/status?accountNumber=${encodeURIComponent(acc.accountNumber)}`}
                          title="Update Status"
                          className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                        >
                          <ShieldAlert className="w-4 h-4" />
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
    </div>
  );
};

export default AccountListView;
