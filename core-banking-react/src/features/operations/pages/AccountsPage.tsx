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
      // Fallback to local item if found
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
        cmp = (a.availableBalance ?? 0) - (b.availableBalance ?? 0);
      } else {
        cmp = a.accountNumber.localeCompare(b.accountNumber);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [accounts, searchTerm, categoryFilter, statusFilter, sortField, sortDir]);

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

      // Refresh list
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
        <div>
          <span className="font-mono font-bold text-gray-900">{row.accountNumber}</span>
          {row.isJointAccount && (
            <span className="ml-2 rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700">
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
          <p className="font-medium text-gray-900 leading-snug">{row.customerName || '—'}</p>
          <p className="text-xs text-gray-400 font-mono">{row.customerCode || '—'}</p>
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
            className={[
              'rounded-full px-2.5 py-0.5 text-xs font-semibold',
              cat === 'CORPORATE'
                ? 'bg-purple-100 text-purple-700'
                : 'bg-blue-50 text-blue-700',
            ].join(' ')}
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
        <span
          className={[
            'rounded-full px-2 py-0.5 text-xs font-medium',
            row.accountType === 'SAVINGS'
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-cyan-50 text-cyan-700',
          ].join(' ')}
        >
          {row.accountType}
        </span>
      ),
    },
    {
      key: 'availableBalance',
      header: 'Available Balance',
      render: (row: AccountResponse) => (
        <span className="font-semibold text-gray-900">
          {formatCurrency(row.availableBalance ?? 0, row.currency)}
        </span>
      ),
    },
    {
      key: 'currentBalance',
      header: 'Ledger Balance',
      render: (row: AccountResponse) => (
        <span className="text-gray-600">
          {formatCurrency(row.currentBalance ?? 0, row.currency)}
        </span>
      ),
    },
    {
      key: 'currency',
      header: 'Currency',
      render: (row: AccountResponse) => (
        <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-mono font-bold text-gray-700">
          {row.currency}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: AccountResponse) => (
        <span
          className={[
            'rounded-full px-2.5 py-0.5 text-xs font-semibold',
            row.status === 'ACTIVE'
              ? 'bg-green-100 text-green-700'
              : row.status === 'FROZEN'
              ? 'bg-red-100 text-red-700'
              : row.status === 'DORMANT'
              ? 'bg-amber-100 text-amber-700'
              : 'bg-gray-100 text-gray-500',
          ].join(' ')}
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
      render: (row: AccountResponse) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenDetail(row.accountNumber)}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50 hover:text-blue-600 transition-colors"
            title="View account specifications and balances"
          >
            <svg className="h-3.5 w-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Details
          </button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setSelectedAccount(row);
              setNewStatus(row.status);
              setStatusReason('');
              setStatusError(null);
              setIsStatusModalOpen(true);
            }}
          >
            Status
          </Button>
        </div>
      ),
    },
  ];

  // ── Render ──────────────────────────────────────────────────────
  return (
    <AdminLayout pageTitle="Accounts Management">
      {/* Page Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Bank Accounts</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            All customer savings, current, and corporate accounts.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadAccounts}
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
          <Button
            variant="primary"
            onClick={() => setIsCreateAccountModalOpen(true)}
            className="flex items-center gap-2"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Open New Account
          </Button>
        </div>
      </div>

      {successMessage && (
        <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm text-emerald-800 flex items-center justify-between">
          <span>{successMessage}</span>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-600 hover:text-emerald-900 font-bold"
          >
            ×
          </button>
        </div>
      )}

      {error ? (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          <p className="font-semibold">Error</p>
          <p className="mt-1">{error}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          {/* ── Toolbar: search · filter · sort ─────────────────── */}
          <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 px-5 py-4">
            {/* Search */}
            <div className="relative flex-1 min-w-[220px]">
              <svg
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1010.5 18a7.5 7.5 0 006.15-3.35z" />
              </svg>
              <input
                type="text"
                placeholder="Search by account number, name, customer code…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm text-gray-700 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Category filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">All Categories</option>
              <option value="RETAIL">Retail Only</option>
              <option value="CORPORATE">Corporate Only</option>
            </select>

            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="openedAt">Sort by Opened Date</option>
              <option value="accountNumber">Sort by Account Number</option>
              <option value="availableBalance">Sort by Balance</option>
            </select>

            {/* Sort direction toggle */}
            <button
              onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
              title={sortDir === 'desc' ? 'Sorted descending – click to toggle' : 'Sorted ascending – click to toggle'}
              className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {sortDir === 'desc' ? (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                  DESC
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                  </svg>
                  ASC
                </>
              )}
            </button>
          </div>

          {/* ── Table ───────────────────────────────────────────── */}
          <div className="p-5">
            <DataTable
              columns={columns}
              data={pageData}
              isLoading={isLoading}
              emptyMessage="No bank accounts found matching the criteria."
              keyExtractor={(row: AccountResponse) => row.accountNumber}
            />

            {/* ── Pagination ──────────────────────────────────────── */}
            {!isLoading && totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
                <span className="text-sm text-gray-500">
                  Page {currentPage} of {totalPages} ({processed.length} total accounts)
                </span>

                <div className="flex items-center gap-1">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
                        <span key={`e-${idx}`} className="px-2 text-gray-400">
                          …
                        </span>
                      ) : (
                        <button
                          key={item}
                          onClick={() => setCurrentPage(item)}
                          className={[
                            'rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
                            item === currentPage
                              ? 'border-blue-600 bg-blue-600 text-white'
                              : 'border-gray-300 text-gray-700 hover:bg-gray-50',
                          ].join(' ')}
                        >
                          {item}
                        </button>
                      ),
                    )}

                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
        title={`Change Account Status: ${selectedAccount?.accountNumber}`}
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
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {statusError}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New Account Status
            </label>
            <select
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Operation Reason / Notes
            </label>
            <textarea
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
    </AdminLayout>
  );
}
