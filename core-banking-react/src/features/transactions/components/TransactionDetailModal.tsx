import { useState, useEffect } from 'react';
import {
  X,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  CreditCard,
} from 'lucide-react';
import type { StaffTransactionDetail } from '../../../types/transactions.types';
import { formatCurrency } from '../../../utils/formatCurrency';
import { formatDateTime } from '../../../utils/formatDate';

interface Props {
  transaction: StaffTransactionDetail | null;
  isOpen: boolean;
  onClose: () => void;
  isLoading?: boolean;
}

export default function TransactionDetailModal({
  transaction,
  isOpen,
  onClose,
  isLoading = false,
}: Props) {
  const [copiedRef, setCopiedRef] = useState(false);

  // Close on ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            COMPLETED
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            {status}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4.5 bg-gradient-to-r from-slate-900 to-slate-800 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/10 backdrop-blur-md">
              <ShieldCheck className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                Transaction Detail
              </h3>
              <p className="text-xs text-slate-300">
                Core Banking Immutable Ledger Audit Record
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        {isLoading || !transaction ? (
          <div className="p-12 flex flex-col items-center justify-center text-slate-400 gap-3">
            <div className="h-10 w-10 rounded-full border-2 border-sky-500/20 border-t-sky-600 animate-spin" />
            <span className="text-xs font-semibold text-slate-500">
              Loading transaction audit data...
            </span>
          </div>
        ) : (
          <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
            {/* Top Overview Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">
                  Transaction Reference
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono font-bold text-slate-900">
                    {transaction.transactionRef}
                  </span>
                  <button
                    onClick={() => handleCopy(transaction.transactionRef)}
                    className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors cursor-pointer"
                    title="Copy reference"
                  >
                    {copiedRef ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <span className="text-xs px-2.5 py-1 rounded-lg bg-slate-200/80 text-slate-700 font-semibold uppercase tracking-wider">
                  {transaction.channel}
                </span>
                {getStatusBadge(transaction.status)}
              </div>
            </div>

            {/* Amount & Fee Banner */}
            <div className="p-4.5 rounded-2xl bg-gradient-to-br from-blue-50/80 via-white to-sky-50/50 border border-blue-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Transaction Amount ({transaction.transactionType})
                </span>
                <div className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                  {formatCurrency(transaction.amount, transaction.currency)}
                </div>
                {transaction.serviceFee > 0 && (
                  <div className="text-xs text-slate-500 mt-1">
                    {transaction.transactionType === 'EXTERNAL_PAYMENT' ? (
                      <span>
                        Service Fee: {formatCurrency(transaction.serviceFee, transaction.currency)}{' '}
                        <span className="text-amber-600 font-semibold">(By Merchant)</span>
                      </span>
                    ) : (
                      <span>Service Fee: +{formatCurrency(transaction.serviceFee, transaction.currency)}</span>
                    )}
                  </div>
                )}
              </div>

              {transaction.transactionType === 'EXTERNAL_PAYMENT' ? (
                <div className="sm:text-right">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Merchant Net
                  </span>
                  <div className="text-2xl font-black text-emerald-600 tracking-tight mt-0.5">
                    {formatCurrency(
                      transaction.netCreditAmount ?? (transaction.amount - transaction.serviceFee),
                      transaction.currency
                    )}
                  </div>
                </div>
              ) : (
                transaction.totalDebited > 0 && (
                  <div className="sm:text-right">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Total Ledger Debit
                    </span>
                    <div className="text-lg font-bold text-slate-800">
                      {formatCurrency(transaction.totalDebited, transaction.currency)}
                    </div>
                  </div>
                )
              )}
            </div>

            {/* Source & Destination Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Source Account Card */}
              <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-2">
                <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                  <CreditCard className="w-4 h-4 text-blue-600" />
                  <span>Origin / Debited Account</span>
                </div>
                {transaction.sourceAccountNo ? (
                  <div>
                    <span className="text-sm font-mono font-bold text-slate-900 block">
                      {transaction.sourceAccountNo}
                    </span>
                    <span className="text-xs text-slate-600 block">
                      {transaction.sourceCustomerName || 'Internal Core Account'}
                    </span>
                    {transaction.sourceCustomerCode && (
                      <span className="text-[11px] text-slate-400 block font-mono">
                        Customer: {transaction.sourceCustomerCode}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 italic py-1">
                    Counter Cash
                  </div>
                )}
              </div>

              {/* Destination Account Card */}
              <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-2">
                <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  <span>Beneficiary / Credited Account</span>
                </div>
                {transaction.destAccountNo ? (
                  <div>
                    <span className="text-sm font-mono font-bold text-slate-900 block">
                      {transaction.destAccountNo}
                    </span>
                    <span className="text-xs text-slate-600 block">
                      {transaction.destCustomerName || 'Internal Core Account'}
                    </span>
                    {transaction.destCustomerCode && (
                      <span className="text-[11px] text-slate-400 block font-mono">
                        Customer: {transaction.destCustomerCode}
                      </span>
                    )}
                    {transaction.transactionType === 'EXTERNAL_PAYMENT' && transaction.serviceFee > 0 && (
                      <div className="mt-2 pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-medium">Net Credited:</span>
                        <span className="font-bold text-emerald-600 font-mono">
                          {formatCurrency(transaction.netCreditAmount ?? (transaction.amount - transaction.serviceFee), transaction.currency)}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 italic py-1">
                    Counter Cash
                  </div>
                )}
              </div>
            </div>

            {/* Timestamps & Initiator Metadata */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-slate-50/60 p-4 rounded-2xl border border-slate-200/60">
              <div>
                <span className="text-slate-400 block text-[11px]">Initiated At</span>
                <span className="font-semibold text-slate-800">
                  {formatDateTime(transaction.initiatedAt)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Completed At</span>
                <span className="font-semibold text-slate-800">
                  {transaction.completedAt ? formatDateTime(transaction.completedAt) : '—'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Initiated By</span>
                <span className="font-semibold text-slate-800">
                  {transaction.initiatedByName} ({transaction.initiatedByType})
                </span>
              </div>
            </div>

            {/* Audit Notes / Failure Details */}
            {transaction.auditNote && (
              <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/80 text-xs">
                <span className="font-bold text-slate-700 block mb-0.5">Audit Note:</span>
                <span className="text-slate-600 font-mono text-[11px]">{transaction.auditNote}</span>
              </div>
            )}

            {(transaction.failureCode || transaction.failureMessage) && (
              <div className="p-3.5 rounded-2xl border border-rose-200 bg-rose-50/60 text-xs text-rose-800">
                <span className="font-bold block mb-1">Failure Diagnostic:</span>
                <div className="space-y-0.5 font-mono text-[11px]">
                  {transaction.failureCode && (
                    <div>
                      <span className="font-semibold">Code:</span> {transaction.failureCode}
                    </div>
                  )}
                  {transaction.failureMessage && (
                    <div>
                      <span className="font-semibold">Message:</span> {transaction.failureMessage}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Review / Managerial Overrides History */}
            {transaction.reviewHistory && transaction.reviewHistory.length > 0 && (
              <div className="p-4 rounded-2xl border border-amber-200/90 bg-amber-50/50">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-xs mb-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Managerial Review & Override Audit Trail</span>
                </div>
                <div className="space-y-2">
                  {transaction.reviewHistory.map((rev, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-white/80 border border-amber-200 text-xs text-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div>
                        <span className="font-bold text-amber-800 mr-2">
                          {rev.action}
                        </span>
                        <span>{rev.reason || rev.resolutionNote || 'Administrative Action'}</span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {rev.performedByStaff} • {formatDateTime(rev.performedAt)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}


          </div>
        )}

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
