import { useEffect, useState } from "react";
import { WalletCards, AlertCircle } from "lucide-react";

import { getMyAccounts } from "../api/customerAccountApi";
import type { CustomerAccount } from "../types/accountTypes";


import AccountCard from "./components/AccountCard";

export default function MyAccountsPage() {
  const [accounts, setAccounts] = useState<CustomerAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAccounts = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await getMyAccounts();

        setAccounts(data);
      } catch (err) {
        console.error("Failed to load accounts:", err);

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load accounts."
        );
      } finally {
        setLoading(false);
      }
    };

    loadAccounts();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-sm text-slate-500">
          Loading accounts...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-7xl p-8">
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-8">

      {/* Page Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-blue-50 p-3 text-blue-700">
            <WalletCards size={24} />
          </div>

          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              My Accounts
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              View and manage your bank accounts
            </p>
          </div>
        </div>
      </div>

      {/* Account Count */}
      <div className="text-sm text-slate-500">
        {accounts.length}{" "}
        {accounts.length === 1 ? "account" : "accounts"}
      </div>

      {/* Accounts */}
      {accounts.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <WalletCards
            size={40}
            className="mx-auto text-slate-300"
          />

          <h2 className="mt-4 text-lg font-semibold text-slate-800">
            No accounts found
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            You currently don't have any accounts.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {accounts.map((account) => (
            <AccountCard
              key={account.accountNumber}
              account={account}
            />
          ))}
        </div>
      )}
    </div>
  );
}