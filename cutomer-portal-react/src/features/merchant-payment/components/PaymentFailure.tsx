import React from 'react';
import type{ PaymentDetails } from '../types/merchantPayment';

interface Props {
  details: PaymentDetails;
  errorMessage: string;
  onRetry: () => void;
}

export const PaymentFailure: React.FC<Props> = ({ details, errorMessage, onRetry }) => {
  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-xl shadow-xl border border-red-100 font-sans text-center">
      <div className="flex justify-center mb-4">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-3xl font-bold">✕</div>
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Payment Failed</h2>
      
      <div className="text-left bg-red-50 p-5 rounded-lg space-y-4 text-sm text-gray-800 border border-red-100">
        <div className="flex justify-between border-b border-red-200 pb-2">
          <span className="font-semibold">Merchant</span>
          <span>{details.merchantName}</span>
        </div>
        <div className="flex justify-between border-b border-red-200 pb-2">
          <span className="font-semibold">Amount</span>
          <span className="font-bold">{details.amount.toLocaleString()} {details.currency}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-semibold text-red-700">Reason</span>
          <span className="text-red-700 font-medium text-right max-w-[60%]">{errorMessage}</span>
        </div>
      </div>

      <div className="mt-8 flex flex-col space-y-3">
        <button onClick={onRetry} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors">Choose Another Account</button>
        <button onClick={() => window.location.href = '/dashboard'} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-3 rounded-lg transition-colors">Cancel Payment</button>
      </div>
    </div>
  );
};
