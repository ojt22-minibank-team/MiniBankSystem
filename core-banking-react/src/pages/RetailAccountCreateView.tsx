import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  User,
  Search,
} from 'lucide-react';
import { accountService } from '../services/accountService';
import { customerService } from '../services/customerService';
import type { AccountCreateDTO, AccountResponseDTO } from '../types/account.types';
import type { CustomerDetailResponseDTO } from '../types/customer.types';
import { useToast } from '../context/ToastContext';
import { Modal } from '../components/common/Modal';

export const RetailAccountCreateView: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();

  const initialCustomerCode = searchParams.get('customerCode') || '';

  const [form, setForm] = useState<AccountCreateDTO>({
    customerCode: initialCustomerCode,
    accountType: 'SAVINGS',
    currency: 'MMK',
    initialDeposit: 100000,
  });

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [customerInfo, setCustomerInfo] = useState<CustomerDetailResponseDTO | null>(null);
  const [verifyingCustomer, setVerifyingCustomer] = useState<boolean>(false);
  const [customerError, setCustomerError] = useState<string | null>(null);

  // Success Modal
  const [createdAccount, setCreatedAccount] = useState<AccountResponseDTO | null>(null);
  const [copiedAccount, setCopiedAccount] = useState<boolean>(false);

  // Auto-verify when customerCode changes
  const verifyCustomer = async (codeToVerify: string) => {
    if (!codeToVerify.trim()) {
      setCustomerInfo(null);
      setCustomerError(null);
      return;
    }

    try {
      setVerifyingCustomer(true);
      setCustomerError(null);
      const data = await customerService.getCustomerByCode(codeToVerify.trim());
      setCustomerInfo(data);
    } catch {
      setCustomerInfo(null);
      setCustomerError('Customer code not found in CIF directory.');
    } finally {
      setVerifyingCustomer(false);
    }
  };

  useEffect(() => {
    if (initialCustomerCode) {
      setForm((prev) => ({ ...prev, customerCode: initialCustomerCode }));
      verifyCustomer(initialCustomerCode);
    }
  }, [initialCustomerCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.customerCode.trim()) {
      toast.warning('Customer Code Required', 'Please provide a valid Customer Code.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await accountService.createRetailAccount(form);

      toast.success(
        'Account Created Successfully!',
        `Account Number ${res.accountNumber} has been opened.`
      );
      setCreatedAccount(res);
    } catch (err: any) {
      toast.error(
        'Account Creation Failed',
        err.response?.data?.message || err.response?.data?.error || err.message
      );
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAccount(true);
    setTimeout(() => setCopiedAccount(false), 2000);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="pb-2 border-b border-slate-200">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          Retail Account Opening
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Open a new personal retail bank ledger (Savings or Current) for registered bank customers.
        </p>
      </div>

      {/* Auto-populated banner notification */}
      {initialCustomerCode && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="text-xs text-emerald-950">
            <span className="font-bold">Customer Auto-Populated:</span> Newly generated customer code{' '}
            <span className="font-mono font-bold text-emerald-700 bg-white px-1.5 py-0.5 rounded border border-emerald-300">
              {initialCustomerCode}
            </span>{' '}
            has been automatically pre-filled. Complete account specifications below.
          </div>
        </div>
      )}

      {/* Form Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 md:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer Code with Live Verification */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>Customer Code (CIF) <span className="text-rose-500">*</span></span>
              {verifyingCustomer && (
                <span className="text-[11px] text-blue-600 font-normal">Checking CIF records...</span>
              )}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                required
                placeholder="e.g. CUST-20261012-1001"
                value={form.customerCode}
                onChange={(e) => {
                  setForm({ ...form, customerCode: e.target.value });
                }}
                onBlur={() => verifyCustomer(form.customerCode)}
                className="flex-1 font-mono px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
              <button
                type="button"
                onClick={() => verifyCustomer(form.customerCode)}
                className="px-3.5 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Verify</span>
              </button>
            </div>

            {/* Verification Result Badge */}
            {customerInfo && (
              <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200/60 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-600" />
                  <div>
                    <span className="font-bold text-slate-900">{customerInfo.fullName}</span>
                    <span className="text-slate-500 text-[11px] ml-2">
                      ({customerInfo.customerType} • {customerInfo.phone})
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  CIF Verified
                </span>
              </div>
            )}

            {customerError && (
              <p className="text-[11px] text-rose-600 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {customerError}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Account Type */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">
                Account Type <span className="text-rose-500">*</span>
              </label>
              <select
                value={form.accountType}
                onChange={(e) => setForm({ ...form, accountType: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium"
              >
                <option value="SAVINGS">SAVINGS (Interest Bearing)</option>
                <option value="CURRENT">CURRENT (Checking / Operational)</option>
              </select>
              <p className="text-[10px] text-slate-400">
                Savings accounts calculate daily accrued interest.
              </p>
            </div>

            {/* Currency */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">
                Denomination Currency <span className="text-rose-500">*</span>
              </label>
              <select
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-mono font-medium"
              >
                <option value="MMK">MMK - Myanmar Kyat</option>
                <option value="USD">USD - United States Dollar</option>
              </select>
            </div>

            {/* Initial Deposit */}
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-bold text-slate-700">
                Initial Opening Deposit <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  placeholder="0.00"
                  value={form.initialDeposit}
                  onChange={(e) =>
                    setForm({ ...form, initialDeposit: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full pl-3.5 pr-16 py-2.5 text-xs font-mono font-bold rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 font-mono">
                  {form.currency}
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                Opening amount will be automatically credited to the new ledger balance upon activation.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate('/accounts')}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 rounded-xl shadow-md shadow-blue-900/20 transition-all cursor-pointer"
            >
              <CreditCard className="w-4 h-4" />
              {submitting ? 'Generating Account...' : 'Open Retail Account'}
            </button>
          </div>
        </form>
      </div>

      {/* Account Created Success Modal */}
      <Modal
        isOpen={!!createdAccount}
        onClose={() => setCreatedAccount(null)}
        title="Retail Account Opened!"
        subtitle="Core Banking Ledger Successfully Generated"
        maxWidth="md"
        footer={
          <div className="flex items-center justify-between w-full">
            <button
              type="button"
              onClick={() => {
                const accNum = createdAccount?.accountNumber;
                setCreatedAccount(null);
                navigate(`/accounts/deposit?accountNumber=${accNum}`);
              }}
              className="px-3.5 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl"
            >
              Deposit Funds Now
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setCreatedAccount(null);
                  navigate('/accounts');
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Go to Accounts Directory
              </button>
            </div>
          </div>
        }
      >
        {createdAccount && (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              <div>
                <div className="font-bold text-emerald-950 text-sm">
                  {createdAccount.accountType} Account Operational
                </div>
                <div className="text-emerald-700 text-xs">
                  Assigned to Customer {createdAccount.customerCode}
                </div>
              </div>
            </div>

            {/* Account Number Box */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-500 font-semibold uppercase text-[10px]">
                Generated Account Number
              </span>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xl font-mono font-black text-blue-700 tracking-wider">
                  {createdAccount.accountNumber}
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(createdAccount.accountNumber)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  {copiedAccount ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedAccount ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>

            {/* Initial Balance */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl border border-slate-200 bg-white">
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Initial Balance</span>
                <div className="font-mono font-bold text-slate-900 text-sm mt-0.5">
                  {createdAccount.currentBalance?.toLocaleString()} {createdAccount.currency}
                </div>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 bg-white">
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Ledger Status</span>
                <div className="font-bold text-emerald-600 text-sm mt-0.5">
                  ● {createdAccount.status}
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default RetailAccountCreateView;
