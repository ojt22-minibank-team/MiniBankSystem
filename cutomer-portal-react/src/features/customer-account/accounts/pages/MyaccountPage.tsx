import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  ArrowLeft,
  RefreshCw,
  WalletCards,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "../../../../lib/redux";
import { fetchMyAccounts } from "../stores/accountsSlice";
import AccountCard from "../components/AccountCard";
import AccountDetailPage from "./AccountDetailPage";

function AccountsSkeleton() {
  const { t } = useTranslation("accounts");

  return (
    <div
      className="space-y-6"
      aria-busy="true"
      aria-label={t("loadingAccounts")}
    >
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

      <div className="space-y-5" aria-hidden="true">
        {[1, 2].map((item) => (
          <div
            key={item}
            className="h-60 animate-pulse rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="flex flex-col gap-6 lg:flex-row">
              <div className="h-48 w-80 rounded-2xl bg-slate-200" />
              <div className="flex-1 space-y-4">
                <div className="h-6 w-40 rounded-md bg-slate-200" />
                <div className="grid grid-cols-3 gap-3">
                  <div className="h-16 rounded-xl bg-slate-200" />
                  <div className="h-16 rounded-xl bg-slate-200" />
                  <div className="h-16 rounded-xl bg-slate-200" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="sr-only" role="status">
        {t("loadingAccounts")}
      </p>
    </div>
  );
}

interface AccountsErrorProps {
  onRetry: () => void;
}

function AccountsError({ onRetry }: AccountsErrorProps) {
  const { t } = useTranslation("accounts");

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
        {t("unableToLoadAccounts")}
      </h1>

      <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
        {t("accountsLoadError")}
      </p>

      <button
        type="button"
        onClick={onRetry}
        className="mt-5 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#00A3C4] to-[#0284C7] px-4 py-2 text-sm font-bold text-white shadow-sm shadow-cyan-500/25 transition-colors hover:from-[#0891B2] hover:to-[#0369A1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A3C4] focus-visible:ring-offset-2"
      >
        <RefreshCw size={15} aria-hidden="true" />
        {t("tryAgain")}
      </button>
    </section>
  );
}

function AccountsEmptyState() {
  const { t } = useTranslation("accounts");

  return (
    <section className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm sm:p-12">
      <div
        className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"
        aria-hidden="true"
      >
        <WalletCards size={28} />
      </div>

      <h2 className="mt-4 text-base font-bold text-[#0A192F]">
        {t("noAccountsFound")}
      </h2>

      <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
        {t("noAccountsDescription")}
      </p>
    </section>
  );
}

export default function MyAccountsPage() {
  const { t } = useTranslation("accounts");
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const { accounts, loading, error } = useAppSelector(
    (state) => state.accounts,
  );

  const [retryKey, setRetryKey] = useState(0);

  const locationState = location.state as { accountNumber?: string } | null;
  const [selectedAccountNumber, setSelectedAccountNumber] = useState<string | null>(
    locationState?.accountNumber || null,
  );

  useEffect(() => {
    void dispatch(fetchMyAccounts());
  }, [dispatch, retryKey]);

  useEffect(() => {
    if (locationState?.accountNumber) {
      setSelectedAccountNumber(locationState.accountNumber);
    } else {
      setSelectedAccountNumber(null);
    }
  }, [location.key, locationState?.accountNumber]);

  function handleRetry() {
    setRetryKey((key) => key + 1);
  }

  // 1. Loading state with no accounts yet
  if (loading && accounts.length === 0) {
    return (
      <main className="mx-auto max-w-7xl space-y-3.5 px-4 py-2.5 sm:px-6 sm:py-3.5 md:px-8">
        <AccountsSkeleton />
      </main>
    );
  }

  // 2. Error state
  if (error && accounts.length === 0) {
    return (
      <main className="mx-auto max-w-7xl space-y-3.5 px-4 py-2.5 sm:px-6 sm:py-3.5 md:px-8">
        <AccountsError onRetry={handleRetry} />
      </main>
    );
  }

  // 3. Empty accounts state
  if (!loading && accounts.length === 0) {
    return (
      <main className="mx-auto max-w-7xl space-y-3.5 px-4 py-2.5 sm:px-6 sm:py-3.5 md:px-8">
        <AccountsEmptyState />
      </main>
    );
  }

  // 4. Single Account Case: Customer has only 1 account!
  // Directly show detail view (no overview list, no view details button needed).
  if (accounts.length === 1) {
    return (
      <AccountDetailPage
        accountNumber={accounts[0].accountNumber}
        allAccounts={accounts}
        onSelectAccount={(accNo) => setSelectedAccountNumber(accNo)}
        onBack={() => navigate(-1)}
      />
    );
  }

  // 5. Multiple Accounts: If user selected an account (from Dashboard or View Details), show detail
  if (selectedAccountNumber) {
    return (
      <AccountDetailPage
        accountNumber={selectedAccountNumber}
        allAccounts={accounts}
        onSelectAccount={(accNo) => setSelectedAccountNumber(accNo)}
        onBack={() => {
          setSelectedAccountNumber(null);
          navigate(location.pathname, { replace: true, state: null });
        }}
      />
    );
  }

  // 6. Multiple Accounts Overview: Show the full Accounts list with AccountCards!
  return (
    <main
      className="mx-auto max-w-7xl space-y-3.5 px-4 py-2.5 sm:px-6 sm:py-3.5 md:px-8"
      aria-busy={loading}
    >
      {/* Header with Step-Back Arrow */}
      <header className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between pb-0.5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-2xs transition-all hover:border-[#00A3C4] hover:bg-cyan-50/50 hover:text-[#00A3C4]"
            title="Go back"
            aria-label="Go back"
          >
            <ArrowLeft size={16} />
          </button>

          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#0A192F]">
              {t("title", { defaultValue: "My Accounts" })}
            </h1>
            <p className="mt-0.5 text-xs font-medium text-slate-400">
              Manage your linked bank accounts and view details
            </p>
          </div>
        </div>

        {/* Account count pill */}
        <div className="self-start sm:self-auto rounded-full bg-white px-3 py-1 shadow-xs border border-slate-100 text-xs font-bold text-slate-700">
          {accounts.length} Accounts
        </div>
      </header>

      <section
        className="space-y-3.5"
        aria-label={t("title", { defaultValue: "My Accounts" })}
      >
        {accounts.map((account, index) => (
          <AccountCard
            key={account.accountNumber}
            account={account}
            index={index}
            onSelect={(accNo) => setSelectedAccountNumber(accNo)}
          />
        ))}
      </section>
    </main>
  );
}
