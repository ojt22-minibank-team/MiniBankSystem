import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  ArrowDownCircle,
  Search,
  AlertTriangle,
  Printer,
  RefreshCw,
} from 'lucide-react';
import { accountService } from '../services/accountService';
import type { AccountResponseDTO, DepositRequestDTO } from '../types/account.types';
import { useToast } from '../context/ToastContext';
import { Modal } from '../components/common/Modal';
import { StatusBadge } from '../components/common/Badge';

export const DepositFundsView: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();

  const queryAccount = searchParams.get('accountNumber') || '';
  const queryCustomer = searchParams.get('customerCode') || '';

  // Mode: 'ACCOUNT_NUMBER' | 'CUSTOMER_CODE'
  const [lookupMode, setLookupMode] = useState<'ACCOUNT_NUMBER' | 'CUSTOMER_CODE'>(
    queryCustomer ? 'CUSTOMER_CODE' : 'ACCOUNT_NUMBER'
  );

  const [accountNumber, setAccountNumber] = useState<string>(queryAccount);
  const [customerCode, setCustomerCode] = useState<string>(queryCustomer);
  const [amount, setAmount] = useState<string>('50000');
  const [remarks, setRemarks] = useState<string>('Counter Cash Deposit');

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [inquiryAccount, setInquiryAccount] = useState<AccountResponseDTO | null>(null);
  const [inquiryLoading, setInquiryLoading] = useState<boolean>(false);
  const [inquiryError, setInquiryError] = useState<string | null>(null);

  // Success Receipt Modal
  const [receipt, setReceipt] = useState<{
    account: AccountResponseDTO;
    depositAmount: number;
    remarks: string;
    timestamp: string;
  } | null>(null);

  // Inquiry Helper
  const runInquiry = async () => {
    setInquiryError(null);
    setInquiryAccount(null);

    if (lookupMode === 'ACCOUNT_NUMBER') {
      if (!accountNumber.trim()) return;
      try {
        setInquiryLoading(true);
        const acc = await accountService.getAccountByNumber(accountNumber.trim());
        setInquiryAccount(acc);
      } catch {
        setInquiryError(`Account number ${accountNumber} not found.`);
      } finally {
        setInquiryLoading(false);
      }
    } else {
      if (!customerCode.trim()) return;
      try {
        setInquiryLoading(true);
        const accs = await accountService.getAccountsByCustomerCode(customerCode.trim());
        if (accs && accs.length > 0) {
          setInquiryAccount(accs[0]);
          setAccountNumber(accs[0].accountNumber);
        } else {
          setInquiryError(`No active bank accounts found for customer ${customerCode}.`);
        }
      } catch {
        setInquiryError(`Failed to fetch accounts for customer ${customerCode}.`);
      } finally {
        setInquiryLoading(false);
      }
    }
  };

  useEffect(() => {
    if (queryAccount) {
      setAccountNumber(queryAccount);
      setLookupMode('ACCOUNT_NUMBER');
      runInquiry();
    } else if (queryCustomer) {
      setCustomerCode(queryCustomer);
      setLookupMode('CUSTOMER_CODE');
      runInquiry();
    }
  }, [queryAccount, queryCustomer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const depositVal = parseFloat(amount);
    if (!depositVal || depositVal <= 0) {
      toast.warning('Invalid Amount', 'Deposit amount must be a positive number.');
      return;
    }

    if (lookupMode === 'ACCOUNT_NUMBER' && !accountNumber.trim()) {
      toast.warning('Account Number Required', 'Please enter destination Account Number.');
      return;
    }

    if (lookupMode === 'CUSTOMER_CODE' && !customerCode.trim()) {
      toast.warning('Customer Code Required', 'Please enter target Customer Code.');
      return;
    }

    try {
      setSubmitting(true);
      const payload: DepositRequestDTO = {
        amount: depositVal,
        remarks: remarks.trim() || 'Counter Cash Deposit',
      };

      if (lookupMode === 'ACCOUNT_NUMBER') {
        payload.accountNumber = accountNumber.trim();
      } else {
        payload.customerCode = customerCode.trim();
      }

      const updatedAccount = await accountService.depositFunds(payload);

      toast.success(
        'Deposit Completed Successfully!',
        `${depositVal.toLocaleString()} ${updatedAccount.currency || 'MMK'} credited to account.`
      );

      setReceipt({
        account: updatedAccount,
        depositAmount: depositVal,
        remarks: remarks.trim() || 'Counter Cash Deposit',
        timestamp: new Date().toLocaleString(),
      });

      // Update inquiry card
      setInquiryAccount(updatedAccount);
    } catch (err: any) {
      toast.error(
        'Deposit Failed',
        err.response?.data?.message || err.response?.data?.error || err.message
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="pb-2 border-b border-slate-200">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          Counter Cash Deposit
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Perform in-branch cash deposit into customer retail or corporate accounts via Account Number or Customer Code.
        </p>
      </div>

      {/* Main Form Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 md:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Lookup Mode Switcher */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-2">
              Deposit Destination Identifier
            </label>
            <div className="flex bg-slate-100 p-1 rounded-xl max-w-sm">
              <button
                type="button"
                onClick={() => {
                  setLookupMode('ACCOUNT_NUMBER');
                  setInquiryAccount(null);
                  setInquiryError(null);
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  lookupMode === 'ACCOUNT_NUMBER'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                By Account Number
              </button>
              <button
                type="button"
                onClick={() => {
                  setLookupMode('CUSTOMER_CODE');
                  setInquiryAccount(null);
                  setInquiryError(null);
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  lookupMode === 'CUSTOMER_CODE'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                By Customer Code
              </button>
            </div>
          </div>

          {/* Identifier Input with Inquiry Button */}
          {lookupMode === 'ACCOUNT_NUMBER' ? (
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">
                Destination Account Number <span className="text-rose-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  placeholder="e.g. ACC-20261012-4501"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  onBlur={runInquiry}
                  className="flex-1 font-mono px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
                <button
                  type="button"
                  onClick={runInquiry}
                  disabled={inquiryLoading}
                  className="px-4 py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Check Balance</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">
                Customer Code (CIF) <span className="text-rose-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  placeholder="e.g. CUST-20261012-1001"
                  value={customerCode}
                  onChange={(e) => setCustomerCode(e.target.value)}
                  onBlur={runInquiry}
                  className="flex-1 font-mono px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
                <button
                  type="button"
                  onClick={runInquiry}
                  disabled={inquiryLoading}
                  className="px-4 py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Check Accounts</span>
                </button>
              </div>
            </div>
          )}

          {/* Inquiry Live Result Preview */}
          {inquiryLoading && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
              Verifying bank ledger status...
            </div>
          )}

          {inquiryError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{inquiryError}</span>
            </div>
          )}

          {inquiryAccount && (
            <div className="p-4 rounded-xl bg-blue-50/80 border border-blue-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800">
                  Target Account Verified
                </span>
                <StatusBadge status={inquiryAccount.status} />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase">Account Number</span>
                  <div className="font-mono font-bold text-slate-900 mt-0.5">
                    {inquiryAccount.accountNumber}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase">Holder / Code</span>
                  <div className="font-semibold text-slate-800 mt-0.5">
                    {inquiryAccount.customerName || inquiryAccount.customerCode}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase">Current Balance</span>
                  <div className="font-mono font-black text-blue-900 mt-0.5">
                    {inquiryAccount.currentBalance?.toLocaleString()} {inquiryAccount.currency}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Amount & Remarks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">
                Deposit Amount <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="100"
                  step="any"
                  required
                  placeholder="50000.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-3.5 pr-14 py-2.5 text-sm font-mono font-black rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-900"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 font-mono">
                  {inquiryAccount?.currency || 'MMK'}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Transaction Remarks</label>
              <input
                type="text"
                placeholder="e.g. Counter Cash Deposit"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            </div>
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
              className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 rounded-xl shadow-md shadow-emerald-900/20 transition-all cursor-pointer"
            >
              <ArrowDownCircle className="w-4 h-4" />
              {submitting ? 'Processing Inward Credit...' : 'Confirm Cash Deposit'}
            </button>
          </div>
        </form>
      </div>

      {/* Official Bank Deposit Receipt Voucher Modal */}
      <Modal
        isOpen={!!receipt}
        onClose={() => setReceipt(null)}
        title="Counter Deposit Receipt Voucher"
        subtitle="Core Banking Credit Confirmation"
        maxWidth="md"
        footer={
          <div className="flex items-center justify-between w-full">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Voucher
            </button>
            <button
              type="button"
              onClick={() => setReceipt(null)}
              className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs"
            >
              Done
            </button>
          </div>
        }
      >
        {receipt && (
          <div className="space-y-4 text-xs font-mono">
            {/* Header Voucher Banner */}
            <div className="text-center pb-3 border-b border-dashed border-slate-300">
              <div className="text-sm font-black text-slate-900 font-sans tracking-wider uppercase">
                ACE BANK CORE BANKING SYSTEM
              </div>
              <div className="text-[10px] text-slate-500 font-sans">
                Group 2 Staff Counter Receipt • {receipt.timestamp}
              </div>
            </div>

            {/* Receipt Summary Table */}
            <div className="space-y-2 py-2 border-b border-dashed border-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">Account Number:</span>
                <span className="font-bold text-slate-900">{receipt.account.accountNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">Customer CIF:</span>
                <span className="font-bold text-slate-900">{receipt.account.customerCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">Account Type:</span>
                <span className="text-slate-800">{receipt.account.accountType}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-bold text-sm pt-1">
                <span className="font-sans">Deposit Amount:</span>
                <span>
                  +{receipt.depositAmount.toLocaleString()} {receipt.account.currency}
                </span>
              </div>
              <div className="flex justify-between text-blue-900 font-bold text-sm pt-1">
                <span className="font-sans">New Balance:</span>
                <span>
                  {receipt.account.currentBalance?.toLocaleString()} {receipt.account.currency}
                </span>
              </div>
              <div className="flex justify-between text-slate-500 pt-1">
                <span className="font-sans">Remarks:</span>
                <span>{receipt.remarks}</span>
              </div>
            </div>

            <div className="text-center text-[10px] text-slate-400 font-sans pt-1">
              Thank you for banking with ACE Bank. Transaction authorized.
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default DepositFundsView;
