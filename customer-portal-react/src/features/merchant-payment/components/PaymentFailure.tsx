import React from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldAlert, RotateCcw, KeyRound, LayoutDashboard } from 'lucide-react';
import { EkarajCrown } from '../../../components/common/EkarajLogo';
import type { PaymentDetails } from '../types/merchantPayment';
import { clearPendingPaymentRedirect } from '../../auth/utils/pendingPaymentRedirect';

interface Props {
  details?: PaymentDetails | null;
  errorMessage: string;
  onRetry: () => void;
}

export const PaymentFailure: React.FC<Props> = ({ details, errorMessage, onRetry }) => {
  const { t } = useTranslation('payment');
  const isPinLocked = errorMessage.toLowerCase().includes('pin locked');

  return (
    <div className="mx-auto max-w-lg space-y-6">
      {/* EKARAJ Brand Header */}
      <div className="flex items-center gap-3.5 border-b border-slate-200/80 dark:border-slate-800 pb-5">
        <EkarajCrown size={42} />
        <div>
          <h1 className="text-xl font-bold text-[#0A192F] dark:text-white">{t('ekarajBank')}</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">{t('paymentAuthorizationFailed')}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0A192F] p-6 sm:p-8 shadow-xs text-center transition-colors">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400">
          <ShieldAlert className="h-7 w-7" />
        </div>

        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">{t('paymentAuthorizationFailed')}</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">{t('paymentFailedDesc')}</p>

        <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50 p-4 space-y-3 text-sm text-left mb-6">
          {details && (
            <>
              <div className="flex justify-between items-center border-b border-slate-200/60 dark:border-slate-800 pb-2.5">
                <span className="text-slate-500 dark:text-slate-400 text-xs font-medium">{t('merchant')}</span>
                <span className="font-semibold text-slate-900 dark:text-white">{details.merchantName}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-200/60 dark:border-slate-800 pb-2.5">
                <span className="text-slate-500 dark:text-slate-400 text-xs font-medium">{t('orderId')}</span>
                <span className="font-mono text-xs text-slate-700 dark:text-slate-300">{details.orderId}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-200/60 dark:border-slate-800 pb-2.5">
                <span className="text-slate-500 dark:text-slate-400 text-xs font-medium">{t('amount')}</span>
                <span className="font-bold text-slate-900 dark:text-white">{details.amount.toLocaleString()} {details.currency}</span>
              </div>
            </>
          )}
          <div className="flex justify-between items-start pt-1">
            <span className="text-red-600 dark:text-red-400 text-xs font-semibold uppercase tracking-wider">{t('reason')}</span>
            <span className="font-medium text-red-600 dark:text-red-400 text-right text-xs max-w-[70%]">{errorMessage}</span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {isPinLocked ? (
            <button
              type="button"
              onClick={() => {
                clearPendingPaymentRedirect();
                window.location.href = '/pin-reset/otp';
              }}
              className="flex items-center justify-center gap-2 w-full rounded-xl font-bold text-sm text-white bg-gradient-to-r from-[#00A3C4] to-[#0284C7] hover:from-[#0891B2] hover:to-[#0369A1] shadow-md shadow-cyan-500/25 active:scale-[0.98] py-3.5 transition-all cursor-pointer"
            >
              <KeyRound className="h-4 w-4" />
              {t('resetPinViaOtp')}
            </button>
          ) : (
            <button
              type="button"
              onClick={onRetry}
              className="flex items-center justify-center gap-2 w-full rounded-xl font-bold text-sm text-white bg-gradient-to-r from-[#00A3C4] to-[#0284C7] hover:from-[#0891B2] hover:to-[#0369A1] shadow-md shadow-cyan-500/25 active:scale-[0.98] py-3.5 transition-all cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
              {t('tryAgain')}
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              clearPendingPaymentRedirect();
              window.location.href = '/dashboard';
            }}
            className="flex items-center justify-center gap-2 w-full rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium py-3.5 transition-colors text-sm cursor-pointer"
          >
            <LayoutDashboard className="h-4 w-4" />
            {t('returnToDashboard')}
          </button>
        </div>
      </div>
    </div>
  );
};
