import Modal from '../../../components/common/Modal';
import Button from '../../../components/common/Button';
import type { AccountResponse } from '../../../types/api.types';
import { formatCurrency } from '../../../utils/formatCurrency';

interface AccountDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: AccountResponse | null;
  isLoading: boolean;
}

export default function AccountDetailModal({
  isOpen,
  onClose,
  account,
  isLoading,
}: AccountDetailModalProps) {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={account ? `Account Details: ${account.accountNumber}` : 'Account Details'}
      size="lg"
      footer={
        <div className="flex justify-end w-full">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <svg
            className="h-8 w-8 animate-spin text-blue-600"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm text-gray-500 font-medium">Loading account details...</span>
        </div>
      ) : !account ? (
        <div className="py-8 text-center text-sm text-gray-500">
          No account information found.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                  {account.accountCategory || 'RETAIL'} • {account.accountType}
                </span>
                <h3 className="text-xl font-mono font-bold text-gray-900 tracking-tight">
                  {account.accountNumber}
                </h3>
                <p className="text-xs text-gray-600">
                  Customer: <span className="font-semibold text-gray-800">{account.customerName || '—'}</span> (
                  <span className="font-mono text-gray-500">{account.customerCode || '—'}</span>)
                </p>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <span
                  className={[
                    'rounded-full px-3 py-1 text-xs font-semibold',
                    account.status === 'ACTIVE'
                      ? 'bg-green-100 text-green-700'
                      : account.status === 'FROZEN'
                      ? 'bg-red-100 text-red-700'
                      : account.status === 'DORMANT'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-gray-100 text-gray-600',
                  ].join(' ')}
                >
                  {account.status}
                </span>
                {account.isJointAccount && (
                  <span className="rounded bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 border border-indigo-200">
                    Joint Account
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Balance Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800 block">
                Available Balance
              </span>
              <p className="mt-1 text-2xl font-bold text-emerald-950 font-mono">
                {formatCurrency(account.availableBalance ?? 0, account.currency)}
              </p>
              <p className="text-[11px] text-emerald-700 mt-1">Usable funds for withdrawal and transfer</p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-600 block">
                Ledger (Current) Balance
              </span>
              <p className="mt-1 text-2xl font-bold text-gray-900 font-mono">
                {formatCurrency(account.currentBalance ?? 0, account.currency)}
              </p>
              <p className="text-[11px] text-gray-500 mt-1">Total booked ledger balance including holds</p>
            </div>
          </div>

          {/* Account Details Breakdown */}
          <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
            <div className="p-4 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Account Specifications
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500 text-xs block">Account Number</span>
                  <span className="font-mono font-bold text-gray-800">{account.accountNumber}</span>
                </div>
                <div>
                  <span className="text-gray-500 text-xs block">Currency</span>
                  <span className="font-mono font-semibold text-gray-800">{account.currency}</span>
                </div>
                <div>
                  <span className="text-gray-500 text-xs block">Product Type</span>
                  <span className="font-medium text-gray-800">{account.accountType}</span>
                </div>
                <div>
                  <span className="text-gray-500 text-xs block">Account Category</span>
                  <span className="font-medium text-gray-800">{account.accountCategory || 'RETAIL'}</span>
                </div>
                <div>
                  <span className="text-gray-500 text-xs block">Ownership Type</span>
                  <span className="font-medium text-gray-800">
                    {account.isJointAccount ? 'Joint Ownership' : 'Single Owner'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 text-xs block">Current Status</span>
                  <span className="font-semibold text-gray-800">{account.status}</span>
                </div>
              </div>
            </div>

            {/* Audit & Timestamps */}
            <div className="p-4 bg-gray-50/40 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Timeline & Dates
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500 text-xs block">Date Opened</span>
                  <span className="text-xs font-mono text-gray-700">
                    {account.openedAt ? new Date(account.openedAt).toLocaleString() : '—'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
