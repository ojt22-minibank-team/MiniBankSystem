import { useEffect, useMemo, useState } from 'react';
import AdminLayout from '../../../components/layout/AdminLayout';
import DataTable from '../../../components/common/DataTable';
import TableSkeletonLoader from '../../../components/common/TableSkeletonLoader';
import { customersApi } from '../../../services/apiClient';
import { useBankingData } from '../../../hooks/useBankingData';
import type { CustomerResponse, CustomerDetailResponse } from '../../../types/api.types';
import { formatDate } from '../../../utils/formatDate';
import CustomerCreateModal from '../components/CustomerCreateModal';
import CustomerDetailModal from '../components/CustomerDetailModal';
import CustomerEditModal from '../components/CustomerEditModal';
import { useAuth } from '../../auth/hooks/useAuth';

// ── Constants ─────────────────────────────────────────────────────────────
const PAGE_SIZE = 10;

type StatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE' | 'FROZEN';
type SortField = 'createdAt' | 'customerCode';
type SortDir = 'asc' | 'desc';

export default function CustomersPage() {
  const { isTeller } = useAuth();
  // ── High-Performance Parallel Data Fetching & SWR In-Memory Cache ─────────
  const {
    customers,
    isLoading,
    isRevalidating,
    error,
    refresh,
      } = useBankingData({
    autoFetch: true,
    pagination: { page: 0, size: 50 },
    cacheTtlMs: 60000,
  });

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // ── Customer Detail State ─────────────────────────────────────────────────
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDetailResponse | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // ── Customer Edit State ───────────────────────────────────────────────────
  const [selectedEditCustomer, setSelectedEditCustomer] = useState<CustomerResponse | CustomerDetailResponse | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // ── Search / filter / sort / page state ───────────────────────────────────
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [currentPage, setCurrentPage] = useState(1);

  // Open details modal
  const handleOpenDetail = async (customerCode: string) => {
    setIsDetailModalOpen(true);
    setIsDetailLoading(true);
    setSelectedCustomer(null);
    try {
      const res = await customersApi.getByCode(customerCode);
      setSelectedCustomer(res.data);
    } catch (err) {
      console.error('Failed to load customer details:', err);
    } finally {
      setIsDetailLoading(false);
    }
  };

  // Open edit modal
  const handleOpenEdit = (customer: CustomerResponse) => {
    setSelectedEditCustomer(customer);
    setIsEditModalOpen(true);
  };

  // ── Derived data pipeline: search → filter → sort ─────────────────────────
  const processed = useMemo(() => {
    let list = [...customers];

    // 1. Search
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (c) =>
          c.fullName.toLowerCase().includes(q) ||
          c.customerCode.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q),
      );
    }

    // 2. Status filter
    if (statusFilter !== 'ALL') {
      list = list.filter((c) => c.status === statusFilter);
    }

    // 3. Sort
    list.sort((a, b) => {
      let cmp: number;
      if (sortField === 'createdAt') {
        cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else {
        cmp = a.customerCode.localeCompare(b.customerCode);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [customers, searchTerm, statusFilter, sortField, sortDir]);

  const activeCustomersCount = useMemo(
    () => customers.filter((c) => c.status === 'ACTIVE').length,
    [customers],
  );

  const corporateCount = useMemo(
    () => customers.filter((c) => c.customerType === 'COMPANY').length,
    [customers],
  );

  // ── Pagination helpers ───────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(processed.length / PAGE_SIZE));

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, sortField, sortDir]);

  const pageData = useMemo(
    () => processed.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [processed, currentPage],
  );

  // ── Column definitions ───────────────────────────────────────────────────
  const columns = [
    {
      key: 'customerCode',
      header: 'Customer Code',
      render: (row: CustomerResponse) => (
        <span className="font-mono font-bold text-slate-900 text-xs sm:text-sm">
          {row.customerCode}
        </span>
      ),
    },
    {
      key: 'fullName',
      header: 'Full Name / Entity',
      render: (row: CustomerResponse) => (
        <div>
          <p className="font-bold text-slate-900 leading-snug">{row.fullName}</p>
          <p className="text-[11px] text-slate-400">
            {row.customerType === 'COMPANY' ? 'Corporate Client' : 'Individual Client'}
          </p>
        </div>
      ),
    },
    {
      key: 'customerType',
      header: 'Type',
      render: (row: CustomerResponse) => (
        <span
          className={
            row.customerType === 'COMPANY'
              ? 'status-pill-blue'
              : 'status-pill-amber'
          }
        >
          {row.customerType}
        </span>
      ),
    },
    {
      key: 'contact',
      header: 'Contact Info',
      render: (row: CustomerResponse) => (
        <div>
          <p className="text-slate-800 font-medium">{row.email}</p>
          <p className="text-[11px] text-slate-400 font-mono mt-0.5">{row.phone}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center' as const,
      render: (row: CustomerResponse) => (
        <span
          className={
            row.status === 'ACTIVE'
              ? 'status-pill-emerald'
              : row.status === 'FROZEN'
              ? 'status-pill-crimson'
              : 'status-pill-amber'
          }
        >
          {row.status}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (row: CustomerResponse) => formatDate(row.createdAt),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'center' as const,
      render: (row: CustomerResponse) => (
        <div className="flex items-center justify-center gap-1.5">
          {/* View Details Action */}
          <button
            onClick={() => handleOpenDetail(row.customerCode)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-all cursor-pointer"
            title="View detailed customer information"
          >
            <svg className="h-3.5 w-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span>Details</span>
          </button>

          {/* Edit Profile Action */}
          <button
            onClick={() => handleOpenEdit(row)}
            className="inline-flex items-center gap-1 rounded-lg border border-sky-200 bg-sky-50/80 px-2.5 py-1 text-xs font-semibold text-sky-700 shadow-xs hover:bg-sky-100 hover:border-sky-300 transition-all cursor-pointer"
            title="Edit Customer Profile (Phone, Occupation, DOB)"
          >
            <svg className="h-3.5 w-3.5 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span>Edit</span>
          </button>
        </div>
      ),
    },
  ];

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <AdminLayout pageTitle="Customers">
      <div className="max-w-[1440px] mx-auto space-y-6">

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-2xl sm:text-[28px] font-bold text-slate-900 tracking-tight">
                Customer Registry
              </h2>
              {isRevalidating && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-sky-600 animate-pulse">
                  <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
                  Syncing
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs sm:text-sm text-slate-500 font-medium">
              EKARAJ BANK Portfolio: Registered corporate entities and retail clients
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => refresh()}
              disabled={isLoading}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <svg
                className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Refresh</span>
            </button>
            {isTeller && (
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 text-xs font-semibold shadow-xs transition-all duration-200 ease-in-out hover:-translate-y-0.5 cursor-pointer"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                <span>Register Customer</span>
              </button>
            )}
          </div>
        </div>

        {/* 3 Summary KPI Cards (Liquid Glass) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {/* Card 1: Total Customers */}
          <div className="liquid-glass-card rounded-3xl p-6">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Customers
            </span>
            <div className="flex items-baseline justify-between mt-3">
              <span className="text-2xl sm:text-[28px] font-bold text-slate-900 font-mono tabular-nums">
                {isLoading && customers.length === 0 ? '...' : customers.length}
              </span>
              <span className="status-pill-emerald text-[11px]">
                KYC Registered
              </span>
            </div>
          </div>

          {/* Card 2: Active Clients */}
          <div className="liquid-glass-card rounded-3xl p-6">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Active Clients
            </span>
            <div className="flex items-baseline justify-between mt-3">
              <span className="text-2xl sm:text-[28px] font-bold text-slate-900 font-mono tabular-nums">
                {isLoading && customers.length === 0 ? '...' : activeCustomersCount}
              </span>
              <span className="status-pill-emerald text-[11px]">
                Active Standing
              </span>
            </div>
          </div>

          {/* Card 3: Corporate Entities */}
          <div className="liquid-glass-card rounded-3xl p-6">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Corporate Entities
            </span>
            <div className="flex items-baseline justify-between mt-3">
              <span className="text-2xl sm:text-[28px] font-bold text-slate-900 font-mono tabular-nums">
                {isLoading && customers.length === 0 ? '...' : corporateCount}
              </span>
              <span className="status-pill-blue text-[11px]">
                Commercial Accounts
              </span>
            </div>
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50/80 backdrop-blur-md px-5 py-4 text-xs font-semibold text-rose-700">
            <p className="font-bold">Error</p>
            <p className="mt-1">{error}</p>
          </div>
        ) : (
          <div className="liquid-glass rounded-3xl p-6 space-y-5">
            {/* ── Toolbar: search · filter · sort ─────────────────────────── */}
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
                  placeholder="Search by name, code, email, or phone…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/70 py-2 pl-10 pr-4 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-sky-100 focus:border-sky-500 transition-all shadow-xs"
                />
              </div>

              {/* Status filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-100 focus:border-sky-500 shadow-xs cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="FROZEN">Frozen</option>
              </select>

              {/* Sort field */}
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value as SortField)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-100 focus:border-sky-500 shadow-xs cursor-pointer"
              >
                <option value="createdAt">Sort by Created Date</option>
                <option value="customerCode">Sort by Customer Code</option>
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

            {/* ── Table & Skeleton Loader ─────────────────────────────────── */}
            <div>
              {isLoading && customers.length === 0 ? (
                /* Fast visual feedback: lightweight skeleton loader renders instantly in <50ms */
                <TableSkeletonLoader columns={7} rows={8} />
              ) : (
                <DataTable
                  columns={columns}
                  data={pageData}
                  isLoading={false}
                  emptyMessage="No customers match your criteria."
                  keyExtractor={(row: CustomerResponse) => row.customerCode}
                />
              )}

              {/* ── Pagination ────────────────────────────────────────────── */}
              {!isLoading && totalPages > 1 && (
                <div className="mt-5 flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
                  <span className="text-xs font-medium text-slate-500">
                    Showing page {currentPage} of {totalPages} ({processed.length} total customers)
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

        {/* Customer Registration Modal */}
        <CustomerCreateModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => refresh()}
        />

        {/* Customer Detail Modal */}
        <CustomerDetailModal
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedCustomer(null);
          }}
          customer={selectedCustomer}
          isLoading={isDetailLoading}
          onEdit={(cust: CustomerDetailResponse) => {
            setSelectedCustomer(null);
            setIsDetailModalOpen(false);
            setSelectedEditCustomer(cust);
            setIsEditModalOpen(true);
          }}
        />

        {/* Customer Profile Edit Modal */}
        <CustomerEditModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedEditCustomer(null);
          }}
          customer={selectedEditCustomer}
          onSuccess={() => {
            refresh();
          }}
        />
      </div>
    </AdminLayout>
  );
}
