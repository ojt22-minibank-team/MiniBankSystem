import { useEffect, useState } from "react";
import { WalletCards, AlertCircle, RefreshCw } from "lucide-react";

import { getMyAccounts } from "../api/customerAccountApi";
import type { CustomerAccount } from "../types/accountTypes";
import AccountCard from "./components/AccountCard";

export default function MyAccountsPage() {
  const [accounts, setAccounts] = useState<CustomerAccount[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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
          : "Failed to load accounts. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  /* =====================================================
      SKELETON LOADING STATE
  ====================================================== */
  if (loading) {
    return (
      <div className="mx-auto max-w-7xl space-y-6 p-6 md:p-8">
        {/* Header Skeleton */}
        <div className="flex animate-pulse items-center gap-3.5">
          <div className="h-12 w-12 rounded-2xl bg-slate-200" />
          <div className="space-y-2">
            <div className="h-6 w-36 rounded-md bg-slate-200" />
            <div className="h-3.5 w-52 rounded-md bg-slate-200" />
          </div>
        </div>

        {/* Account Cards Skeleton Grid */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-44 animate-pulse rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs"
            >
              <div className="flex justify-between">
                <div className="h-10 w-10 rounded-xl bg-slate-200" />
                <div className="h-6 w-20 rounded-full bg-slate-200" />
              </div>
              <div className="mt-8 space-y-3">
                <div className="h-4 w-1/2 rounded-md bg-slate-200" />
                <div className="h-7 w-1/3 rounded-md bg-slate-200" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* =====================================================
      ERROR STATE WITH RETRY
  ====================================================== */
  if (error) {
    return (
      <div className="mx-auto max-w-7xl p-6 md:p-8">
        <div className="flex flex-col items-center justify-center rounded-2xl border border-red-200/80 bg-red-50/50 p-8 text-center text-red-700 shadow-xs">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 text-red-600">
            <AlertCircle size={24} />
          </div>
          <h3 className="mt-3 text-base font-bold text-red-900">
            Unable to Load Accounts
          </h3>
          <p className="mt-1 text-xs text-red-600/90">{error}</p>

          <button
            type="button"
            onClick={loadAccounts}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-300"
          >
            <RefreshCw size={14} />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  /* =====================================================
      MAIN CONTENT
  ====================================================== */
  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 md:p-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[#0878E8] shadow-xs">
            <WalletCards size={24} />
          </div>

          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-[#172033]">
                My Accounts
              </h1>
              <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-[#0878E8]">
                {accounts.length} {accounts.length === 1 ? "Account" : "Accounts"}
              </span>
            </div>

            <p className="mt-0.5 text-xs font-medium text-slate-500">
              View and manage your bank accounts
            </p>
          </div>
        </div>
      </div>

      {/* Account Cards Grid OR Empty State */}
      {accounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-xs">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <WalletCards size={28} />
          </div>

          <h2 className="mt-4 text-base font-bold text-[#172033]">
            No Accounts Found
          </h2>

          <p className="mt-1 max-w-sm text-xs font-medium text-slate-500">
            You currently don't have any active accounts linked to your profile.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {accounts.map((account) => (
            <AccountCard key={account.accountNumber} account={account} />
          ))}
        </div>
      )}
    </div>
  );
}