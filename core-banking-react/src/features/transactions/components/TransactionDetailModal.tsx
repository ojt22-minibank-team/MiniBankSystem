import { useState, useEffect } from 'react';
import {
  X,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ShieldCheck,
  CreditCard,
  ShieldAlert,
} from 'lucide-react';
import type { StaffTransactionDetail } from '../../../types/transactions.types';
import { formatCurrency } from '../../../utils/formatCurrency';
import { formatDateTime } from '../../../utils/formatDate';
import { useAuth } from '../../auth/hooks/useAuth';
import { transactionApi } from '../../../services/transactionService';
import TransactionFlagModal from './TransactionFlagModal';
import TransactionOverrideModal from './TransactionOverrideModal';

interface Props {
  transaction: StaffTransactionDetail | null;
  isOpen: boolean;
  onClose: () => void;
  isLoading?: boolean;
  onActionComplete?: () => void;
}

export default function TransactionDetailModal({
  transaction,
  isOpen,
  onClose,
  isLoading = false,
  onActionComplete,
}: Props) {
  const { isAdmin, isTeller } = useAuth();
  const canOverride = isAdmin || isTeller;

  const [copiedRef, setCopiedRef] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  // Active Transaction state (allows immediate UI refresh on action)
  const [currentTx, setCurrentTx] = useState<StaffTransactionDetail | null>(transaction);

  // Sub-modals for Flag and Override
  const [isFlagOpen, setIsFlagOpen] = useState(false);
  const [isOverrideOpen, setIsOverrideOpen] = useState(false);
  const [overrideAction, setOverrideAction] = useState<'RELEASE' | 'REJECT'>('RELEASE');
  const [actionNotice, setActionNotice] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  useEffect(() => {
    setCurrentTx(transaction);
    setActionNotice(null);
  }, [transaction]);

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

  const handleCopy = (text: string, type: 'ref' | 'id') => {
    navigator.clipboard.writeText(text);
    if (type === 'ref') {
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 2000);
    } else {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const reloadDetail = async (identifier: string) => {
    try {
      const refreshed = await transactionApi.getByIdentifier(identifier);
      setCurrentTx(refreshed);
    } catch (e) {
      console.warn('Could not reload refreshed transaction detail:', e);
    }
  };

  const handleFlagSuccess = async () => {
    setActionNotice({
      message: 'Transaction successfully flagged as suspicious and placed on HELD status.',
      type: 'success',
    });
    if (currentTx?.transactionRef) {
      await reloadDetail(currentTx.transactionRef);
    }
    onActionComplete?.();
  };

  const handleOverrideSuccess = async () => {
    setActionNotice({
      message: `Transaction successfully updated via Managerial Override (${overrideAction}).`,
      type: 'success',
    });
    if (currentTx?.transactionRef) {
      await reloadDetail(currentTx.transactionRef);
    }
    onActionComplete?.();
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
      case 'HELD':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            HELD (UNDER REVIEW)
          </span>
        );
      case 'PENDING_AUTHORIZATION':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            PENDING AUTHORIZATION
          </span>
        );
      case 'FAILED':
      case 'REJECTED':
      case 'CANCELLED':
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

  const tx = currentTx;
  const isReviewable = tx?.status === 'HELD' || tx?.status === 'PENDING_AUTHORIZATION';
  const canFlag = tx && !['COMPLETED', 'REJECTED', 'CANCELLED', 'FAILED', 'HELD'].includes(tx.status);

  return (
    <>
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

          {/* Action Success Alert Banner */}
          {actionNotice && (
            <div className="px-6 py-2.5 bg-emerald-50 border-b border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{actionNotice.message}</span>
              </div>
              <button
                onClick={() => setActionNotice(null)}
                className="text-emerald-600 hover:text-emerald-800 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Modal Body */}
          {isLoading || !tx ? (
            <div className="p-12 flex flex-col items-center justify-center text-slate-400 gap-3">
              <div className="h-10 w-10 rounded-full border-2 border-sky-500/20 border-t-sky-600 animate-spin" />
              <span className="text-xs font-semibold text-slate-500">
                Loading transaction audit data...
              </span>
            </div>
          ) : (
            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Top Overview Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">
                    Transaction Reference
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono font-bold text-slate-900">
                      {tx.transactionRef}
                    </span>
                    <button
                      onClick={() => handleCopy(tx.transactionRef, 'ref')}
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
                    {tx.channel}
                  </span>
                  {getStatusBadge(tx.status)}
                </div>
              </div>

              {/* Amount & Fee Banner */}
              <div className="p-4.5 rounded-2xl bg-gradient-to-br from-blue-50/80 via-white to-sky-50/50 border border-blue-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Transaction Amount ({tx.transactionType})
                  </span>
                  <div className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                    {formatCurrency(tx.amount, tx.currency)}
                  </div>
                  {tx.serviceFee > 0 && (
                    <div className="text-xs text-slate-500 mt-1">
                      Service Fee: +{formatCurrency(tx.serviceFee, tx.currency)}
                    </div>
                  )}
                </div>

                {tx.totalDebited > 0 && (
                  <div className="sm:text-right">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Total Ledger Debit
                    </span>
                    <div className="text-lg font-bold text-slate-800">
                      {formatCurrency(tx.totalDebited, tx.currency)}
                    </div>
                  </div>
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
                  {tx.sourceAccountNo ? (
                    <div>
                      <span className="text-sm font-mono font-bold text-slate-900 block">
                        {tx.sourceAccountNo}
                      </span>
                      <span className="text-xs text-slate-600 block">
                        {tx.sourceCustomerName || 'Internal Core Account'}
                      </span>
                      {tx.sourceCustomerCode && (
                        <span className="text-[11px] text-slate-400 block font-mono">
                          Customer: {tx.sourceCustomerCode}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 italic py-1">
                      Cash Counter / Physical Teller Vault
                    </div>
                  )}
                </div>

                {/* Destination Account Card */}
                <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-2">
                  <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                    <CreditCard className="w-4 h-4 text-emerald-600" />
                    <span>Beneficiary / Credited Account</span>
                  </div>
                  {tx.destAccountNo ? (
                    <div>
                      <span className="text-sm font-mono font-bold text-slate-900 block">
                        {tx.destAccountNo}
                      </span>
                      <span className="text-xs text-slate-600 block">
                        {tx.destCustomerName || 'Internal Core Account'}
                      </span>
                      {tx.destCustomerCode && (
                        <span className="text-[11px] text-slate-400 block font-mono">
                          Customer: {tx.destCustomerCode}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 italic py-1">
                      Cash Counter / External Gateway Settlement
                    </div>
                  )}
                </div>
              </div>

              {/* Timestamps & Initiator Metadata */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-slate-50/60 p-4 rounded-2xl border border-slate-200/60">
                <div>
                  <span className="text-slate-400 block text-[11px]">Initiated At</span>
                  <span className="font-semibold text-slate-800">
                    {formatDateTime(tx.initiatedAt)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Completed At</span>
                  <span className="font-semibold text-slate-800">
                    {tx.completedAt ? formatDateTime(tx.completedAt) : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Initiated By</span>
                  <span className="font-semibold text-slate-800">
                    {tx.initiatedByName} ({tx.initiatedByType})
                  </span>
                </div>
              </div>

              {/* Audit Notes / Failure Details */}
              {tx.auditNote && (
                <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/80 text-xs">
                  <span className="font-bold text-slate-700 block mb-0.5">Audit Note:</span>
                  <span className="text-slate-600 font-mono text-[11px]">{tx.auditNote}</span>
                </div>
              )}

              {(tx.failureCode || tx.failureMessage) && (
                <div className="p-3.5 rounded-2xl border border-rose-200 bg-rose-50/60 text-xs text-rose-800">
                  <span className="font-bold block mb-1">Failure / Rejection Diagnostic:</span>
                  <div className="space-y-0.5 font-mono text-[11px]">
                    {tx.failureCode && (
                      <div>
                        <span className="font-semibold">Code:</span> {tx.failureCode}
                      </div>
                    )}
                    {tx.failureMessage && (
                      <div>
                        <span className="font-semibold">Message:</span> {tx.failureMessage}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Review / Managerial Overrides History */}
              {tx.reviewHistory && tx.reviewHistory.length > 0 && (
                <div className="p-4 rounded-2xl border border-amber-200/90 bg-amber-50/50">
                  <div className="flex items-center gap-2 text-amber-900 font-bold text-xs mb-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Managerial Review & Override Audit Trail</span>
                  </div>
                  <div className="space-y-2">
                    {tx.reviewHistory.map((rev, idx) => (
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

              {/* System Technical Identifiers */}
              <div className="p-4 rounded-2xl bg-slate-100/70 border border-slate-200 text-xs space-y-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Technical Audit Trace
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div className="flex items-center justify-between font-mono bg-white p-2 rounded-lg border border-slate-200/60">
                    <span className="text-slate-400">UUID:</span>
                    <span className="truncate max-w-[200px] text-slate-700">
                      {tx.transactionId}
                    </span>
                    <button
                      onClick={() => handleCopy(tx.transactionId, 'id')}
                      className="p-1 text-slate-400 hover:text-blue-600 cursor-pointer"
                    >
                      {copiedId ? (
                        <Check className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                  {tx.idempotencyKey && (
                    <div className="flex items-center justify-between font-mono bg-white p-2 rounded-lg border border-slate-200/60">
                      <span className="text-slate-400">Idempotency:</span>
                      <span className="truncate max-w-[200px] text-slate-700">
                        {tx.idempotencyKey}
                      </span>
                    </div>
                  )}
                  {tx.externalReference && (
                    <div className="flex items-center justify-between font-mono bg-white p-2 rounded-lg border border-slate-200/60">
                      <span className="text-slate-400">Ext Ref:</span>
                      <span className="truncate max-w-[200px] text-slate-700">
                        {tx.externalReference}
                      </span>
                    </div>
                  )}
                  {tx.description && (
                    <div className="sm:col-span-2 flex items-center justify-between bg-white p-2 rounded-lg border border-slate-200/60">
                      <span className="text-slate-400">Remarks:</span>
                      <span className="text-slate-700">{tx.description}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Modal Footer with Support & Override Actions */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
            {/* Left: Managerial Actions */}
            <div className="flex items-center gap-2">
              {canOverride && tx && isReviewable && (
                <>
                  <button
                    onClick={() => {
                      setOverrideAction('RELEASE');
                      setIsOverrideOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Release</span>
                  </button>
                  <button
                    onClick={() => {
                      setOverrideAction('REJECT');
                      setIsOverrideOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-colors cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Reject</span>
                  </button>
                </>
              )}

              {canOverride && tx && canFlag && (
                <button
                  onClick={() => setIsFlagOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-600 text-white shadow-xs transition-colors cursor-pointer"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Flag Suspicious</span>
                </button>
              )}
            </div>

            {/* Right: Close button */}
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 transition-colors cursor-pointer ml-auto"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Sub-modals for Flag and Override */}
      {tx && (
        <>
          <TransactionFlagModal
            isOpen={isFlagOpen}
            onClose={() => setIsFlagOpen(false)}
            transaction={tx}
            onSuccess={handleFlagSuccess}
          />
          <TransactionOverrideModal
            isOpen={isOverrideOpen}
            onClose={() => setIsOverrideOpen(false)}
            transaction={tx}
            initialAction={overrideAction}
            onSuccess={handleOverrideSuccess}
          />
        </>
      )}
    </>
  );
}
