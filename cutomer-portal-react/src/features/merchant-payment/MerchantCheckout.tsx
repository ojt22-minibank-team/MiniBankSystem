import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { fetchPaymentDetails, authorizePayment, type PaymentDetails, type PaymentReceipt } from '../../services/merchantApi';

// 1. Define the Zod Schema (Frontend DTO)
const checkoutSchema = z.object({
  transactionPin: z.string()
    .length(6, 'PIN must be exactly 6 digits')
    .regex(/^\d+$/, 'PIN must contain only numbers')
});

type CheckoutFormData = z.infer<typeof checkoutSchema>;

export const MerchantCheckout: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || 'PAY-TOK-123';

  const [details, setDetails] = useState<PaymentDetails | null>(null);
  const [receipt, setReceipt] = useState<PaymentReceipt | null>(null);
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(true);

  // 2. Initialize React Hook Form
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: { transactionPin: '' }
  });

  useEffect(() => {
    const loadDetails = async () => {
      try {
        const data = await fetchPaymentDetails(token);
        setDetails(data);
      } catch {
        setServerError('Failed to load payment details. Invalid or expired token.');
      } finally {
        setLoading(false);
      }
    };
    loadDetails();
  }, [token]);

  // 3. RHF handles the event, we just receive the validated data!
  const onSubmit = async (data: CheckoutFormData) => {
    setServerError('');
    
    try {
      const receiptData = await authorizePayment({
        paymentToken: token,
        customerId: "66666666-6666-6666-6666-666666666666", // Mock customer ID
        merchantAccountId: details!.merchantAccountId,
        amount: details!.amount,
        transactionPin: data.transactionPin
      });
      setReceipt(receiptData);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setServerError(err.response?.data?.message || 'Payment failed. Invalid PIN or insufficient funds.');
      } else {
        setServerError('An unexpected system error occurred.');
      }
    }
  };

  if (loading && !details) {
    return <div className="p-8 text-center text-gray-500 animate-pulse">Loading Secure Checkout...</div>;
  }

  if (receipt) {
    return (
      <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-xl border border-green-200 text-center font-sans">
        <div className="text-6xl mb-4">✅</div>
        <h2 className="text-2xl font-bold text-green-600 mb-2">Payment Successful</h2>
        <div className="text-left bg-gray-50 p-4 rounded-md mt-6 space-y-3 text-gray-700 text-sm">
          <p><span className="font-semibold text-gray-900">Merchant:</span> {details?.merchantName}</p>
          <p><span className="font-semibold text-gray-900">Amount:</span> {receipt.amount} {receipt.currency}</p>
          <p><span className="font-semibold text-gray-900">Reference:</span> {receipt.coreLedgerReference}</p>
          <p><span className="font-semibold text-gray-900">Date:</span> {new Date(receipt.timestamp).toLocaleString()}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-10 p-8 bg-white rounded-xl shadow-2xl border border-gray-100 font-sans">
      <h2 className="text-2xl font-extrabold mb-6 text-center text-gray-900 tracking-tight">Payment Authorization</h2>
      
      {serverError && (
        <div className="bg-red-50 text-red-600 p-4 rounded-md mb-6 text-sm border border-red-200">
          {serverError}
        </div>
      )}
      
      <div className="bg-blue-50 p-5 rounded-lg mb-8 text-blue-900 border border-blue-100 shadow-sm">
        <p className="text-sm font-medium mb-1">You are about to pay <strong className="font-bold">{details?.merchantName}</strong></p>
        <p className="text-3xl font-extrabold">{details?.amount} <span className="text-xl font-semibold text-blue-700">{details?.currency}</span></p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Enter 6-Digit PIN</label>
          <input 
            type="password" 
            maxLength={6}
            {...register("transactionPin")}
            className={`w-full py-3 px-4 border bg-gray-50 focus:bg-white rounded-lg text-center text-2xl tracking-[0.5em] outline-none transition-all ${
              errors.transactionPin ? 'border-red-500 focus:ring-2 focus:ring-red-500' : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
            }`}
            placeholder="******"
          />
          {/* Zod Validation Error Message */}
          {errors.transactionPin && (
            <p className="mt-2 text-sm text-red-600 font-medium">{errors.transactionPin.message}</p>
          )}
        </div>
        <button 
          type="submit" 
          disabled={isSubmitting}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-lg shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-lg"
        >
          {isSubmitting ? 'Processing...' : 'Confirm Payment'}
        </button>
      </form>
    </div>
  );
};
