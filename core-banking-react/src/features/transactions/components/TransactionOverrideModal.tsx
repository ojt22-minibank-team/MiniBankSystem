import React, { useState } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, X, RefreshCw } from 'lucide-react';
import { transactionApi } from '../../../services/transactionService';
import type {
  StaffTransactionDetail,
  StaffTransactionSummary,
  TransactionOverrideResponse,
} from '../../../types/transactions.types';
import { formatCurrency } from '../../../utils/formatCurrency';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  transaction: StaffTransactionDetail | StaffTransactionSummary;
  initialAction?: 'RELEASE' | 'REJECT';
  onSuccess: (response: TransactionOverrideResponse) => void;
}

export default function TransactionOverrideModal({
  isOpen,
  onClose,
  transaction,
  initialAction = 'RELEASE',
  onSuccess,
}: Props) {
  const [action, setAction] = useState<'RELEASE' | 'REJECT'>(initialAction);
  const [reason, setReason] = useState('');
  const [resolutionNote, setResolutionNote] = useState('');
  const [riskLevel, setRiskLevel] = useState<string>('LOW');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const isRelease = action === 'RELEASE';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim() || reason.trim().length < 5) {
      setErrorMessage('A mandatory compliance reason (at least 5 characters) is required to override.');
      return;
    }
    if (reason.length > 255) {
      setErrorMessage('Reason must not exceed 255 characters.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await transactionApi.overrideTransaction(transaction.transactionId, {
        action,
        reason: reason.trim(),
        resolutionNote: resolutionNote.trim() || undefined,
        riskLevel: isRelease ? 'LOW' : riskLevel,
      });
      onSuccess(response);
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        `Failed to ${action.toLowerCase()} transaction. Please verify backend status and try again.`;
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-b ${
            isRelease
              ? 'bg-emerald-500/10 border-emerald-200/80 text-emerald-900'
              : 'bg-rose-500/10 border-rose-200/80 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-xl ${
                isRelease ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
              }`}
            >
              {isRelease ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <XCircle className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Managerial Override: {isRelease ? 'Release Transaction' : 'Reject Transaction'}
              </h3>
              <p className="text-[11px] text-slate-500 font-mono">
                {transaction.transactionRef} (Current: {transaction.status})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Action Mode Selector Tabs */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setAction('RELEASE');
                setErrorMessage(null);
              }}
              className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                isRelease
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Release (Authorize)
            </button>
            <button
              type="button"
              onClick={() => {
                setAction('REJECT');
                setErrorMessage(null);
              }}
              className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                !isRelease
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Reject (Decline)
            </button>
          </div>

          {/* Context Banner */}
          <div
            className={`flex items-start gap-2.5 p-3 rounded-xl border text-xs leading-relaxed ${
              isRelease
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                : 'bg-rose-50/70 border-rose-200 text-rose-950'
            }`}
          >
            <AlertTriangle
              className={`w-4 h-4 shrink-0 mt-0.5 ${
                isRelease ? 'text-emerald-600' : 'text-rose-600'
              }`}
            />
            <div className="text-[11px]">
              {isRelease ? (
                <>
                  Authorizing will transition the status to{' '}
                  <strong className="font-semibold text-emerald-700">COMPLETED</strong>, release
                  associated account holds on{' '}
                  <strong>{formatCurrency(transaction.amount, transaction.currency)}</strong>, and
                  finalize the transaction.
                </>
              ) : (
                <>
                  Rejecting will transition the status to{' '}
                  <strong className="font-semibold text-rose-700">REJECTED</strong>, release the held
                  funds back to the customer's available balance, and record the rejection reason.
                </>
              )}
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
              {errorMessage}
            </div>
          )}

          {/* Risk Level on Rejection */}
          {!isRelease && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Confirmed Threat / Risk Assessment Level
              </label>
              <select
                value={riskLevel}
                onChange={(e) => setRiskLevel(e.target.value)}
                disabled={isSubmitting}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-medium"
              >
                <option value="LOW">LOW — Routine customer cancellation or clerical correction</option>
                <option value="MEDIUM">MEDIUM — Suspicious activity or unverified beneficiary</option>
                <option value="HIGH">HIGH — Confirmed fraudulent transaction or identity spoofing</option>
                <option value="CRITICAL">CRITICAL — Severe cyber / financial compromise</option>
              </select>
            </div>
          )}

          {/* Override Reason (Compulsory) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Mandatory Override / Compliance Reason <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                isRelease
                  ? 'e.g. Identity verified via branch inspection; false positive cleared by compliance manager.'
                  : 'e.g. Confirmed unauthorized payment attempt; cardholder notified and transaction terminated.'
              }
              rows={3}
              maxLength={255}
              disabled={isSubmitting}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
            />
            <div className="flex justify-between items-center text-[10px] text-slate-400 mt-0.5">
              <span>Minimum 5 characters</span>
              <span>{reason.length}/255</span>
            </div>
          </div>

          {/* Optional Resolution Note */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Resolution Audit Note (Optional)
            </label>
            <input
              type="text"
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
              placeholder="e.g. Case #REF-9921 closed by Operations Supervisor"
              maxLength={500}
              disabled={isSubmitting}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50 ${
                isRelease
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : isRelease ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Authorize & Release</span>
                </>
              ) : (
                <>
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Confirm Rejection</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
