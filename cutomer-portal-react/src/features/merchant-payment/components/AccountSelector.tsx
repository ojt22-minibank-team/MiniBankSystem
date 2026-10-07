import React from 'react';
import type{ CustomerAccount } from '../types/merchantPayment';

interface Props {
  accounts: CustomerAccount[];
  selectedAccountId: string;
  onSelect: (accountId: string) => void;
}

export const AccountSelector: React.FC<Props> = ({ accounts, selectedAccountId, onSelect }) => {
  if (accounts.length === 0) {
    return <div className="text-red-500 text-sm">No active accounts found.</div>;
  }

  return (
    <div className="mb-6 text-left">
      <label className="block text-sm font-semibold text-gray-700 mb-2">Pay From</label>
      <select 
        value={selectedAccountId}
        onChange={(e) => onSelect(e.target.value)}
        className="w-full py-3 px-4 border border-gray-300 bg-gray-50 focus:bg-white rounded-lg text-gray-800 text-base font-medium outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none cursor-pointer"
      >
        <option value="" disabled>Select an account</option>
        {accounts.map(acc => (
          <option key={acc.accountNumber} value={acc.accountNumber}>
            {acc.accountType} - ****{acc.accountNumber.slice(-4)} (Available: {acc.availableBalance.toLocaleString()} {acc.currency})
          </option>
        ))}
      </select>
    </div>
  );
};
