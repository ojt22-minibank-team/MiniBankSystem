import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { hasTokens, getAccessToken } from '../../../utils/tokenStorage';
import { clearPendingPaymentRedirect } from '../../auth/utils/pendingPaymentRedirect';
import { fetchPaymentDetails, fetchCustomerAccounts, authorizePayment, cancelPayment } from '../api/merchantPaymentService';
import type { PaymentDetails, CustomerAccount, PaymentReceipt as ReceiptType } from '../types/merchantPayment';

import { EkarajCrown } from '../../../components/common/EkarajLogo';
import { PinInput } from '../components/PinInput';
import { PaymentReceipt } from '../components/PaymentReceipt';
import { PaymentFailure } from '../components/PaymentFailure';
import { CreditCard } from 'lucide-react';

interface CheckoutFormData {
  transactionPin: string;
}

export const MerchantPaymentAuthorize: React.FC = () => {
  const { t } = useTranslation('payment');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || sessionStorage.getItem('paymentToken');

  const [details, setDetails] = useState<PaymentDetails | null>(null);
  const [accounts, setAccounts] = useState<CustomerAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  
  const [receipt, setReceipt] = useState<ReceiptType | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorCode, setErrorCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const checkoutSchema = useMemo(() => z.object({
    transactionPin: z.string()
      .length(6, t('pinExactDigits'))
      .regex(/^\d+$/, t('pinOnlyNumbers'))
  }), [t]);

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset, setValue } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: { transactionPin: '' }
  });

  useEffect(() => {
    let isCancelled = false;

    // Immediately reset all state when token changes (Token A -> Token B fix)
    setDetails(null);
    setAccounts([]);
    setSelectedAccountId('');
    setReceipt(null);
    setErrorMessage('');
    setErrorCode('');
    setLoading(true);
    reset({ transactionPin: '' });

    if (!token) {
      setErrorMessage(t('invalidPaymentLink'));
      setErrorCode('INVALID_TOKEN');
      setLoading(false);
      return;
    }

    // Keep sessionStorage synchronized so Token B overwrites Token A in sessionStorage
    const returnUrl = `/checkout?token=${encodeURIComponent(token)}`;
    sessionStorage.setItem('paymentToken', token);
    sessionStorage.setItem('redirectUrl', returnUrl);

    if (!hasTokens()) {
      window.location.href = `/login?redirect=${encodeURIComponent(returnUrl)}`;
      return;
    }

    const loadData = async () => {
      try {
        const [paymentData, accountsData] = await Promise.all([
          fetchPaymentDetails(token),
          fetchCustomerAccounts()
        ]);

        if (isCancelled) return;

        // Business Rule: Payments can only be made from CURRENT accounts
        const currentAccounts = accountsData.filter(acc => acc.accountType === 'CURRENT');

        setDetails(paymentData);
        setAccounts(currentAccounts);

        if (currentAccounts.length > 0) {
          setSelectedAccountId(currentAccounts[0].accountNumber);
        }
      } catch (err) {
        if (!isCancelled) {
          if (axios.isAxiosError(err)) {
            setErrorMessage(err.response?.data?.message || t('failedToLoadPayment'));
            setErrorCode(err.response?.data?.code || 'SYSTEM_ERROR');
          } else {
            setErrorMessage(t('failedToLoadPayment'));
            setErrorCode('SYSTEM_ERROR');
          }
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isCancelled = true;
    };
  }, [token, reset, t]);

  const handleCancel = async () => {
    setIsCancelling(true);
    const activeToken = getAccessToken();
    try {
      await axios.post('/api/customer/merchant-payment/cancel', {
        paymentToken: token,
        accountId: selectedAccountId || "UNKNOWN"
      }, {
        headers: activeToken ? { Authorization: `Bearer ${activeToken}` } : undefined
      });
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        setErrorMessage(err.response.data?.message || t('paymentInFlightError'));
        setErrorCode('TRANSACTION_IN_FLIGHT');
        setIsCancelling(false);
        setShowCancelConfirm(false);
        return;
      }
      try {
        await cancelPayment(token as string, selectedAccountId || "UNKNOWN");
      } catch (innerErr) {
        console.error('Cancel payment notification error:', innerErr);
      }
    }

    clearPendingPaymentRedirect();
    if (details && details.returnUrl) {
      window.location.href = details.returnUrl;
    } else {
      navigate('/dashboard');
    }
  };

  const onSubmit = async (data: CheckoutFormData) => {
    if (!selectedAccountId) {
      setErrorMessage(t('selectAccountError'));
      return;
    }
    
    setErrorMessage('');
    setErrorCode('');
    
    try {
      const receiptData = await authorizePayment({
        paymentToken: token as string,
        accountId: selectedAccountId,
        amount: details!.amount,
        transactionPin: data.transactionPin
      });
      clearPendingPaymentRedirect();
      setReceipt(receiptData);
      window.dispatchEvent(new Event('new-notification-event'));
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setErrorMessage(err.response?.data?.message || t('paymentFailed'));
        setErrorCode(err.response?.data?.code || 'UNKNOWN_ERROR');
      } else {
        setErrorMessage(t('systemError'));
        setErrorCode('SYSTEM_ERROR');
      }
      reset({ transactionPin: '' }); // Clear PIN field on failure
    }
  };

  const handleRetry = () => {
    setErrorMessage('');
    setErrorCode('');
    reset({ transactionPin: '' });
  };

  if (!hasTokens()) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-500 dark:text-slate-400 animate-pulse mt-12">
        <div className="h-10 w-10 border-4 border-[#00A3C4] border-t-transparent rounded-full animate-spin mb-4" />
        <span className="text-sm font-medium">{t('loadingSecureCheckout')}</span>
      </div>
    );
  }

  // TERMINAL ERRORS: Show the Failure Screen for everything EXCEPT "INVALID_PIN"
  if ((errorMessage && errorCode !== 'INVALID_PIN') || (errorMessage && !accounts.length) || !details) {
     return <PaymentFailure details={details} errorMessage={errorMessage || t('failedToLoadPaymentShort')} onRetry={handleRetry} />;
  }

  if (receipt) {
    return <PaymentReceipt receipt={receipt} details={details} selectedAccount={selectedAccountId} />;
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      {/* EKARAJ Brand Header */}
      <div className="flex items-center gap-3.5 border-b border-slate-200/80 dark:border-slate-800 pb-5">
        <EkarajCrown size={42} />
        <div>
          <h1 className="text-xl font-bold text-[#0A192F] dark:text-white">{t('ekarajBank')}</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">{t('merchantPaymentAuthorization')}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0A192F] p-6 sm:p-8 shadow-xs transition-colors">
        {/* INLINE ERROR: Only show here if the customer typed the wrong PIN */}
        {errorMessage && errorCode === 'INVALID_PIN' && (
          <div className="mb-5 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-center text-xs font-semibold text-red-600 dark:text-red-400">
            {errorMessage}
          </div>
        )}
        
        {/* Merchant & Order Details */}
        <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50 p-4 mb-6">
          <div className="flex justify-between items-center mb-2.5">
            <span className="text-slate-500 dark:text-slate-400 text-xs font-medium">{t('merchant')}</span>
            <span className="font-semibold text-slate-900 dark:text-white text-sm">{details.merchantName}</span>
          </div>
          {details.orderId && (
            <div className="flex justify-between items-center mb-3">
              <span className="text-slate-500 dark:text-slate-400 text-xs font-medium">{t('orderId')}</span>
              <span className="font-mono text-xs text-slate-700 dark:text-slate-300">{details.orderId}</span>
            </div>
          )}
          <div className="flex justify-between items-center pt-3 border-t border-slate-200/60 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400 text-xs font-medium">{t('totalAmount')}</span>
            <span className="text-xl font-bold text-[#00A3C4] dark:text-cyan-400">
              {details.amount.toLocaleString()} <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{details.currency}</span>
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          {accounts.length > 0 ? (
            <div className="mb-6 text-left">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">
                {t('payFrom')}
              </label>
              <div className="w-full py-3 px-4 border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/50 rounded-xl text-slate-800 dark:text-slate-200 text-sm font-medium flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <div className="h-9 w-9 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 text-[#00A3C4] flex items-center justify-center font-bold">
                    <CreditCard className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-slate-900 dark:text-white font-semibold text-sm">
                      {accounts[0].accountType === 'CURRENT' ? t('currentAccount') : `${accounts[0].accountType} Account`}
                    </div>
                    <div className="text-slate-500 dark:text-slate-400 text-xs font-mono">****{accounts[0].accountNumber.slice(-4)}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-slate-400 dark:text-slate-500 text-[10px] font-semibold uppercase tracking-wider mb-0.5">{t('availableBalance')}</div>
                  <div className="text-slate-900 dark:text-white font-bold text-sm">{accounts[0].availableBalance.toLocaleString()} {accounts[0].currency}</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-xl text-xs font-medium border border-red-100 dark:border-red-900/40">
              {t('noCurrentAccountsFound')}
            </div>
          )}

          <PinInput 
            register={register} 
            setValue={setValue}
            errors={errors} 
            disabled={isSubmitting || accounts.length === 0} 
          />

          <div className="flex gap-3 mt-6">
            <button 
              type="button"
              onClick={() => setShowCancelConfirm(true)}
              disabled={isSubmitting}
              className="flex-1 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium py-3.5 transition-colors text-sm cursor-pointer"
            >
              {t('cancel')}
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting || accounts.length === 0}
              className="flex-1 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-[#00A3C4] to-[#0284C7] hover:from-[#0891B2] hover:to-[#0369A1] shadow-md shadow-cyan-500/25 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all py-3.5 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? t('processing') : t('payAmount', { amount: details.amount.toLocaleString(), currency: details.currency })}
            </button>
          </div>
        </form>
      </div>

      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-[#0A192F]">
            <h3 className="text-lg font-bold text-[#0A192F] dark:text-white mb-2">{t('cancelPaymentTitle')}</h3>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-6">
              {t('cancelPaymentConfirm')}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleCancel}
                disabled={isCancelling}
                className="flex-1 rounded-xl border border-red-200 bg-red-50 py-3 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-900/50 cursor-pointer"
              >
                {isCancelling ? t('cancelling') : t('yesCancel')}
              </button>
              <button
                type="button"
                onClick={() => setShowCancelConfirm(false)}
                disabled={isCancelling}
                className="flex-1 rounded-xl bg-gradient-to-r from-[#00A3C4] to-[#0284C7] py-3 text-sm font-bold text-white shadow-md shadow-cyan-500/25 transition-all hover:from-[#0891B2] hover:to-[#0369A1] active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              >
                {t('noGoBack')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
