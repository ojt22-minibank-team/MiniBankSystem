import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  UserPlus,
  Eye,
  Edit3,
  CreditCard,
  RefreshCw,
  Building2,
  User,
} from 'lucide-react';
import { customerService } from '../services/customerService';
import type { CustomerResponseDTO, CustomerDetailResponseDTO } from '../types/customer.types';
import { StatusBadge, CustomerTypeBadge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { TableSkeleton } from '../components/common/LoadingSkeleton';
import { useToast } from '../context/ToastContext';

export const CustomerListView: React.FC = () => {
  const [customers, setCustomers] = useState<CustomerResponseDTO[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'PERSONAL' | 'COMPANY'>('ALL');

  // Detail Modal State
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDetailResponseDTO | null>(null);
  const [modalLoading, setModalLoading] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const toast = useToast();

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const data = await customerService.getAllCustomers();
      setCustomers(data);
    } catch (err: any) {
      toast.error('Failed to fetch customers', err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleViewDetails = async (customerCode: string) => {
    try {
      setModalLoading(true);
      setIsModalOpen(true);
      const detail = await customerService.getCustomerByCode(customerCode);
      setSelectedCustomer(detail);
    } catch (err: any) {
      toast.error('Could not load customer detail', err.response?.data?.message || err.message);
      setIsModalOpen(false);
    } finally {
      setModalLoading(false);
    }
  };

  // Filter & Search Logic
  const filteredCustomers = customers.filter((cust) => {
    const codeMatch = cust.customerCode?.toLowerCase().includes(searchQuery.toLowerCase());
    const nameMatch = cust.fullName?.toLowerCase().includes(searchQuery.toLowerCase());
    const emailMatch = cust.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSearch = codeMatch || nameMatch || emailMatch;

    if (!matchesSearch) return false;

    if (typeFilter === 'ALL') return true;
    const isCompany =
      cust.customerType?.toUpperCase() === 'COMPANY' ||
      cust.customerType?.toUpperCase() === 'CORPORATE';
    if (typeFilter === 'COMPANY') return isCompany;
    if (typeFilter === 'PERSONAL') return !isCompany;
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Customer Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Search, inspect CIF records, manage identity KYC, and initiate retail/corporate banking accounts.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchCustomers}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-xs transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            <span>Reload</span>
          </button>
          <Link
            to="/customers/new"
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            <span>Register Customer</span>
          </Link>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Customer Code or Full Name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
          />
        </div>

        {/* Type Filter Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-full md:w-auto">
          <button
            type="button"
            onClick={() => setTypeFilter('ALL')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              typeFilter === 'ALL'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({customers.length})
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('PERSONAL')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              typeFilter === 'PERSONAL'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            Personal
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('COMPANY')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              typeFilter === 'COMPANY'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            Company
          </button>
        </div>
      </div>

      {/* Customer Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <TableSkeleton rows={6} columns={7} />
          ) : filteredCustomers.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">No Customers Found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                No matching customer records found for "{searchQuery}". Try adjusting your filters or register a new customer.
              </p>
              <div className="mt-4">
                <Link
                  to="/customers/new"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800"
                >
                  <UserPlus className="w-4 h-4" />
                  Create Customer Record
                </Link>
              </div>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3.5 w-12 text-center">No</th>
                  <th className="px-4 py-3.5">Customer Code</th>
                  <th className="px-4 py-3.5">Customer Name</th>
                  <th className="px-4 py-3.5">Contact Email</th>
                  <th className="px-4 py-3.5">Type</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Created Date</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCustomers.map((cust, idx) => {
                  const createdDate = cust.createdAt
                    ? new Date(cust.createdAt).toLocaleDateString('en-GB')
                    : '—';

                  return (
                    <tr
                      key={cust.customerCode || idx}
                      className="hover:bg-blue-50/30 transition-colors group"
                    >
                      <td className="px-4 py-3.5 text-center text-slate-400 font-mono">
                        {idx + 1}
                      </td>
                      <td className="px-4 py-3.5 font-mono font-bold text-blue-700">
                        {cust.customerCode}
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-slate-900">
                        {cust.fullName || '—'}
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 font-normal">
                        {cust.email || '—'}
                      </td>
                      <td className="px-4 py-3.5">
                        <CustomerTypeBadge type={cust.customerType} />
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={cust.status} />
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 font-mono">
                        {createdDate}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* 1. View Details */}
                          <button
                            type="button"
                            onClick={() => handleViewDetails(cust.customerCode)}
                            title="View Customer Details"
                            className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* 2. Edit Customer */}
                          <Link
                            to={`/customers/${encodeURIComponent(cust.customerCode)}/edit`}
                            title="Edit Customer Profile"
                            className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </Link>

                          {/* 3. Open Account Shortcut */}
                          <Link
                            to={`/accounts/new?customerCode=${encodeURIComponent(cust.customerCode)}`}
                            title="Open Account For This Customer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>Open Acct</span>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Customer Detail Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Customer Record Details"
        subtitle={selectedCustomer ? `CIF: ${selectedCustomer.customerCode}` : 'Loading...'}
        maxWidth="xl"
        footer={
          selectedCustomer && (
            <div className="flex items-center justify-between w-full">
              <Link
                to={`/customers/${encodeURIComponent(selectedCustomer.customerCode)}/edit`}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-blue-700"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Edit Profile
              </Link>
              <div className="flex items-center gap-2">
                <Link
                  to={`/accounts/new?customerCode=${encodeURIComponent(selectedCustomer.customerCode)}`}
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-xs"
                >
                  Open Retail Account
                </Link>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          )
        }
      >
        {modalLoading ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
            Loading customer specifications...
          </div>
        ) : selectedCustomer ? (
          <div className="space-y-5 text-xs">
            {/* Header Identity Badge */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
              <div>
                <div className="text-base font-bold text-slate-900">
                  {selectedCustomer.fullName}
                </div>
                <div className="text-xs text-slate-500 font-mono mt-0.5">
                  Code: <span className="font-bold text-blue-700">{selectedCustomer.customerCode}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <CustomerTypeBadge type={selectedCustomer.customerType} />
                <StatusBadge status={selectedCustomer.status} />
              </div>
            </div>

            {/* Profile Attributes Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-xl border border-slate-100 bg-white shadow-2xs">
                <span className="text-[11px] font-semibold text-slate-400 uppercase">
                  Primary Email
                </span>
                <p className="font-semibold text-slate-800 mt-0.5">
                  {selectedCustomer.email || selectedCustomer.officialEmail || '—'}
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-100 bg-white shadow-2xs">
                <span className="text-[11px] font-semibold text-slate-400 uppercase">
                  Phone Number
                </span>
                <p className="font-semibold text-slate-800 mt-0.5">
                  {selectedCustomer.phone || '—'}
                </p>
              </div>

              {/* Personal specific */}
              {selectedCustomer.customerType !== 'COMPANY' && (
                <>
                  <div className="p-3.5 rounded-xl border border-slate-100 bg-white shadow-2xs">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase">
                      NRC / National ID
                    </span>
                    <p className="font-mono font-bold text-slate-800 mt-0.5">
                      {selectedCustomer.nrc || '—'}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-100 bg-white shadow-2xs">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase">
                      Gender & Birthdate
                    </span>
                    <p className="font-semibold text-slate-800 mt-0.5">
                      {selectedCustomer.gender || '—'} | {selectedCustomer.dateOfBirth || '—'}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-100 bg-white shadow-2xs">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase">
                      Occupation
                    </span>
                    <p className="font-semibold text-slate-800 mt-0.5">
                      {selectedCustomer.occupation || '—'}
                    </p>
                  </div>
                </>
              )}

              {/* Company specific */}
              {selectedCustomer.customerType === 'COMPANY' && (
                <>
                  <div className="p-3.5 rounded-xl border border-slate-100 bg-white shadow-2xs">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase">
                      Registration Number
                    </span>
                    <p className="font-mono font-bold text-slate-800 mt-0.5">
                      {selectedCustomer.registrationNumber || '—'}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-100 bg-white shadow-2xs">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase">
                      Tax Identification (TIN)
                    </span>
                    <p className="font-mono font-bold text-slate-800 mt-0.5">
                      {selectedCustomer.taxId || '—'}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-100 bg-white shadow-2xs">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase">
                      Business Type
                    </span>
                    <p className="font-semibold text-slate-800 mt-0.5">
                      {selectedCustomer.businessType || '—'}
                    </p>
                  </div>
                </>
              )}

              <div className="p-3.5 rounded-xl border border-slate-100 bg-white shadow-2xs md:col-span-2">
                <span className="text-[11px] font-semibold text-slate-400 uppercase">
                  Registered Address
                </span>
                <p className="font-medium text-slate-800 mt-0.5">
                  {selectedCustomer.address || selectedCustomer.businessAddress || '—'}
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};

export default CustomerListView;
