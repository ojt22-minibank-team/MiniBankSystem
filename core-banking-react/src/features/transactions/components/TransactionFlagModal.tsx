import React, { useState } from 'react';
import { ShieldAlert, AlertTriangle, X, RefreshCw } from 'lucide-react';
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
  onSuccess: (response: TransactionOverrideResponse) => void;
}

export default function TransactionFlagModal({
  isOpen,
  onClose,
  transaction,
  onSuccess,
}: Props) {
  const [riskLevel, setRiskLevel] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('HIGH');
  const [reason, setReason] = useState('');
  const [resolutionNote, setResolutionNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim() || reason.trim().length < 5) {
      setErrorMessage('A detailed reason (at least 5 characters) is required to flag this transaction.');
      return;
    }
    if (reason.length > 255) {
      setErrorMessage('Reason must not exceed 255 characters.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await transactionApi.flagSuspicious(transaction.transactionId, {
        riskLevel,
        reason: reason.trim(),
        resolutionNote: resolutionNote.trim() || undefined,
      });
      onSuccess(response);
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to flag suspicious transaction. Please verify your permissions and try again.';
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
        <div className="flex items-center justify-between px-6 py-4 bg-amber-500/10 border-b border-amber-200/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Flag Suspicious Transaction
              </h3>
              <p className="text-[11px] text-slate-500 font-mono">
                {transaction.transactionRef}
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
          {/* Warning Banner */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              Flagging will immediately transition this transaction to{' '}
              <strong className="font-semibold text-amber-800">HELD</strong> status,
              place an administrative hold on the source account for{' '}
              <strong>{formatCurrency(transaction.amount, transaction.currency)}</strong>, and log an immutable audit trace.
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
              {errorMessage}
            </div>
          )}

          {/* Risk Level */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Risk Level Assessment
            </label>
            <select
              value={riskLevel}
              onChange={(e) => setRiskLevel(e.target.value as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL')}
              disabled={isSubmitting}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium"
            >
              <option value="LOW">LOW — Minor anomaly or verification checkpoint</option>
              <option value="MEDIUM">MEDIUM — Suspicious velocity or threshold breach</option>
              <option value="HIGH">HIGH — Strong fraud indicators / AML alert</option>
              <option value="CRITICAL">CRITICAL — Severe fraud / confirmed compromised account</option>
            </select>
          </div>

          {/* Reason (Compulsory) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Audit Flag Reason <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="State clear reasons or observations (e.g. Unusual rapid high-value transfer to unverified recipient)..."
              rows={3}
              maxLength={255}
              disabled={isSubmitting}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none"
            />
            <div className="flex justify-between items-center text-[10px] text-slate-400 mt-0.5">
              <span>Minimum 5 characters</span>
              <span>{reason.length}/255</span>
            </div>
          </div>

          {/* Optional Resolution Note */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Internal Remediation / Next Steps Note (Optional)
            </label>
            <input
              type="text"
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
              placeholder="e.g. Contact customer to confirm identity before override..."
              maxLength={500}
              disabled={isSubmitting}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
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
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Flagging...</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Confirm Flag</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
