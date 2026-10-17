import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  Search,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { accountService } from '../services/accountService';
import type { AccountResponseDTO, AccountStatusUpdateDTO } from '../types/account.types';
import { useToast } from '../context/ToastContext';
import { StatusBadge } from '../components/common/Badge';

export const AccountStatusView: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();

  const queryAccount = searchParams.get('accountNumber') || '';

  const [accountNumber, setAccountNumber] = useState<string>(queryAccount);
  const [status, setStatus] = useState<'ACTIVE' | 'FROZEN' | 'CLOSED'>('FROZEN');
  const [reason, setReason] = useState<string>('Suspicious counter transaction inquiry');

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [inquiryAccount, setInquiryAccount] = useState<AccountResponseDTO | null>(null);
  const [inquiryLoading, setInquiryLoading] = useState<boolean>(false);
  const [inquiryError, setInquiryError] = useState<string | null>(null);

  const lookupAccount = async () => {
    if (!accountNumber.trim()) return;
    try {
      setInquiryLoading(true);
      setInquiryError(null);
      const acc = await accountService.getAccountByNumber(accountNumber.trim());
      setInquiryAccount(acc);
      // Pre-set target status recommendation
      if (acc.status === 'FROZEN') {
        setStatus('ACTIVE');
      } else {
        setStatus('FROZEN');
      }
    } catch {
      setInquiryAccount(null);
      setInquiryError(`Account number ${accountNumber} was not found.`);
    } finally {
      setInquiryLoading(false);
    }
  };

  useEffect(() => {
    if (queryAccount) {
      setAccountNumber(queryAccount);
      lookupAccount();
    }
  }, [queryAccount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!accountNumber.trim()) {
      toast.warning('Account Number Required', 'Please enter target Account Number.');
      return;
    }
    if (!reason.trim()) {
      toast.warning('Audit Reason Required', 'Please supply an audit reason for changing account status.');
      return;
    }

    try {
      setSubmitting(true);
      const payload: AccountStatusUpdateDTO = {
        status,
        reason: reason.trim(),
      };

      const updated = await accountService.updateAccountStatus(accountNumber.trim(), payload);

      toast.success(
        'Account Status Updated!',
        `Account ${accountNumber} status changed to ${status}.`
      );
      setInquiryAccount(updated);
    } catch (err: any) {
      toast.error(
        'Status Update Failed',
        err.response?.data?.message || err.response?.data?.error || err.message
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="pb-2 border-b border-slate-200">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          Account Status Management
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Modify operational status (ACTIVE, FROZEN, CLOSED) with mandatory compliance audit note.
        </p>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 md:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Account Number Lookup */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">
              Target Account Number <span className="text-rose-500">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                required
                placeholder="e.g. ACC-20261012-4501"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                onBlur={lookupAccount}
                className="flex-1 font-mono px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
              <button
                type="button"
                onClick={lookupAccount}
                disabled={inquiryLoading}
                className="px-4 py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1.5"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Verify Account</span>
              </button>
            </div>
          </div>

          {/* Inquiry Live Preview */}
          {inquiryLoading && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
              Retrieving account status ledger...
            </div>
          )}

          {inquiryError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{inquiryError}</span>
            </div>
          )}

          {inquiryAccount && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Current Account State
                </span>
                <StatusBadge status={inquiryAccount.status} />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase">Account Holder</span>
                  <div className="font-semibold text-slate-900 mt-0.5">
                    {inquiryAccount.customerName || inquiryAccount.customerCode}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase">Ledger Type</span>
                  <div className="font-semibold text-slate-800 mt-0.5">
                    {inquiryAccount.accountType} ({inquiryAccount.currency})
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase">Ledger Balance</span>
                  <div className="font-mono font-black text-slate-900 mt-0.5">
                    {inquiryAccount.currentBalance?.toLocaleString()} {inquiryAccount.currency}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Target Status Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700">
              Target Operational Status <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* ACTIVE */}
              <label
                className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  status === 'ACTIVE'
                    ? 'border-emerald-500 bg-emerald-50/70 text-emerald-950 font-bold'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="status"
                  value="ACTIVE"
                  checked={status === 'ACTIVE'}
                  onChange={() => setStatus('ACTIVE')}
                  className="accent-emerald-600"
                />
                <div>
                  <div className="text-xs font-bold">ACTIVE</div>
                  <div className="text-[10px] text-slate-500 font-normal">Normal operations</div>
                </div>
              </label>

              {/* FROZEN */}
              <label
                className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  status === 'FROZEN'
                    ? 'border-amber-500 bg-amber-50/70 text-amber-950 font-bold'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="status"
                  value="FROZEN"
                  checked={status === 'FROZEN'}
                  onChange={() => setStatus('FROZEN')}
                  className="accent-amber-600"
                />
                <div>
                  <div className="text-xs font-bold">FROZEN</div>
                  <div className="text-[10px] text-slate-500 font-normal">Debits suspended</div>
                </div>
              </label>

              {/* CLOSED */}
              <label
                className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  status === 'CLOSED'
                    ? 'border-rose-500 bg-rose-50/70 text-rose-950 font-bold'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="status"
                  value="CLOSED"
                  checked={status === 'CLOSED'}
                  onChange={() => setStatus('CLOSED')}
                  className="accent-rose-600"
                />
                <div>
                  <div className="text-xs font-bold">CLOSED</div>
                  <div className="text-[10px] text-slate-500 font-normal">Permanent closure</div>
                </div>
              </label>
            </div>
          </div>

          {/* Audit Reason */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">
              Audit Justification / Note <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              required
              placeholder="e.g. Suspicious counter transaction inquiry / Customer requested account closure"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            />
            <p className="text-[10px] text-slate-400">
              This reason will be logged in the immutable banking security audit trail.
            </p>
          </div>

          {/* Submit */}
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
              <ShieldAlert className="w-4 h-4" />
              {submitting ? 'Updating Status...' : 'Apply Status Change'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AccountStatusView;
