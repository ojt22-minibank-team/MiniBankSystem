
import { useEffect, useState } from "react";
import {
  AlertCircle,
  RefreshCw,
  WalletCards,
} from "lucide-react";
import { Link } from "react-router-dom";

import { getMyAccounts } from "../api/customerAccountApi";
import type { CustomerAccount } from "../types/accountTypes";
import AccountCard from "./components/AccountCard";

function AccountsSkeleton() {
  return (
    <div
      className="space-y-6"
      aria-busy="true"
      aria-label="Loading accounts"
    >
      {/* Header Skeleton */}
      <div
        className="flex animate-pulse items-center gap-3.5"
        aria-hidden="true"
      >
        <div className="h-12 w-12 rounded-2xl bg-slate-200" />

        <div className="space-y-2">
          <div className="h-6 w-36 rounded-md bg-slate-200" />
          <div className="h-3.5 w-52 rounded-md bg-slate-200" />
        </div>
      </div>

      {/* Account Cards Skeleton */}
      <div
        className="grid grid-cols-1 gap-5 lg:grid-cols-2"
        aria-hidden="true"
      >
        {[1, 2, 3, 4].map((item) => (
          <div
            key={item}
            className="h-56 animate-pulse rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="flex justify-between">
              <div className="h-12 w-12 rounded-xl bg-slate-200" />
              <div className="h-6 w-20 rounded-full bg-slate-200" />
            </div>

            <div className="mt-8 space-y-3">
              <div className="h-4 w-1/2 rounded-md bg-slate-200" />
              <div className="h-7 w-1/3 rounded-md bg-slate-200" />
            </div>

            <div className="mt-6 border-t border-slate-100 pt-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="h-4 rounded-md bg-slate-200" />
                <div className="h-4 rounded-md bg-slate-200" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Single screen-reader loading announcement */}
      <p className="sr-only" role="status">
        Loading your accounts. Please wait.
      </p>
    </div>
  );
}

interface AccountsErrorProps {
  onRetry: () => void;
}

function AccountsError({ onRetry }: AccountsErrorProps) {
  return (
    <section
      className="flex flex-col items-center justify-center rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm sm:p-10"
      role="alert"
    >
      <div
        className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600"
        aria-hidden="true"
      >
        <AlertCircle size={24} />
      </div>

      <h1 className="mt-4 text-base font-bold text-slate-900">
        Unable to Load Accounts
      </h1>

      <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
        We couldn't retrieve your account information right now.
        Please try again. If the problem continues, contact your bank.
      </p>

      <button
        type="button"
        onClick={onRetry}
        className="mt-5 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#0878E8] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0878E8] focus-visible:ring-offset-2"
      >
        <RefreshCw size={15} aria-hidden="true" />
        Try Again
      </button>
    </section>
  );
}

function AccountsEmptyState() {
  return (
    <section className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm sm:p-12">
      <div
        className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"
        aria-hidden="true"
      >
        <WalletCards size={28} />
      </div>

      <h2 className="mt-4 text-base font-bold text-[#172033]">
        No Accounts Found
      </h2>

      <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
        You don't have any accounts linked to your profile yet.
        Please contact your bank if you believe this is incorrect.
      </p>
    </section>
  );
}

export default function MyAccountsPage() {
  const [accounts, setAccounts] = useState<CustomerAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadAccounts() {
      setLoading(true);
      setError(false);

      try {
        const data: unknown = await getMyAccounts();

        // Validate the response shape before using array operations.
        if (!Array.isArray(data)) {
          throw new Error("Invalid accounts response");
        }

        if (cancelled) return;

        setAccounts(data as CustomerAccount[]);
      } catch (err: unknown) {
        if (import.meta.env.DEV) {
          console.error("Failed to load customer accounts:", err);
        }

        if (cancelled) return;

        setError(true);
        setAccounts([]);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadAccounts();

    return () => {
      cancelled = true;
    };
  }, [retryCount]);

  function handleRetry() {
    setRetryCount((count) => count + 1);
  }

  return (
    <main
      className="mx-auto max-w-7xl space-y-6 p-6 md:p-8"
      aria-busy={loading}
    >
      {loading ? (
        <AccountsSkeleton />
      ) : error ? (
        <AccountsError onRetry={handleRetry} />
      ) : (
        <>
          {/* Page Header */}
          <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3.5">

              <div className="min-w-0">
                {/* Breadcrumb */}
                <nav
                  aria-label="Breadcrumb"
                  className="mb-1 flex flex-wrap items-center gap-2 text-xs font-semibold"
                >
                  <Link
                    to="/dashboard"
                    className="text-slate-500 transition-colors hover:text-[#0878E8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0878E8] focus-visible:ring-offset-2"
                  >
                    Dashboard
                  </Link>

                  <span
                    className="text-slate-300"
                    aria-hidden="true"
                  >
                    /
                  </span>

                  <span
                    className="text-[#0878E8]"
                    aria-current="page"
                  >
                    My Accounts
                  </span>
                </nav>
              </div>
            </div>
          </header>

          {/* Accounts Grid or Empty State */}
          {accounts.length === 0 ? (
            <AccountsEmptyState />
          ) : (
            <section
              className="grid grid-cols-1 gap-5 lg:grid-cols-2"
              aria-label="Your bank accounts"
            >
              {accounts.map((account) => (
                <AccountCard
                  key={account.accountNumber}
                  account={account}
                />
              ))}
            </section>
          )}
        </>
      )}
    </main>
  );
}
