import React from 'react';
import { ShieldAlert, RotateCcw, KeyRound, LayoutDashboard } from 'lucide-react';
import type { PaymentDetails } from '../types/merchantPayment';

interface Props {
  details?: PaymentDetails | null;
  errorMessage: string;
  onRetry: () => void;
}

export const PaymentFailure: React.FC<Props> = ({ details, errorMessage, onRetry }) => {
  const isPinLocked = errorMessage.toLowerCase().includes('pin locked');

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
          <ShieldAlert className="h-7 w-7" />
        </div>

        <h2 className="text-xl font-bold text-slate-900 mb-1">Payment Authorization Failed</h2>
        <p className="text-xs text-slate-500 mb-6">The transaction could not be completed with the current details.</p>

        <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-4 space-y-3 text-sm text-left mb-6">
          {details && (
            <>
              <div className="flex justify-between items-center border-b border-slate-200/60 pb-2.5">
                <span className="text-slate-500 text-xs font-medium">Merchant</span>
                <span className="font-semibold text-slate-900">{details.merchantName}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-200/60 pb-2.5">
                <span className="text-slate-500 text-xs font-medium">Order ID</span>
                <span className="font-mono text-xs text-slate-700">{details.orderId}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-200/60 pb-2.5">
                <span className="text-slate-500 text-xs font-medium">Amount</span>
                <span className="font-bold text-slate-900">{details.amount.toLocaleString()} {details.currency}</span>
              </div>
            </>
          )}
          <div className="flex justify-between items-start pt-1">
            <span className="text-red-600 text-xs font-semibold uppercase tracking-wider">Reason</span>
            <span className="font-medium text-red-600 text-right text-xs max-w-[70%]">{errorMessage}</span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {isPinLocked ? (
            <button
              type="button"
              onClick={() => window.location.href = '/pin-reset/otp'}
              className="flex items-center justify-center gap-2 w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 transition-colors shadow-xs text-sm"
            >
              <KeyRound className="h-4 w-4" />
              Reset PIN via OTP
            </button>
          ) : (
            <button
              type="button"
              onClick={onRetry}
              className="flex items-center justify-center gap-2 w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 transition-colors shadow-xs text-sm"
            >
              <RotateCcw className="h-4 w-4" />
              Try Again
            </button>
          )}

          <button
            type="button"
            onClick={() => window.location.href = '/dashboard'}
            className="flex items-center justify-center gap-2 w-full rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-3.5 transition-colors text-sm"
          >
            <LayoutDashboard className="h-4 w-4" />
            Return to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};
