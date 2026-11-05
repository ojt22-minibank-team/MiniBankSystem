import Modal from '../../../components/common/Modal';
import Button from '../../../components/common/Button';
import type { CustomerDetailResponse } from '../../../types/api.types';

interface CustomerDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: CustomerDetailResponse | null;
  isLoading: boolean;
}

export default function CustomerDetailModal({
  isOpen,
  onClose,
  customer,
  isLoading,
}: CustomerDetailModalProps) {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={customer ? `Customer Details: ${customer.customerCode}` : 'Customer Details'}
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
          <span className="text-sm text-gray-500 font-medium">Loading customer details...</span>
        </div>
      ) : !customer ? (
        <div className="py-8 text-center text-sm text-gray-500">
          No customer details found.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                  {customer.customerType} Customer
                </span>
                <h3 className="text-lg font-bold text-gray-900">{customer.fullName}</h3>
                <p className="font-mono text-xs text-gray-500">{customer.customerCode}</p>
              </div>
              <span
                className={[
                  'rounded-full px-3 py-1 text-xs font-semibold',
                  customer.status === 'ACTIVE'
                    ? 'bg-green-100 text-green-700'
                    : customer.status === 'FROZEN'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-gray-100 text-gray-600',
                ].join(' ')}
              >
                {customer.status}
              </span>
            </div>
          </div>

          {/* Details Section */}
          <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
            {/* Primary Contact Info */}
            <div className="p-4 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Contact Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500 text-xs block">Email Address</span>
                  <span className="font-medium text-gray-800">{customer.email || '—'}</span>
                </div>
                <div>
                  <span className="text-gray-500 text-xs block">Phone Number</span>
                  <span className="font-medium text-gray-800 font-mono">{customer.phone || '—'}</span>
                </div>
                <div className="md:col-span-2">
                  <span className="text-gray-500 text-xs block">Registered Address</span>
                  <span className="font-medium text-gray-800">{customer.address || '—'}</span>
                </div>
              </div>
            </div>

            {/* Profile Info based on Customer Type */}
            {customer.customerType === 'COMPANY' ? (
              <div className="p-4 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-purple-600">
                  Company / Corporate Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500 text-xs block">Company Name</span>
                    <span className="font-medium text-gray-800">{customer.companyName || customer.fullName}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 text-xs block">Business Type</span>
                    <span className="font-medium text-gray-800">{customer.businessType || '—'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 text-xs block">Registration Number</span>
                    <span className="font-mono font-semibold text-gray-800">{customer.registrationNumber || '—'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 text-xs block">Tax Identification Number (TIN)</span>
                    <span className="font-mono font-semibold text-gray-800">{customer.taxId || '—'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 text-xs block">Country</span>
                    <span className="font-medium text-gray-800">{customer.country || 'Myanmar'}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-600">
                  Personal Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500 text-xs block">First Name</span>
                    <span className="font-medium text-gray-800">{customer.firstName || '—'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 text-xs block">Last Name</span>
                    <span className="font-medium text-gray-800">{customer.lastName || '—'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 text-xs block">NRC / National ID</span>
                    <span className="font-mono font-semibold text-gray-800">{customer.nrc || '—'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 text-xs block">Gender</span>
                    <span className="font-medium text-gray-800">{customer.gender || '—'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 text-xs block">Date of Birth</span>
                    <span className="font-medium text-gray-800">{customer.dateOfBirth || '—'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 text-xs block">Occupation</span>
                    <span className="font-medium text-gray-800">{customer.occupation || '—'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Audit & Timestamps */}
            <div className="p-4 bg-gray-50/50 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Audit Timeline
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500 text-xs block">Registration Date</span>
                  <span className="text-xs font-mono text-gray-700">
                    {customer.createdAt ? new Date(customer.createdAt).toLocaleString() : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 text-xs block">Last Updated Date</span>
                  <span className="text-xs font-mono text-gray-700">
                    {customer.updatedAt ? new Date(customer.updatedAt).toLocaleString() : '—'}
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
