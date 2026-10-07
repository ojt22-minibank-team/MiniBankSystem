import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { hasTokens } from '../../../utils/tokenStorage';
import { fetchPaymentDetails, fetchCustomerAccounts, authorizePayment } from '../api/merchantPaymentService';
import type { PaymentDetails, CustomerAccount, PaymentReceipt as ReceiptType } from '../types/merchantPayment';
import { AccountSelector } from '../components/AccountSelector';
import { PinInput } from '../components/PinInput';
import { PaymentReceipt } from '../components/PaymentReceipt';
import { PaymentFailure } from '../components/PaymentFailure';

const checkoutSchema = z.object({
  transactionPin: z.string()
    .length(6, 'PIN must be exactly 6 digits')
    .regex(/^\d+$/, 'PIN must contain only numbers')
});

type CheckoutFormData = z.infer<typeof checkoutSchema>;

export const MerchantPaymentAuthorize: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [details, setDetails] = useState<PaymentDetails | null>(null);
  const [accounts, setAccounts] = useState<CustomerAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  
  const [receipt, setReceipt] = useState<ReceiptType | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorCode, setErrorCode] = useState('');
  const [loading, setLoading] = useState(true);

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<CheckoutFormData>({
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
        window.location.href = `/login?redirect=/checkout?token=${token}`;
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
      } catch (err: any) {
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

  if (loading || !details) {
    return <div className="p-8 text-center text-gray-500 animate-pulse mt-20">Loading Secure Checkout...</div>;
  }

  if (receipt) {
    return <PaymentReceipt receipt={receipt} details={details} selectedAccount={selectedAccountId} />;
  }

  // TERMINAL ERRORS: Show the massive Failure Screen for everything EXCEPT "INVALID_PIN"
  if ((errorMessage && errorCode !== 'INVALID_PIN') || (errorMessage && !accounts.length)) {
     return <PaymentFailure details={details} errorMessage={errorMessage} onRetry={handleRetry} />;
  }

  return (
    <div className="max-w-md mx-auto mt-10 p-8 bg-white rounded-xl shadow-2xl border border-gray-100 font-sans">
      <div className="text-center mb-6">
        <h1 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-1">Mini Online Banking</h1>
        <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Confirm Payment</h2>
      </div>
      
      {/* INLINE ERROR: Only show here if the customer typed the wrong PIN */}
      {errorMessage && errorCode === 'INVALID_PIN' && (
        <div className="bg-red-50 text-red-600 p-4 rounded-md mb-6 text-sm border border-red-200 text-center font-medium shadow-sm">
          {errorMessage}
        </div>
      )}
      
      <div className="bg-white p-5 rounded-lg mb-6 border border-gray-200 shadow-sm">
        <div className="flex justify-between mb-2">
          <span className="text-gray-500 text-sm">Merchant</span>
          <span className="font-semibold text-gray-900">{details.merchantName}</span>
        </div>
        <div className="flex justify-between mb-2">
          <span className="text-gray-500 text-sm">Order ID</span>
          <span className="font-semibold text-gray-900">{details.orderId}</span>
        </div>
        <div className="flex justify-between mt-4 pt-4 border-t border-gray-100">
          <span className="text-gray-500 text-sm font-medium">Amount</span>
          <span className="text-xl font-extrabold text-blue-600">{details.amount.toLocaleString()} <span className="text-base">{details.currency}</span></span>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <AccountSelector 
          accounts={accounts} 
          selectedAccountId={selectedAccountId} 
          onSelect={setSelectedAccountId} 
        />

        <PinInput 
          register={register} 
          errors={errors} 
          disabled={isSubmitting || accounts.length === 0} 
        />

        <div className="flex space-x-3 mt-8">
          <button 
            type="button"
            onClick={() => window.location.href = '/dashboard'}
            disabled={isSubmitting}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-4 rounded-lg transition-colors text-base"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            disabled={isSubmitting || accounts.length === 0}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-lg shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-base"
          >
            {isSubmitting ? 'Processing...' : `Pay ${details.amount.toLocaleString()}`}
          </button>
        </div>
      </form>
    </div>
  );
};
