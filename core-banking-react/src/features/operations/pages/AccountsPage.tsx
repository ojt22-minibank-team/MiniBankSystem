import { useEffect, useMemo, useState } from 'react';
import AdminLayout from '../../../components/layout/AdminLayout';
import DataTable from '../../../components/common/DataTable';
import Button from '../../../components/common/Button';
import Modal from '../../../components/common/Modal';
import { accountsApi } from '../../../services/apiClient';
import type { AccountResponse } from '../../../types/api.types';
import { formatCurrency } from '../../../utils/formatCurrency';
import type { AxiosError } from 'axios';
import AccountCreateModal from '../components/AccountCreateModal';
import AccountDetailModal from '../components/AccountDetailModal';

// ── Constants ────────────────────────────────────────────────────────
const PAGE_SIZE = 10;

type CategoryFilter = 'ALL' | 'RETAIL' | 'CORPORATE';
type StatusFilter = 'ALL' | 'ACTIVE' | 'DORMANT' | 'FROZEN' | 'CLOSED';
type SortField = 'openedAt' | 'accountNumber' | 'availableBalance';
type SortDir = 'asc' | 'desc';

export default function AccountsPage() {
  // ── Data state ───────────────────────────────────────────────────
  const [accounts, setAccounts] = useState<AccountResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isCreateAccountModalOpen, setIsCreateAccountModalOpen] = useState(false);

  // ── Detail modal state ───────────────────────────────────────────
  const [detailAccount, setDetailAccount] = useState<AccountResponse | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // ── Search / filter / sort / page state ──────────────────────────
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [sortField, setSortField] = useState<SortField>('openedAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [currentPage, setCurrentPage] = useState(1);

  // ── Status modal state ───────────────────────────────────────────
  const [selectedAccount, setSelectedAccount] = useState<AccountResponse | null>(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('ACTIVE');
  const [statusReason, setStatusReason] = useState('');
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  // ── Fetch all accounts ───────────────────────────────────────────
  const loadAccounts = () => {
    setIsLoading(true);
    setError(null);
    accountsApi
      .getAll()
      .then((res) => setAccounts(res.data ?? []))
      .catch((err: AxiosError) => {
        setError('Failed to load accounts. Please verify backend is running.');
        console.error(err);
      })
      .finally(() => setIsLoading(false));
  };

  const handleOpenDetail = async (accountNumber: string) => {
    setIsDetailModalOpen(true);
    setIsDetailLoading(true);
    setDetailAccount(null);
    try {
      const res = await accountsApi.getByNumber(accountNumber);
      setDetailAccount(res.data);
    } catch (err) {
      console.error('Failed to load account details:', err);
      const local = accounts.find((a) => a.accountNumber === accountNumber);
      if (local) setDetailAccount(local);
    } finally {
      setIsDetailLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  // ── Derived data pipeline: search → filter → sort ────────────────
  const processed = useMemo(() => {
    let list = [...accounts];

    // 1. Search
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (a) =>
          a.accountNumber.toLowerCase().includes(q) ||
          (a.customerCode && a.customerCode.toLowerCase().includes(q)) ||
          (a.customerName && a.customerName.toLowerCase().includes(q)) ||
          (a.currency && a.currency.toLowerCase().includes(q)),
      );
    }

    // 2. Category filter
    if (categoryFilter !== 'ALL') {
      list = list.filter((a) => (a.accountCategory || 'RETAIL') === categoryFilter);
    }

    // 3. Status filter
    if (statusFilter !== 'ALL') {
      list = list.filter((a) => a.status === statusFilter);
    }

    // 4. Sort
    list.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'openedAt') {
        cmp = new Date(a.openedAt || 0).getTime() - new Date(b.openedAt || 0).getTime();
      } else if (sortField === 'availableBalance') {
        cmp = (Number(a.availableBalance) || 0) - (Number(b.availableBalance) || 0);
      } else {
        cmp = a.accountNumber.localeCompare(b.accountNumber);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [accounts, searchTerm, categoryFilter, statusFilter, sortField, sortDir]);

  // Total summary figures for KPI cards
  const totalBalance = useMemo(() => {
    return accounts.reduce((acc, curr) => acc + (Number(curr.availableBalance) || 0), 0);
  }, [accounts]);

  const activeAccountsCount = useMemo(() => {
    return accounts.filter((a) => a.status === 'ACTIVE').length;
  }, [accounts]);

  const frozenAccountsCount = useMemo(() => {
    return accounts.filter((a) => a.status === 'FROZEN').length;
  }, [accounts]);

  // ── Pagination helpers ───────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(processed.length / PAGE_SIZE));

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, categoryFilter, statusFilter, sortField, sortDir]);

  const pageData = useMemo(
    () => processed.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [processed, currentPage],
  );

  // ── Handlers ─────────────────────────────────────────────────────
  const handleUpdateStatus = async () => {
    if (!selectedAccount) return;
    setStatusLoading(true);
    setStatusError(null);

    try {
      const res = await accountsApi.updateStatus(selectedAccount.accountNumber, {
        status: newStatus,
        reason: statusReason,
      });

      setSuccessMessage(`Account ${selectedAccount.accountNumber} status updated to ${newStatus}.`);
      setIsStatusModalOpen(false);
      setSelectedAccount(null);
      setStatusReason('');

      setAccounts((prev) =>
        prev.map((acc) =>
          acc.accountNumber === selectedAccount.accountNumber ? res.data : acc,
        ),
      );
    } catch (err) {
      const axErr = err as AxiosError<{ message?: string }>;
      setStatusError(axErr.response?.data?.message || 'Failed to update account status.');
    } finally {
      setStatusLoading(false);
    }
  };

  const handleAccountCreated = (newAccNum: string) => {
    loadAccounts();
    setSuccessMessage(`Account ${newAccNum} opened successfully!`);
  };

  // ── Column definitions ──────────────────────────────────────────
  const columns = [
    {
      key: 'accountNumber',
      header: 'Account Number',
      render: (row: AccountResponse) => (
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-slate-900 text-xs sm:text-sm">{row.accountNumber}</span>
          {row.isJointAccount && (
            <span className="rounded-full bg-sky-100 text-sky-700 px-2 py-0.5 text-[10px] font-bold">
              Joint
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (row: AccountResponse) => (
        <div>
          <p className="font-bold text-slate-900 leading-snug">{row.customerName || '—'}</p>
          <p className="text-[11px] text-slate-400 font-mono">{row.customerCode || '—'}</p>
        </div>
      ),
    },
    {
      key: 'accountCategory',
      header: 'Category',
      render: (row: AccountResponse) => {
        const cat = row.accountCategory || 'RETAIL';
        return (
          <span
            className={
              cat === 'CORPORATE'
                ? 'status-pill-blue'
                : 'status-pill-amber'
            }
          >
            {cat}
          </span>
        );
      },
    },
    {
      key: 'accountType',
      header: 'Product',
      render: (row: AccountResponse) => (
        <span className="rounded-md bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
          {row.accountType}
        </span>
      ),
    },
    {
      key: 'availableBalance',
      header: 'Available Balance',
      align: 'right' as const,
      render: (row: AccountResponse) => (
        <span className="font-mono font-bold text-slate-900 tabular-nums">
          {formatCurrency(row.availableBalance ?? 0, row.currency)}
        </span>
      ),
    },
    {
      key: 'currentBalance',
      header: 'Ledger Balance',
      align: 'right' as const,
      render: (row: AccountResponse) => (
        <span className="font-mono font-medium text-slate-500 tabular-nums">
          {formatCurrency(row.currentBalance ?? 0, row.currency)}
        </span>
      ),
    },
    {
      key: 'currency',
      header: 'Currency',
      render: (row: AccountResponse) => (
        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-mono font-bold text-slate-700">
          {row.currency || 'MMK'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center' as const,
      render: (row: AccountResponse) => (
        <span
          className={
            row.status === 'ACTIVE'
              ? 'status-pill-emerald'
              : row.status === 'FROZEN'
              ? 'status-pill-crimson'
              : row.status === 'CLOSED'
              ? 'status-pill-crimson'
              : row.status === 'DORMANT'
              ? 'status-pill-amber'
              : 'status-pill-blue'
          }
        >
          {row.status}
        </span>
      ),
    },
    {
      key: 'openedAt',
      header: 'Opened Date',
      render: (row: AccountResponse) =>
        row.openedAt ? new Date(row.openedAt).toLocaleDateString() : '—',
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'center' as const,
      render: (row: AccountResponse) => (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => handleOpenDetail(row.accountNumber)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-all cursor-pointer"
            title="View detailed account info"
          >
            <span>Details</span>
          </button>
          <button
            onClick={() => {
              setSelectedAccount(row);
              setNewStatus(row.status);
              setStatusReason('');
              setStatusError(null);
              setIsStatusModalOpen(true);
            }}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-all cursor-pointer"
            title="Update account status"
          >
            <span>Status</span>
          </button>
        </div>
      ),
    },
  ];

  // ── Render ──────────────────────────────────────────────────────
  return (
    <AdminLayout pageTitle="Customer Accounts">
      <div className="max-w-[1440px] mx-auto space-y-6">

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
          <div>
            <h2 className="text-2xl sm:text-[28px] font-bold text-slate-900 tracking-tight">
              Customer Accounts
            </h2>
            <p className="mt-0.5 text-xs sm:text-sm text-slate-500 font-medium">
              EKARAJ BANK: Retail savings, current accounts, and corporate deposit facilities
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadAccounts}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs transition-colors cursor-pointer"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Refresh</span>
            </button>
            <button
              type="button"
              onClick={() => setIsCreateAccountModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 text-xs font-semibold shadow-xs transition-all duration-200 ease-in-out hover:-translate-y-0.5 cursor-pointer"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span>Open New Account</span>
            </button>
          </div>
        </div>

        {/* 3 Summary KPI Cards (Clear High-Contrast Dark Numbers on Crisp White Cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {/* Card 1: Total Portfolio Balance */}
          <div className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)]">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Portfolio Balance
            </span>
            <div className="flex items-baseline justify-between mt-3">
              <span className="text-2xl sm:text-[28px] font-bold text-slate-900 font-mono tabular-nums">
                {isLoading ? 'Loading…' : formatCurrency(totalBalance, 'MMK')}
              </span>
              <span className="status-pill-emerald text-[11px]">
                {accounts.length} Accounts
              </span>
            </div>
          </div>

          {/* Card 2: Active Accounts */}
          <div className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)]">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Active Accounts
            </span>
            <div className="flex items-baseline justify-between mt-3">
              <span className="text-2xl sm:text-[28px] font-bold text-slate-900 font-mono tabular-nums">
                {activeAccountsCount}
              </span>
              <span className="status-pill-emerald text-[11px]">
                Normal Standing
              </span>
            </div>
          </div>

          {/* Card 3: Frozen Accounts */}
          <div className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)]">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Frozen / Restricted
            </span>
            <div className="flex items-baseline justify-between mt-3">
              <span className="text-2xl sm:text-[28px] font-bold text-slate-900 font-mono tabular-nums">
                {frozenAccountsCount}
              </span>
              <span className="status-pill-crimson text-[11px]">
                Compliance Watch
              </span>
            </div>
          </div>
        </div>

        {successMessage && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800 flex items-center justify-between">
            <span>{successMessage}</span>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-emerald-700 hover:text-emerald-950 font-bold cursor-pointer"
            >
              ×
            </button>
          </div>
        )}

        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-5 py-4 text-xs font-semibold text-rose-700">
            <p className="font-bold">Error</p>
            <p className="mt-1">{error}</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] space-y-5">
            {/* ── Toolbar: search · filter · sort ─────────────────── */}
            <div className="flex flex-wrap items-center gap-3 pb-4 border-b border-slate-100">
              {/* Search */}
              <div className="relative flex-1 min-w-[240px]">
                <svg
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1010.5 18a7.5 7.5 0 006.15-3.35z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search by account number, name, customer code…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/70 py-2 pl-10 pr-4 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-sky-100 focus:border-sky-500 transition-all shadow-xs"
                />
              </div>

              {/* Category filter */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-100 focus:border-sky-500 shadow-xs cursor-pointer"
              >
                <option value="ALL">All Categories</option>
                <option value="RETAIL">Retail Only</option>
                <option value="CORPORATE">Corporate Only</option>
              </select>

              {/* Status filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-100 focus:border-sky-500 shadow-xs cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="FROZEN">Frozen</option>
                <option value="DORMANT">Dormant</option>
                <option value="CLOSED">Closed</option>
              </select>

              {/* Sort field */}
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value as SortField)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-100 focus:border-sky-500 shadow-xs cursor-pointer"
              >
                <option value="openedAt">Sort by Opened Date</option>
                <option value="accountNumber">Sort by Account Number</option>
                <option value="availableBalance">Sort by Balance</option>
              </select>

              {/* Sort direction toggle */}
              <button
                onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
                title={sortDir === 'desc' ? 'Sorted descending – click to toggle' : 'Sorted ascending – click to toggle'}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs transition-colors cursor-pointer"
              >
                {sortDir === 'desc' ? (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                    <span>DESC</span>
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                    </svg>
                    <span>ASC</span>
                  </>
                )}
              </button>
            </div>

            {/* ── Table ───────────────────────────────────────────── */}
            <div>
              <DataTable
                columns={columns}
                data={pageData}
                isLoading={isLoading}
                emptyMessage="No bank accounts found matching the criteria."
                keyExtractor={(row: AccountResponse) => row.accountNumber}
              />

              {/* ── Pagination ──────────────────────────────────────── */}
              {!isLoading && totalPages > 1 && (
                <div className="mt-5 flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
                  <span className="text-xs font-medium text-slate-500">
                    Showing page {currentPage} of {totalPages} ({processed.length} total accounts)
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      ← Prev
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(
                        (p) =>
                          p === 1 ||
                          p === totalPages ||
                          Math.abs(p - currentPage) <= 2,
                      )
                      .reduce<(number | 'ellipsis')[]>((acc, p, idx, arr) => {
                        if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('ellipsis');
                        acc.push(p);
                        return acc;
                      }, [])
                      .map((item, idx) =>
                        item === 'ellipsis' ? (
                          <span key={`e-${idx}`} className="px-2 text-slate-400">
                            …
                          </span>
                        ) : (
                          <button
                            key={item}
                            onClick={() => setCurrentPage(item)}
                            className={[
                              'rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer',
                              item === currentPage
                                ? 'bg-sky-600 text-white shadow-xs'
                                : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
                            ].join(' ')}
                          >
                            {item}
                          </button>
                        ),
                      )}

                    <button
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Status Update Modal */}
        <Modal
          isOpen={isStatusModalOpen}
          onClose={() => setIsStatusModalOpen(false)}
          title={`Update Account Status: ${selectedAccount?.accountNumber}`}
          size="md"
          footer={
            <>
              <Button
                variant="secondary"
                size="md"
                onClick={() => setIsStatusModalOpen(false)}
                disabled={statusLoading}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                isLoading={statusLoading}
                onClick={handleUpdateStatus}
              >
                Confirm Update
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            {statusError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
                {statusError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                New Account Status
              </label>
              <select
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-100"
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                disabled={statusLoading}
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="DORMANT">DORMANT</option>
                <option value="FROZEN">FROZEN</option>
                <option value="CLOSED">CLOSED</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Operation Reason / Compliance Note
              </label>
              <textarea
                rows={3}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-100"
                placeholder="e.g. Account frozen upon customer request due to suspected fraud."
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                disabled={statusLoading}
              />
            </div>
          </div>
        </Modal>

        {/* Account Creation Modal (Retail & Corporate) */}
        <AccountCreateModal
          isOpen={isCreateAccountModalOpen}
          onClose={() => setIsCreateAccountModalOpen(false)}
          onSuccess={handleAccountCreated}
        />

        {/* Account Detail Modal */}
        <AccountDetailModal
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setDetailAccount(null);
          }}
          account={detailAccount}
          isLoading={isDetailLoading}
        />
      </div>
    </AdminLayout>
  );
}
