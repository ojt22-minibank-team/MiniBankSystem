import { useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../../components/layout/AdminLayout';
import Button from '../../../components/common/Button';
import Input from '../../../components/common/Input';
import Modal from '../../../components/common/Modal';
import { accountsApi } from '../../../services/apiClient';
import { useAuth } from '../../auth/hooks/useAuth';
import type { AccountResponse } from '../../../types/api.types';
import { formatCurrency } from '../../../utils/formatCurrency';
import { formatDateTime } from '../../../utils/formatDate';
import type { AxiosError } from 'axios';

export default function AccountsPage() {
  const { isTeller, isAdmin } = useAuth();
  const canCreate = isTeller || isAdmin;

  const [searchType, setSearchType] = useState<'accountNumber' | 'customerCode'>('accountNumber');
  const [searchValue, setSearchValue] = useState('');
  const [accounts, setAccounts] = useState<AccountResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Status modal
  const [selectedAccount, setSelectedAccount] = useState<AccountResponse | null>(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('ACTIVE');
  const [statusReason, setStatusReason] = useState('');
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchValue.trim()) return;

    setIsLoading(true);
    setError(null);
    setAccounts([]);

    try {
      if (searchType === 'accountNumber') {
        const res = await accountsApi.getByNumber(searchValue.trim());
        setAccounts(res.data ? [res.data] : []);
      } else {
        const res = await accountsApi.getByCustomer(searchValue.trim());
        setAccounts(res.data ?? []);
      }
    } catch (err) {
      const axErr = err as AxiosError<{ message?: string }>;
      if (axErr.response?.status === 404) {
        setError('No account found matching the provided criteria.');
      } else {
        setError(axErr.response?.data?.message || 'Failed to search account records.');
      }
    } finally {
      setIsLoading(false);
    }
  };

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

  return (
    <AdminLayout pageTitle="Accounts Management">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Bank Accounts</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            Query and manage customer savings, current, and corporate accounts.
          </p>
        </div>
        {canCreate && (
          <div className="flex items-center gap-2.5 flex-wrap">
            <Link
              to="/admin/accounts/new"
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              New Retail Account
            </Link>
            <Link
              to="/admin/accounts/corporate/new"
              className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
            >
              <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              New Corporate Account
            </Link>
            <Link
              to="/admin/accounts/deposit"
              className="flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-sm font-semibold text-emerald-800 shadow-sm hover:bg-emerald-100 transition-colors"
            >
              <svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Deposit Funds
            </Link>
          </div>
        )}
      </div>

      {successMessage && (
        <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm text-emerald-800">
          {successMessage}
        </div>
      )}

      {/* Search Bar */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <form onSubmit={handleSearch} className="space-y-4 sm:flex sm:items-end sm:gap-4 sm:space-y-0">
          <div className="w-full sm:w-48">
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
              Search By
            </label>
            <select
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={searchType}
              onChange={(e) => setSearchType(e.target.value as 'accountNumber' | 'customerCode')}
            >
              <option value="accountNumber">Account Number</option>
              <option value="customerCode">Customer Code</option>
            </select>
          </div>

          <div className="flex-1">
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
              {searchType === 'accountNumber' ? 'Enter Account Number' : 'Enter Customer Code'}
            </label>
            <Input
              placeholder={searchType === 'accountNumber' ? 'e.g. 1001-2003-4005' : 'e.g. CUST-00109'}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={isLoading}
            className="w-full sm:w-auto"
          >
            Lookup Account
          </Button>
        </form>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          <p className="font-semibold">Lookup Error</p>
          <p className="mt-1">{error}</p>
        </div>
      )}

      {/* Results */}
      {accounts.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
            Account Records ({accounts.length})
          </h3>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {accounts.map((acc) => (
              <div
                key={acc.accountNumber}
                className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-lg font-bold text-gray-900">
                      {acc.accountNumber}
                    </span>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Customer: <span className="font-medium text-gray-800">{acc.customerName || acc.customerCode}</span>
                    </p>
                  </div>
                  <span
                    className={[
                      'rounded-full px-2.5 py-1 text-xs font-semibold',
                      acc.status === 'ACTIVE'
                        ? 'bg-green-100 text-green-700'
                        : acc.status === 'FROZEN'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-amber-100 text-amber-700',
                    ].join(' ')}
                  >
                    {acc.status}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4 rounded-lg bg-gray-50 p-4">
                  <div>
                    <p className="text-xs text-gray-500">Available Balance</p>
                    <p className="mt-1 text-xl font-bold text-gray-900">
                      {formatCurrency(acc.availableBalance ?? 0, acc.currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Current Ledger Balance</p>
                    <p className="mt-1 text-xl font-semibold text-gray-700">
                      {formatCurrency(acc.currentBalance ?? 0, acc.currency)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between text-xs text-gray-500">
                  <div className="space-y-1">
                    <p>Type: <span className="font-medium text-gray-700">{acc.accountType}</span></p>
                    <p>Category: <span className="font-medium text-gray-700">{acc.accountCategory || 'Standard'}</span></p>
                    {acc.isJointAccount && (
                      <span className="inline-block rounded bg-indigo-50 px-2 py-0.5 font-medium text-indigo-700">
                        Joint Account
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <p>Opened: {acc.openedAt ? formatDateTime(acc.openedAt) : '—'}</p>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="mt-2"
                      onClick={() => {
                        setSelectedAccount(acc);
                        setNewStatus(acc.status);
                        setStatusReason('');
                        setStatusError(null);
                        setIsStatusModalOpen(true);
                      }}
                    >
                      Update Status
                    </Button>
                  </div>
                </div>
              </div>
            ))}
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
    </AdminLayout>
  );
}
