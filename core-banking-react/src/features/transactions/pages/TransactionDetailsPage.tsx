import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/hooks/useAuth';
import AdminLayout from '../../../components/layout/AdminLayout';
import { transactionApi } from '../../../services/transactionService';
import type {
  StaffTransactionSummary,
  StaffTransactionDetail,
  StaffTransactionSearchParams,
  StaffTransactionStats,
} from '../../../types/transactions.types';
import TransactionFilterBar, { getTodayDateRange } from '../components/TransactionFilterBar';
import TransactionStatsCards from '../components/TransactionStatsCards';
import TransactionDetailModal from '../components/TransactionDetailModal';
import { formatCurrency } from '../../../utils/formatCurrency';
import { formatDateTime } from '../../../utils/formatDate';
import {
  Eye,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react';

export default function TransactionDetailsPage() {
  const { isTeller } = useAuth();
  const { refOrId } = useParams<{ refOrId?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // State
  const [transactions, setTransactions] = useState<StaffTransactionSummary[]>([]);
  const [stats, setStats] = useState<StaffTransactionStats | null>(null);
  const [totalElements, setTotalElements] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [page, setPage] = useState<number>(0);
  const [size, setSize] = useState<number>(20);
  const [sortField, setSortField] = useState<string>('initiatedAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isStatsLoading, setIsStatsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters (Defaults to Today's date range)
  const [appliedFilters, setAppliedFilters] = useState<StaffTransactionSearchParams>(() => getTodayDateRange());

  // Inspector Modal
  const [selectedTransaction, setSelectedTransaction] = useState<StaffTransactionDetail | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);
  const [isDetailLoading, setIsDetailLoading] = useState<boolean>(false);

  // In-flight request cancellation
  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch KPI Stats
  const loadStats = useCallback(async () => {
    setIsStatsLoading(true);
    try {
      const data = await transactionApi.getStats();
      setStats(data);
    } catch (e: unknown) {
      console.warn('Could not load transaction stats overview:', e);
    } finally {
      setIsStatsLoading(false);
    }
  }, []);

  // Fetch Transactions List
  const loadTransactions = useCallback(async (
    targetPage: number,
    targetSize: number,
    filters: StaffTransactionSearchParams,
    field: string,
    dir: 'asc' | 'desc'
  ) => {
    // Abort previous in-flight request for optimal performance
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setError(null);

    try {
      const response = await transactionApi.search(
        {
          ...filters,
          page: targetPage,
          size: targetSize,
          sort: `${field},${dir}`,
        },
        controller.signal
      );

      setTransactions(response.content || []);
      setTotalElements(response.totalElements || 0);
      setTotalPages(response.totalPages || 1);
      setPage(response.number || 0);
    } catch (err: unknown) {
      // Ignore abort errors
      if ((err as Error)?.name === 'CanceledError' || (err as Error)?.name === 'AbortError') {
        return;
      }
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to load core banking transactions. Please verify backend connection.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch single detail
  const handleOpenDetail = useCallback(async (identifier: string) => {
    setIsDetailOpen(true);
    setIsDetailLoading(true);
    try {
      const detail = await transactionApi.getByIdentifier(identifier);
      setSelectedTransaction(detail);
    } catch (e: unknown) {
      console.error('Failed to load transaction detail:', e);
      setIsDetailOpen(false);
    } finally {
      setIsDetailLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadTransactions(page, size, appliedFilters, sortField, sortDir);
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [page, size, appliedFilters, sortField, sortDir, loadTransactions]);

  // Deep linking check via URL parameter /:refOrId or query ?ref=
  useEffect(() => {
    const directRef = refOrId || searchParams.get('ref') || searchParams.get('id');
    if (directRef) {
      handleOpenDetail(directRef);
    }
  }, [refOrId, searchParams, handleOpenDetail]);

  // Filter change handler
  const handleFilterChange = useCallback((newFilters: StaffTransactionSearchParams) => {
    setAppliedFilters(newFilters);
    setPage(0); // Reset to first page
  }, []);

  // Sort toggler
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
    setPage(0);
  };

  const renderStatusBadge = (st: string) => {
    switch (st) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            COMPLETED
          </span>
        );
      case 'PENDING_AUTHORIZATION':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800">
            <Clock className="w-3 h-3 text-blue-600" />
            PENDING
          </span>
        );
      case 'FAILED':
      case 'REJECTED':
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
            <XCircle className="w-3 h-3 text-rose-600" />
            {st}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700">
            {st}
          </span>
        );
    }
  };

  return (
    <AdminLayout pageTitle="Transaction Explorer & Details">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Title & Refresh */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              Transaction Explorer & Details
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Query, filter, and inspect real-time transaction ledger entries across all channels.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                loadStats();
                loadTransactions(page, size, appliedFilters, sortField, sortDir);
              }}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Overview Stats Cards */}
        <TransactionStatsCards stats={stats} isLoading={isStatsLoading} />

        {/* Filter Bar */}
        <TransactionFilterBar onFilterChange={handleFilterChange} isLoading={isLoading} />

        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={() => loadTransactions(page, size, appliedFilters, sortField, sortDir)}
              className="font-semibold underline ml-2 cursor-pointer"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Main Transactions Table Container */}
        <div className="overflow-hidden rounded-2xl liquid-glass border border-slate-200/80 bg-white/70 shadow-xs backdrop-blur-md">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100/90 text-left text-xs">
              <thead className="bg-slate-50/70 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th scope="col" className="px-4 py-3.5">
                    Reference
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3.5 cursor-pointer hover:text-blue-600 transition-colors select-none"
                    onClick={() => handleSort('initiatedAt')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Date & Time</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th scope="col" className="px-4 py-3.5">
                    Type & Channel
                  </th>
                  <th scope="col" className="px-4 py-3.5">
                    Source Account
                  </th>
                  <th scope="col" className="px-4 py-3.5">
                    Destination Account
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3.5 text-right cursor-pointer hover:text-blue-600 transition-colors select-none"
                    onClick={() => handleSort('amount')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Amount</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th scope="col" className="px-4 py-3.5 text-center">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3.5 text-center">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100/70 bg-white/50">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-16 text-center text-slate-400">
                      <div className="flex flex-col items-center gap-3">
                        <div className="h-9 w-9 rounded-full border-2 border-sky-500/20 border-t-sky-600 animate-spin" />
                        <span className="text-xs font-semibold text-slate-600">
                          Retrieving core banking transactions...
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-14 text-center text-slate-400">
                      <div className="flex flex-col items-center gap-2">
                        <div className="h-10 w-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                          <Eye className="w-5 h-5" />
                        </div>
                        <span className="font-semibold text-slate-600">
                          No transactions found matching your criteria.
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Try adjusting search keywords, date range, or status filters.
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => (
                    <tr
                      key={tx.transactionId}
                      onClick={() => handleOpenDetail(tx.transactionRef)}
                      className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                    >
                      {/* Ref */}
                      <td className="px-4 py-3.5">
                        <span className="font-mono font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {tx.transactionRef}
                        </span>
                        {tx.description && (
                          <span className="block text-[11px] text-slate-400 truncate max-w-[150px]">
                            {tx.description}
                          </span>
                        )}
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3.5 text-slate-600 font-medium whitespace-nowrap">
                        {formatDateTime(tx.initiatedAt)}
                      </td>

                      {/* Type & Channel */}
                      <td className="px-4 py-3.5">
                        <span className="font-semibold text-slate-800 block text-xs">
                          {tx.transactionType}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                          {tx.channel}
                        </span>
                      </td>

                      {/* Source Account */}
                      <td className="px-4 py-3.5">
                        {tx.sourceAccountNo ? (
                          <>
                            <span className="font-mono font-semibold text-slate-800 block text-xs">
                              {tx.sourceAccountNo}
                            </span>
                            <span className="text-[11px] text-slate-500 truncate block max-w-[140px]">
                              {tx.sourceCustomerName || 'Internal'}
                            </span>
                          </>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Counter Cash / External</span>
                        )}
                      </td>

                      {/* Destination Account */}
                      <td className="px-4 py-3.5">
                        {tx.destAccountNo ? (
                          <>
                            <span className="font-mono font-semibold text-slate-800 block text-xs">
                              {tx.destAccountNo}
                            </span>
                            <span className="text-[11px] text-slate-500 truncate block max-w-[140px]">
                              {tx.destCustomerName || 'Internal'}
                            </span>
                          </>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Counter Cash / External</span>
                        )}
                      </td>

                      {/* Amount & Fee */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <span className="font-bold text-slate-900 block text-xs">
                          {formatCurrency(tx.amount, tx.currency)}
                        </span>
                        {tx.serviceFee > 0 && (
                          <span className="text-[10px] text-slate-500">
                            Fee: +{formatCurrency(tx.serviceFee, tx.currency)}
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        {renderStatusBadge(tx.status)}
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3.5 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleOpenDetail(tx.transactionRef)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg text-blue-600 hover:text-blue-700 hover:bg-blue-50 border border-transparent hover:border-blue-200 transition-all cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3.5 bg-slate-50/70 border-t border-slate-100">
            {/* Left: Item Counter & Page Size */}
            <div className="flex items-center gap-3 text-xs text-slate-600">
              <span>
                Showing{' '}
                <span className="font-bold text-slate-900">
                  {totalElements === 0 ? 0 : page * size + 1}
                </span>{' '}
                to{' '}
                <span className="font-bold text-slate-900">
                  {Math.min((page + 1) * size, totalElements)}
                </span>{' '}
                of <span className="font-bold text-slate-900">{totalElements.toLocaleString()}</span> entries
              </span>

              <div className="flex items-center gap-1.5 ml-2 border-l border-slate-300 pl-3">
                <span className="text-[11px] text-slate-500">Per page:</span>
                <select
                  value={size}
                  onChange={(e) => {
                    setSize(Number(e.target.value));
                    setPage(0);
                  }}
                  className="px-2 py-1 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            {/* Right: Page Navigation Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage(0)}
                disabled={page === 0 || isLoading}
                title="First Page"
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0 || isLoading}
                title="Previous Page"
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="px-3 py-1 text-xs font-semibold text-slate-700">
                Page {totalPages === 0 ? 0 : page + 1} of {totalPages}
              </span>

              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1 || isLoading}
                title="Next Page"
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(totalPages - 1)}
                disabled={page >= totalPages - 1 || isLoading}
                title="Last Page"
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Transaction Detail Modal */}
        <TransactionDetailModal
          transaction={selectedTransaction}
          isOpen={isDetailOpen}
          isLoading={isDetailLoading}
          onClose={() => {
            setIsDetailOpen(false);
            setSelectedTransaction(null);
            // If refOrId or query param was set, clear it smoothly
            if (refOrId || searchParams.has('ref') || searchParams.has('id')) {
              navigate(isTeller ? '/teller/transactions' : '/admin/transactions', { replace: true });
            }
          }}
        />
      </div>
    </AdminLayout>
  );
}
