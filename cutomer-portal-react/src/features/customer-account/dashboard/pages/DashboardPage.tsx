
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  CreditCard,
  Send,
  UserRound,
  WalletCards,
} from "lucide-react";
import { Link } from "react-router-dom";

import AccountSummary from "../components/AccountSummary";
import DashboardSkeleton from "../components/DashboardSkeleton";
import RecentTransactions from "../components/RecentTransactions";
import TotalBalanceCard from "../components/TotalBalanceCard";

import { fetchDashboard } from "../store/dashboardSlice";
import {
  useAppDispatch,
  useAppSelector,
} from "../../../../lib/redux";

export default function DashboardPage() {
  const dispatch = useAppDispatch();

  const { data: dashboard, status, error } = useAppSelector(
    (state) => state.dashboard,
  );

  const { t } = useTranslation("dashboard");
  const { t: tCommon } = useTranslation("common");

  // UI-only state stays local.
  const [showBalance, setShowBalance] = useState(false);

  useEffect(() => {
    const request = dispatch(fetchDashboard());

    return () => {
      request.abort();
    };
  }, [dispatch]);

  const initialLoading =
    dashboard === null &&
    (status === "idle" || status === "pending");

  const refreshing = status === "pending" && dashboard !== null;
  const hasError = status === "failed" && error !== null;

  const totalBalance = dashboard?.totalBalance ?? 0;
  const accountCount = dashboard?.accountCount ?? 0;

  const isCompany =
    dashboard?.customerType?.toUpperCase() === "COMPANY";

  const handleRetry = () => {
    void dispatch(fetchDashboard());
  };

  return (
    <div className="mx-auto max-w-[1600px] space-y-8">
      {/* Initial loading skeleton */}
      {initialLoading && (
        <DashboardSkeleton
          label={t("loadingDashboard", {
            defaultValue: "Loading dashboard",
          })}
        />
      )}

      {/* Dashboard error */}
      {hasError && (
        <section
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4"
        >
          <p className="text-sm font-semibold text-red-700">
            {t("loadError")}
          </p>

          <p className="mt-1 text-sm text-red-600">{error}</p>

          <button
            type="button"
            onClick={handleRetry}
            className="mt-3 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 focus:outline-none focus:ring-4 focus:ring-red-100"
          >
            {t("tryAgain")}
          </button>
        </section>
      )}

      {/* Dashboard content */}
      {dashboard && (
        <>
          {/* Welcome header */}
          <section className="flex flex-col gap-5 border-b border-slate-200/80 pb-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#0878E8]">
                <UserRound size={23} strokeWidth={1.8} />
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    {t("welcome", { name: "" }).replace(/,\s*$/, "")}
                  </p>

                  <span
                    aria-hidden="true"
                    className="h-1 w-1 rounded-full bg-slate-300"
                  />

                  <span className="text-xs font-medium text-slate-400">
                    {tCommon("customerPortal")}
                  </span>
                </div>

                <h1 className="mt-1 break-words text-2xl font-extrabold tracking-tight text-[#08295C] sm:text-3xl">
                  {dashboard.fullName || t("customer")}
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  {t("overviewDescription")}
                </p>
              </div>
            </div>
          </section>

          {/* Refresh indicator */}
          {refreshing && (
            <p role="status" className="text-xs text-slate-500">
              {t("refreshingDashboard", {
                defaultValue: "Refreshing dashboard...",
              })}
            </p>
          )}

          {/* Total balance */}
          <TotalBalanceCard
            totalBalance={totalBalance}
            accountCount={accountCount}
            showBalance={showBalance}
            loading={false}
            onToggleBalance={() =>
              setShowBalance((visible) => !visible)
            }
          />

          {/* Quick actions */}
          <section aria-label={t("quickActions")}>
            <div
              className={`grid grid-cols-1 gap-4 ${
                isCompany ? "md:grid-cols-2" : "md:grid-cols-3"
              }`}
            >
              {/* My accounts */}
              <Link
                to="/accounts"
                className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:border-blue-300 hover:bg-blue-50/40 hover:shadow-md"
              >
                <div className="flex min-w-0 items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[#0878E8] transition-colors duration-200 group-hover:bg-[#0878E8] group-hover:text-white">
                    <WalletCards size={24} />
                  </div>

                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-[#08295C]">
                      {t("myAccounts")}
                    </h3>

                    <p className="mt-1 text-xs text-slate-400">
                      {t("viewAccountDetails")}
                    </p>
                  </div>
                </div>

                <ArrowRight
                  size={20}
                  aria-hidden="true"
                  className="shrink-0 text-slate-400 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-[#0878E8]"
                />
              </Link>

              {/* Transfer: personal customers only */}
              {!isCompany && (
                <Link
                  to="/transfer"
                  className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:border-blue-300 hover:bg-blue-50/40 hover:shadow-md"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[#0878E8] transition-colors duration-200 group-hover:bg-[#0878E8] group-hover:text-white">
                      <Send size={24} />
                    </div>

                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-[#08295C]">
                        {t("transferMoney")}
                      </h3>

                      <p className="mt-1 text-xs text-slate-400">
                        {t("sendMoneyEasily")}
                      </p>
                    </div>
                  </div>

                  <ArrowRight
                    size={20}
                    aria-hidden="true"
                    className="shrink-0 text-slate-400 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-[#0878E8]"
                  />
                </Link>
              )}

              {/* Transaction history */}
              <Link
                to="/transaction"
                className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:border-blue-300 hover:bg-blue-50/40 hover:shadow-md"
              >
                <div className="flex min-w-0 items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[#0878E8] transition-colors duration-200 group-hover:bg-[#0878E8] group-hover:text-white">
                    <CreditCard size={24} />
                  </div>

                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-[#08295C]">
                      {t("transactionHistory")}
                    </h3>

                    <p className="mt-1 text-xs text-slate-400">
                      {t("checkPastTransactions")}
                    </p>
                  </div>
                </div>

                <ArrowRight
                  size={20}
                  aria-hidden="true"
                  className="shrink-0 text-slate-400 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-[#0878E8]"
                />
              </Link>
            </div>
          </section>

          {/* Account summary */}
          <section aria-label={t("myAccounts")}>
            <AccountSummary accounts={dashboard.accounts} />
          </section>

          {/* Recent transactions */}
          <RecentTransactions />
        </>
      )}
    </div>
  );
}
