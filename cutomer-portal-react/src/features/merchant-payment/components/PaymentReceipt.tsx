import React from 'react';
import type { PaymentReceipt as ReceiptType, PaymentDetails } from '../types/merchantPayment';

interface Props {
  receipt: ReceiptType;
  details: PaymentDetails;
  selectedAccount: string;
}

export const PaymentReceipt: React.FC<Props> = ({ receipt, details, selectedAccount }) => {
  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-xl shadow-xl border border-gray-100 font-sans text-center">
      <div className="flex justify-center mb-4">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-3xl font-bold">✓</div>
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Payment Successful</h2>
      
      <div className="text-left bg-gray-50 p-5 rounded-lg space-y-4 text-sm text-gray-700 border border-gray-100">
        <div className="flex justify-between border-b pb-2">
          <span className="font-semibold">Merchant</span>
          <span className="text-gray-900">{details.merchantName}</span>
        </div>
        <div className="flex justify-between border-b pb-2">
          <span className="font-semibold">Amount</span>
          <span className="text-gray-900 font-bold">{receipt.amount.toLocaleString()} {receipt.currency}</span>
        </div>
        <div className="flex justify-between border-b pb-2">
          <span className="font-semibold">From Account</span>
          <span className="text-gray-900">****{selectedAccount.slice(-4)}</span>
        </div>
        <div className="flex justify-between border-b pb-2">
          <span className="font-semibold">Bank Transaction Ref</span>
          <span className="text-gray-900 text-xs font-mono">{receipt.coreLedgerReference || 'TXN-PENDING'}</span>
        </div>
        <div className="flex justify-between border-b pb-2">
          <span className="font-semibold">Payment Reference</span>
          <span className="text-gray-900 text-xs font-mono">{receipt.paymentToken}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-semibold">Date & Time</span>
          <span className="text-gray-900">{new Date(receipt.timestamp).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>

      <div className="mt-8 flex space-x-3">
        <button onClick={() => window.location.href = '/dashboard'} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-3 rounded-lg transition-colors">Done</button>
        <button onClick={() => window.print()} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors">Download Receipt</button>
      </div>
    </div>
  );
};
