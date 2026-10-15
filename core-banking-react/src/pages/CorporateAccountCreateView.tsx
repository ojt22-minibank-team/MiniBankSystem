import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Building2,
  Users2,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
} from 'lucide-react';
import { accountService } from '../services/accountService';
import type { CorporateAccountCreateDTO } from '../types/account.types';
import { useToast } from '../context/ToastContext';
import { Modal } from '../components/common/Modal';

export const CorporateAccountCreateView: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();

  const queryCompanyCode = searchParams.get('companyCustomerCode') || '';

  const [form, setForm] = useState<CorporateAccountCreateDTO>({
    companyCustomerCode: queryCompanyCode,
    ceoCustomerCode: '',
    accountantCustomerCode: '',
    accountType: 'CURRENT',
    currency: 'MMK',
    initialDeposit: 1000000,
  });

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [createdResult, setCreatedResult] = useState<{
    status: string;
    message: string;
    accountNumber: string;
  } | null>(null);

  const [copiedAccount, setCopiedAccount] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.companyCustomerCode.trim()) {
      toast.warning('Company Code Required', 'Please enter Company Customer Code.');
      return;
    }
    if (!form.ceoCustomerCode.trim()) {
      toast.warning('CEO Code Required', 'Please enter CEO / Approver Customer Code.');
      return;
    }
    if (!form.accountantCustomerCode.trim()) {
      toast.warning('Accountant Code Required', 'Please enter Accountant / Maker Customer Code.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await accountService.createCorporateAccount(form);

      toast.success(
        'Corporate Joint Account Opened!',
        `Account Number ${res.accountNumber} has been authorized.`
      );
      setCreatedResult(res);
    } catch (err: any) {
      toast.error(
        'Corporate Account Opening Failed',
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
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="pb-2 border-b border-slate-200">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          Corporate Joint Account Creation
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Open a multi-signatory Maker-Checker corporate banking account with CEO Approver and Accountant Initiator roles.
        </p>
      </div>

      {/* Maker-Checker Workflow Alert */}
      <div className="p-4 rounded-2xl bg-indigo-50/80 border border-indigo-200 flex items-start gap-3">
        <Users2 className="w-5 h-5 text-indigo-700 shrink-0 mt-0.5" />
        <div className="text-xs text-indigo-950 space-y-1">
          <div className="font-bold">Maker-Checker Dual Signatory Policy:</div>
          <p className="text-indigo-800 leading-relaxed">
            Corporate accounts require dual authorization:
            <br />
            • <strong>Accountant (Maker):</strong> Initiates corporate fund transfers and batch payroll entries.
            <br />
            • <strong>CEO (Checker / Approver):</strong> Approves, signs, and authorizes fund disbursements.
          </p>
        </div>
      </div>

      {/* Corporate Account Form */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 md:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
              1. Corporate Entity & Signatories CIF Identification
            </h3>

            {/* Company Customer Code */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">
                Company Customer Code <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. CUST-20261012-7834 (Corporate CIF)"
                value={form.companyCustomerCode}
                onChange={(e) => setForm({ ...form, companyCustomerCode: e.target.value })}
                className="w-full font-mono px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
              <p className="text-[10px] text-slate-400">
                The primary corporate legal entity registered in the system.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* CEO Customer Code */}
              <div className="space-y-1 p-4 rounded-xl bg-slate-50/80 border border-slate-200">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 mb-1">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span>CEO Customer Code (Approver / Checker) <span className="text-rose-500">*</span></span>
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. CUST-20261012-9011"
                  value={form.ceoCustomerCode}
                  onChange={(e) => setForm({ ...form, ceoCustomerCode: e.target.value })}
                  className="w-full font-mono px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Assigned as Primary Signatory Approver for all outgoing debits.
                </p>
              </div>

              {/* Accountant Customer Code */}
              <div className="space-y-1 p-4 rounded-xl bg-slate-50/80 border border-slate-200">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 mb-1">
                  <Users2 className="w-4 h-4 text-indigo-600" />
                  <span>Accountant Customer Code (Maker / Initiator) <span className="text-rose-500">*</span></span>
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. CUST-20261012-9022"
                  value={form.accountantCustomerCode}
                  onChange={(e) => setForm({ ...form, accountantCustomerCode: e.target.value })}
                  className="w-full font-mono px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Assigned as Joint Signatory Maker for transaction entries.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
              2. Corporate Ledger Specifications
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Account Type */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Account Type</label>
                <select
                  value={form.accountType}
                  onChange={(e) => setForm({ ...form, accountType: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-semibold"
                >
                  <option value="CURRENT">CURRENT (Standard Business Checking)</option>
                  <option value="SAVINGS">SAVINGS (Corporate Treasury Deposit)</option>
                </select>
              </div>

              {/* Currency */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Denomination Currency</label>
                <select
                  value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-mono font-semibold"
                >
                  <option value="MMK">MMK - Myanmar Kyat</option>
                  <option value="USD">USD - United States Dollar</option>
                </select>
              </div>

              {/* Initial Deposit */}
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-bold text-slate-700">Corporate Opening Balance</label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
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
              </div>
            </div>
          </div>

          {/* Form Submit */}
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
              className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 rounded-xl shadow-md shadow-indigo-900/20 transition-all cursor-pointer"
            >
              <Building2 className="w-4 h-4" />
              {submitting ? 'Authorizing Corporate Account...' : 'Open Corporate Joint Account'}
            </button>
          </div>
        </form>
      </div>

      {/* Success Modal */}
      <Modal
        isOpen={!!createdResult}
        onClose={() => setCreatedResult(null)}
        title="Corporate Joint Account Activated!"
        subtitle="Multi-Signatory Ledger Configured"
        maxWidth="md"
        footer={
          <div className="flex items-center justify-between w-full">
            <button
              type="button"
              onClick={() => {
                const accNum = createdResult?.accountNumber;
                setCreatedResult(null);
                navigate(`/accounts/deposit?accountNumber=${accNum}`);
              }}
              className="px-3.5 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl"
            >
              Credit Funds Now
            </button>
            <button
              type="button"
              onClick={() => {
                setCreatedResult(null);
                navigate('/accounts');
              }}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl"
            >
              Back to Accounts
            </button>
          </div>
        }
      >
        {createdResult && (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              <div>
                <div className="font-bold text-emerald-950 text-sm">
                  {createdResult.message || 'Corporate account created successfully'}
                </div>
                <div className="text-emerald-700 text-xs">
                  Company {form.companyCustomerCode} • Signatories configured
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-500 font-semibold uppercase text-[10px]">
                Authorized Corporate Account Number
              </span>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xl font-mono font-black text-indigo-700 tracking-wider">
                  {createdResult.accountNumber}
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(createdResult.accountNumber)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  {copiedAccount ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedAccount ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1.5">
              <div className="flex justify-between text-slate-600">
                <span>Primary Approver (CEO):</span>
                <span className="font-mono font-bold text-slate-900">{form.ceoCustomerCode}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Joint Maker (Accountant):</span>
                <span className="font-mono font-bold text-slate-900">{form.accountantCustomerCode}</span>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default CorporateAccountCreateView;
