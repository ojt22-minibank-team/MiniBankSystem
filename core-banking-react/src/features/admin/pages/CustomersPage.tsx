import { useEffect, useMemo, useState } from 'react';
import AdminLayout from '../../../components/layout/AdminLayout';
import DataTable from '../../../components/common/DataTable';
import Button from '../../../components/common/Button';
import { customersApi } from '../../../services/apiClient';
import type { CustomerResponse, CustomerDetailResponse } from '../../../types/api.types';
import type { AxiosError } from 'axios';
import CustomerCreateModal from '../components/CustomerCreateModal';
import CustomerDetailModal from '../components/CustomerDetailModal';

// ── Constants ────────────────────────────────────────────────────────
const PAGE_SIZE = 10;

type StatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE' | 'FROZEN';
type SortField = 'createdAt' | 'customerCode';
type SortDir = 'asc' | 'desc';

export default function CustomersPage() {
  // ── Data state ───────────────────────────────────────────────────
  const [customers, setCustomers] = useState<CustomerResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // ── Customer Detail State ─────────────────────────────────────────
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDetailResponse | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // ── Search / filter / sort / page state ──────────────────────────
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [currentPage, setCurrentPage] = useState(1);

  // ── Fetch ────────────────────────────────────────────────────────
  const load = () => {
    setIsLoading(true);
    setError(null);
    customersApi
      .getAll()
      .then((res) => setCustomers(res.data))
      .catch((err: AxiosError) => {
        setError('Failed to load customers. Please try again.');
        console.error(err);
      })
      .finally(() => setIsLoading(false));
  };

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

  useEffect(() => { load(); }, []);

  // ── Derived data pipeline: search → filter → sort ────────────────
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

  // ── Pagination helpers ───────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(processed.length / PAGE_SIZE));

  // Reset to page 1 whenever the upstream data changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, sortField, sortDir]);

  const pageData = useMemo(
    () => processed.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [processed, currentPage],
  );

  // ── Column definitions ──────────────────────────────────────────
  const columns = [
    { key: 'customerCode', header: 'Customer Code' },
    { key: 'fullName', header: 'Full Name' },
    {
      key: 'customerType',
      header: 'Type',
      render: (row: CustomerResponse) => (
        <span
          className={[
            'rounded-full px-2.5 py-0.5 text-xs font-semibold',
            row.customerType === 'COMPANY'
              ? 'bg-purple-100 text-purple-700'
              : 'bg-blue-50 text-blue-700',
          ].join(' ')}
        >
          {row.customerType}
        </span>
      ),
    },
    { key: 'email', header: 'Email' },
    { key: 'phone', header: 'Phone' },
    {
      key: 'status',
      header: 'Status',
      render: (row: CustomerResponse) => (
        <span
          className={[
            'rounded-full px-2.5 py-1 text-xs font-semibold',
            row.status === 'ACTIVE'
              ? 'bg-green-100 text-green-700'
              : row.status === 'FROZEN'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-500',
          ].join(' ')}
        >
          {row.status}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (row: CustomerResponse) =>
        new Date(row.createdAt).toLocaleDateString(),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: CustomerResponse) => (
        <button
          onClick={() => handleOpenDetail(row.customerCode)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors"
          title="View detailed customer information"
        >
          <svg className="h-3.5 w-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          Details
        </button>
      ),
    },
  ];

  // ── Render ──────────────────────────────────────────────────────
  return (
    <AdminLayout pageTitle="Customers">
      {/* Page header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Customers</h2>
          <p className="mt-0.5 text-sm text-gray-500">All registered customers.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={load}
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
          <Button
            variant="primary"
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Register Customer
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          <p className="font-semibold">Error</p>
          <p className="mt-1">{error}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          {/* ── Toolbar: search · filter · sort ─────────────────── */}
          <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 px-5 py-4">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <svg
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1010.5 18a7.5 7.5 0 006.15-3.35z" />
              </svg>
              <input
                type="text"
                placeholder="Search by name, code, email, or phone…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm text-gray-700 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="createdAt">Sort by Created</option>
              <option value="customerCode">Sort by Code</option>
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

          {/* ── Summary row ─────────────────────────────────────── */}
          <div className="px-5 py-3 border-b border-gray-100">
            <p className="text-sm text-gray-500">
              {isLoading
                ? 'Loading...'
                : `Showing ${pageData.length} of ${processed.length} customer${processed.length !== 1 ? 's' : ''}`}
            </p>
          </div>

          {/* ── Table ───────────────────────────────────────────── */}
          <div className="p-4">
            <DataTable
              columns={columns}
              data={pageData}
              isLoading={isLoading}
              emptyMessage="No customers match your criteria."
              keyExtractor={(row: CustomerResponse) => row.customerCode}
            />
          </div>

          {/* ── Pagination ──────────────────────────────────────── */}
          {!isLoading && totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3">
              <span className="text-sm text-gray-500">
                Page {currentPage} of {totalPages}
              </span>

              <div className="flex items-center gap-1">
                {/* Previous */}
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  ← Prev
                </button>

                {/* Page numbers (show up to 5 around current) */}
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
                      <span key={`e-${idx}`} className="px-2 text-gray-400">…</span>
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

                {/* Next */}
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
      )}

      {/* Customer Registration Modal */}
      <CustomerCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={load}
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
      />
    </AdminLayout>
  );
}
