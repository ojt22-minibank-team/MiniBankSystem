import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  RefreshCw,
  Building2,
  User,
  ShieldAlert,
} from 'lucide-react';
import { customerService } from '../services/customerService';
import type { CustomerDetailResponseDTO, CustomerUpdateDTO } from '../types/customer.types';
import { StatusBadge, CustomerTypeBadge } from '../components/common/Badge';
import { useToast } from '../context/ToastContext';

export const CustomerEditView: React.FC = () => {
  const { customerCode } = useParams<{ customerCode: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [customer, setCustomer] = useState<CustomerDetailResponseDTO | null>(null);

  // Editable Form Fields
  const [form, setForm] = useState<CustomerUpdateDTO>({
    phone: '',
    email: '',
    address: '',
    occupation: '',
    businessType: '',
    status: 'ACTIVE',
  });

  useEffect(() => {
    if (!customerCode) return;

    const fetchDetail = async () => {
      try {
        setLoading(true);
        const data = await customerService.getCustomerByCode(customerCode);
        setCustomer(data);
        setForm({
          phone: data.phone || '',
          email: data.email || data.officialEmail || '',
          address: data.address || data.businessAddress || '',
          occupation: data.occupation || '',
          businessType: data.businessType || '',
          status: data.status || 'ACTIVE',
        });
      } catch (err: any) {
        toast.error('Failed to load customer record', err.response?.data?.message || err.message);
        navigate('/customers');
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [customerCode, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerCode) return;

    try {
      setSaving(true);
      await customerService.updateCustomer(customerCode, form);

      // If status changed and KYC endpoint needed:
      if (form.status && form.status !== customer?.status) {
        try {
          await customerService.updateKycStatus(customerCode, form.status as any);
        } catch {
          // ignore if status already synced
        }
      }

      toast.success(
        'Customer Profile Updated',
        `Changes to customer ${customerCode} have been saved successfully.`
      );
      navigate('/customers');
    } catch (err: any) {
      toast.error(
        'Update Failed',
        err.response?.data?.message || err.response?.data?.error || err.message
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-3" />
        <p className="text-xs text-slate-500 font-medium">Fetching customer profile from Core Banking...</p>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
        <ShieldAlert className="w-8 h-8 text-rose-500 mx-auto mb-2" />
        <h3 className="text-sm font-bold text-slate-800">Customer Record Not Found</h3>
        <button
          type="button"
          onClick={() => navigate('/customers')}
          className="mt-4 px-4 py-2 text-xs font-bold text-white bg-blue-600 rounded-xl"
        >
          Return to Customer List
        </button>
      </div>
    );
  }

  const isCompany = customer.customerType?.toUpperCase() === 'COMPANY';

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/customers')}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Edit Customer Profile
            </h1>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Customer Code: <span className="font-bold text-blue-700">{customerCode}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <CustomerTypeBadge type={customer.customerType} />
          <StatusBadge status={customer.status} />
        </div>
      </div>

      {/* Readonly Summary Card */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
            {isCompany ? <Building2 className="w-5 h-5" /> : <User className="w-5 h-5" />}
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900">{customer.fullName}</div>
            <div className="text-xs text-slate-500">
              {isCompany
                ? `Reg No: ${customer.registrationNumber || 'N/A'} • TIN: ${customer.taxId || 'N/A'}`
                : `NRC: ${customer.nrc || 'N/A'} • DOB: ${customer.dateOfBirth || 'N/A'}`}
            </div>
          </div>
        </div>
      </div>

      {/* Editable Form */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 md:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Phone */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Phone Number</label>
              <input
                type="text"
                required
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            </div>

            {/* Email */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Email Address</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            </div>

            {/* Occupation (Personal) or Business Type (Company) */}
            {isCompany ? (
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-bold text-slate-700">Business Type / Industry</label>
                <input
                  type="text"
                  value={form.businessType}
                  onChange={(e) => setForm({ ...form, businessType: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>
            ) : (
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-bold text-slate-700">Occupation / Profession</label>
                <input
                  type="text"
                  value={form.occupation}
                  onChange={(e) => setForm({ ...form, occupation: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>
            )}

            {/* Status */}
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-bold text-slate-700">Account KYC & Profile Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              >
                <option value="ACTIVE">ACTIVE (Verified Operational)</option>
                <option value="PENDING">PENDING (Verification In Progress)</option>
                <option value="SUSPENDED">SUSPENDED (Temporarily Blocked)</option>
                <option value="REJECTED">REJECTED (Non-compliant KYC)</option>
              </select>
            </div>

            {/* Address */}
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-bold text-slate-700">Residential / Business Address</label>
              <textarea
                rows={3}
                required
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate('/customers')}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 rounded-xl shadow-md shadow-blue-900/20 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving Changes...' : 'Save Customer Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CustomerEditView;
