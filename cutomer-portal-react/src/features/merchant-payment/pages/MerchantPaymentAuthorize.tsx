import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { hasTokens } from '../../../utils/tokenStorage';
import { fetchPaymentDetails, fetchCustomerAccounts, authorizePayment } from '../api/merchantPaymentService';
import type { PaymentDetails, CustomerAccount, PaymentReceipt as ReceiptType } from '../types/merchantPayment';

import { PinInput } from '../components/PinInput';
import { PaymentReceipt } from '../components/PaymentReceipt';
import { PaymentFailure } from '../components/PaymentFailure';
import { WalletCards, CreditCard } from 'lucide-react';

const checkoutSchema = z.object({
  transactionPin: z.string()
    .length(6, 'PIN must be exactly 6 digits')
    .regex(/^\d+$/, 'PIN must contain only numbers')
});

type CheckoutFormData = z.infer<typeof checkoutSchema>;

export const MerchantPaymentAuthorize: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [details, setDetails] = useState<PaymentDetails | null>(null);
  const [accounts, setAccounts] = useState<CustomerAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  
  const [receipt, setReceipt] = useState<ReceiptType | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorCode, setErrorCode] = useState('');
  const [loading, setLoading] = useState(true);

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset, setValue } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: { transactionPin: '' }
  });

  useEffect(() => {
    const loadData = async () => {
      if (!token) {
        setErrorMessage('Invalid Payment Link. No token provided.');
        setErrorCode('INVALID_TOKEN');
        setLoading(false);
        return;
      }

      if (!hasTokens()) {
        const returnUrl = `/checkout?token=${encodeURIComponent(token)}`;
        sessionStorage.setItem("redirectUrl", returnUrl);
        sessionStorage.setItem("paymentToken", token);
        window.location.href = `/login?redirect=${encodeURIComponent(returnUrl)}`;
        return; 
      }

      try {
        const [paymentData, accountsData] = await Promise.all([
          fetchPaymentDetails(token),
          fetchCustomerAccounts()
        ]);
        
        // Business Rule: Payments can only be made from CURRENT accounts
        const currentAccounts = accountsData.filter(acc => acc.accountType === 'CURRENT');
        
        setDetails(paymentData);
        setAccounts(currentAccounts);
        
        if (currentAccounts.length > 0) {
          setSelectedAccountId(currentAccounts[0].accountNumber);
        }
      } catch {
        setErrorMessage('Failed to load payment details. Invalid or expired token.');
        setErrorCode('SYSTEM_ERROR');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [token]);

  const onSubmit = async (data: CheckoutFormData) => {
    if (!selectedAccountId) {
      setErrorMessage('Please select an account to pay from.');
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
      setReceipt(receiptData);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setErrorMessage(err.response?.data?.message || 'Payment failed.');
        setErrorCode(err.response?.data?.code || 'UNKNOWN_ERROR');
      } else {
        setErrorMessage('An unexpected system error occurred.');
        setErrorCode('SYSTEM_ERROR');
      }
      reset(); // Clear PIN field on failure
    }
  };

  const handleRetry = () => {
    setErrorMessage('');
    setErrorCode('');
    reset(); // Clear PIN field
  };

  if (!hasTokens()) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-500 dark:text-slate-400 animate-pulse mt-12">
        <div className="h-10 w-10 border-4 border-[#0878E8] border-t-transparent rounded-full animate-spin mb-4" />
        <span className="text-sm font-medium">Loading Secure Checkout...</span>
      </div>
    );
  }

  // TERMINAL ERRORS: Show the massive Failure Screen for everything EXCEPT "INVALID_PIN"
  if ((errorMessage && errorCode !== 'INVALID_PIN') || (errorMessage && !accounts.length) || !details) {
     return <PaymentFailure details={details} errorMessage={errorMessage || 'Failed to load payment details.'} onRetry={handleRetry} />;
  }

  if (receipt) {
    return <PaymentReceipt receipt={receipt} details={details} selectedAccount={selectedAccountId} />;
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      {/* Group Header */}
      <div className="flex items-center gap-3.5 border-b border-slate-200/80 pb-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
          <WalletCards className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Merchant Payment</h1>
          <p className="text-xs text-slate-500">Secure Checkout Authorization</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs">
        {/* INLINE ERROR: Only show here if the customer typed the wrong PIN */}
        {errorMessage && errorCode === 'INVALID_PIN' && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-xs font-semibold text-red-600">
            {errorMessage}
          </div>
        )}
        
        {/* Merchant & Order Details */}
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-4 mb-6">
          <div className="flex justify-between items-center mb-2.5">
            <span className="text-slate-500 text-xs font-medium">Merchant</span>
            <span className="font-semibold text-slate-900 text-sm">{details.merchantName}</span>
          </div>
          {details.orderId && (
            <div className="flex justify-between items-center mb-3">
              <span className="text-slate-500 text-xs font-medium">Order ID</span>
              <span className="font-mono text-xs text-slate-700">{details.orderId}</span>
            </div>
          )}
          <div className="flex justify-between items-center pt-3 border-t border-slate-200/60">
            <span className="text-slate-500 text-xs font-medium">Total Amount</span>
            <span className="text-xl font-bold text-blue-600">
              {details.amount.toLocaleString()} <span className="text-xs font-semibold text-slate-500">{details.currency}</span>
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          {accounts.length > 0 ? (
            <div className="mb-6 text-left">
              <label className="block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wider">
                Pay From
              </label>
              <div className="w-full py-3 px-4 border border-slate-200 bg-slate-50/80 rounded-xl text-slate-800 text-sm font-medium flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <div className="h-9 w-9 rounded-xl bg-blue-100/70 text-blue-600 flex items-center justify-center font-bold">
                    <CreditCard className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-slate-900 font-semibold text-sm">{accounts[0].accountType} Account</div>
                    <div className="text-slate-500 text-xs font-mono">****{accounts[0].accountNumber.slice(-4)}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider mb-0.5">Available Balance</div>
                  <div className="text-slate-900 font-bold text-sm">{accounts[0].availableBalance.toLocaleString()} {accounts[0].currency}</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-xs font-medium border border-red-100">
              No active CURRENT accounts found to pay from.
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
              onClick={() => navigate('/dashboard')}
              disabled={isSubmitting}
              className="flex-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-3.5 transition-colors text-sm"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting || accounts.length === 0}
              className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            >
              {isSubmitting ? 'Processing...' : `Pay ${details.amount.toLocaleString()} ${details.currency}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
