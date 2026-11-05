import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, LayoutDashboard, ShieldCheck, Printer, ReceiptText } from 'lucide-react';
import { EkarajCrown } from '../../../components/common/EkarajLogo';
import type { PaymentReceipt as ReceiptType, PaymentDetails } from '../types/merchantPayment';

interface Props {
  receipt: ReceiptType;
  details: PaymentDetails;
  selectedAccount: string;
}

export const PaymentReceipt: React.FC<Props> = ({ receipt, details, selectedAccount }) => {
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-lg space-y-6">
      {/* EKARAJ Brand Header */}
      <div className="flex items-center gap-3.5 border-b border-slate-200/80 dark:border-slate-800 pb-5">
        <EkarajCrown size={42} />
        <div>
          <h1 className="text-xl font-bold text-[#0A192F] dark:text-white">EKARAJ BANK</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Merchant Payment Receipt</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0A192F] p-6 sm:p-8 shadow-xs text-center transition-colors">
        {/* Success Icon */}
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-7 w-7" />
        </div>

        {/* Status Badge */}
        <div className="mb-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/50">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Payment Completed
          </span>
        </div>
        
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Payment Successful</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
          Your payment has been processed and settled with the merchant.
        </p>
        
        {/* Receipt Details Card */}
        <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50 p-4 space-y-3 text-sm text-left mb-6">
          <div className="flex justify-between items-center border-b border-slate-200/60 dark:border-slate-800 pb-2.5">
            <span className="text-slate-500 dark:text-slate-400 text-xs font-medium">Merchant</span>
            <span className="font-semibold text-slate-900 dark:text-white">{details.merchantName}</span>
          </div>
          {details.orderId && (
            <div className="flex justify-between items-center border-b border-slate-200/60 dark:border-slate-800 pb-2.5">
              <span className="text-slate-500 dark:text-slate-400 text-xs font-medium">Order Reference</span>
              <span className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">{details.orderId}</span>
            </div>
          )}
          <div className="flex justify-between items-center border-b border-slate-200/60 dark:border-slate-800 pb-2.5">
            <span className="text-slate-500 dark:text-slate-400 text-xs font-medium">Amount Paid</span>
            <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">{receipt.amount.toLocaleString()} {receipt.currency}</span>
          </div>
          <div className="flex justify-between items-center border-b border-slate-200/60 dark:border-slate-800 pb-2.5">
            <span className="text-slate-500 dark:text-slate-400 text-xs font-medium">Paid From</span>
            <span className="font-mono text-xs text-slate-800 dark:text-slate-200">****{selectedAccount.slice(-4)} (CURRENT)</span>
          </div>
          <div className="flex justify-between items-center border-b border-slate-200/60 dark:border-slate-800 pb-2.5">
            <span className="text-slate-500 dark:text-slate-400 text-xs font-medium">Transaction Reference</span>
            <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">{receipt.coreLedgerReference || 'AUTH-SUCCESS'}</span>
          </div>
          <div className="flex justify-between items-center pt-0.5">
            <span className="text-slate-500 dark:text-slate-400 text-xs font-medium">Date & Time</span>
            <span className="text-xs text-slate-800 dark:text-slate-200">
              {new Date(receipt.timestamp).toLocaleString('en-GB', { 
                day: '2-digit', 
                month: 'short', 
                year: 'numeric', 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </span>
          </div>
        </div>

        {/* Settlement Callout */}
        <div className="rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800 p-3.5 flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-400 mb-6 text-left">
          <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <span>Funds have been debited from your account. This transaction is now recorded in your Transaction History.</span>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button 
            type="button"
            onClick={() => navigate('/dashboard')} 
            className="w-full flex items-center justify-center gap-2 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-[#00A3C4] to-[#0284C7] hover:from-[#0891B2] hover:to-[#0369A1] shadow-md shadow-cyan-500/25 active:scale-[0.98] py-3.5 transition-all cursor-pointer"
          >
            <LayoutDashboard className="h-4 w-4" />
            Done & Return to Dashboard
          </button>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => navigate("/accounts", { state: { accountNumber: selectedAccount } })}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 font-medium py-3 transition-colors text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ReceiptText className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              View Account Activity
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 font-medium py-3 transition-colors text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Printer className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              Print / Save PDF
            </button>
          </div>

          <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center">
            Official bank statement and transaction receipt will be available under <span className="font-medium text-slate-600 dark:text-slate-300">Transaction History</span> upon ledger settlement.
          </p>
        </div>
      </div>
    </div>
  );
};
