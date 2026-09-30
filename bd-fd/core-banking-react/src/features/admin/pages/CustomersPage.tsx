import { useEffect, useState } from 'react';
import AdminLayout from '../../../components/layout/AdminLayout';
import DataTable from '../../../components/common/DataTable';
import { customersApi } from '../../../services/apiClient';
import type { CustomerResponse } from '../../../types/api.types';
import type { AxiosError } from 'axios';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => { load(); }, []);

  const columns = [
    { key: 'customerCode', header: 'Customer Code' },
    { key: 'fullName', header: 'Full Name' },
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
  ];

  return (
    <AdminLayout pageTitle="Customers">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Customers</h2>
          <p className="mt-0.5 text-sm text-gray-500">All registered customers.</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          <p className="font-semibold">Error</p>
          <p className="mt-1">{error}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100">
            <p className="text-sm text-gray-500">
              {isLoading ? 'Loading...' : `${customers.length} customer${customers.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <div className="p-4">
            <DataTable
              columns={columns}
              data={customers}
              isLoading={isLoading}
              emptyMessage="No customers found."
              keyExtractor={(row: CustomerResponse) => row.customerCode}
            />
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
