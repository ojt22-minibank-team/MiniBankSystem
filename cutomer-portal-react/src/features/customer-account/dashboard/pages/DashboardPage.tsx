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
import RecentTransactions from "../components/RecentTransactions";
import TotalBalanceCard from "../components/TotalBalanceCard";

import { getCustomerDashboard } from "../api/dashboardApi.ts";
import type { DashboardResponse } from "../types/dashboardTypes";

function getDashboardErrorMessage(
  error: unknown,
  fallbackMessage: string,
): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error
  ) {
    const response = (
      error as {
        response?: {
          data?: {
            message?: string;
          };
        };
      }
    ).response;

    if (response?.data?.message) {
      return response.data.message;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallbackMessage;
}

export default function DashboardPage() {
  const { t } = useTranslation("dashboard");
  const { t: tCommon } = useTranslation("common");

  const [showBalance, setShowBalance] = useState(false);
  const [dashboard, setDashboard] =
    useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      setLoading(true);
      setError(null);

      try {
        const data = await getCustomerDashboard();

        if (!cancelled) {
          setDashboard(data);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(
            getDashboardErrorMessage(
              err,
              t("loadErrorFallback"),
            ),
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [retryCount, t]);

  const totalBalance = dashboard?.totalBalance ?? 0;
  const accountCount = dashboard?.accountCount ?? 0;
  const isCompany =
    dashboard?.customerType?.toUpperCase() === "COMPANY";

  return (
    <div className="mx-auto max-w-[1600px] space-y-8">
      {/* Welcome Header */}
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
              {loading ? (
                <span
                  aria-label={t("customer")}
                  className="block h-8 w-52 animate-pulse rounded-md bg-slate-200"
                />
              ) : (
                dashboard?.fullName ?? t("customer")
              )}
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              {t("overviewDescription")}
            </p>
          </div>
        </div>
      </section>

      {/* Dashboard Error */}
      {error && (
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
            onClick={() => setRetryCount((count) => count + 1)}
            disabled={loading}
            className="mt-3 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t("tryAgain")}
          </button>
        </section>
      )}

      {/* Dashboard Content */}
      {(!error || dashboard !== null) && (
        <>
          <TotalBalanceCard
            totalBalance={totalBalance}
            accountCount={accountCount}
            showBalance={showBalance}
            loading={loading}
            onToggleBalance={() =>
              setShowBalance((visible) => !visible)
            }
          />

          {/* Quick Actions */}
          {!loading && dashboard && (
            <section aria-label={t("quickActions")}>
              <div
                className={`grid grid-cols-1 gap-4 ${
                  isCompany ? "md:grid-cols-2" : "md:grid-cols-3"
                }`}
              >
                {/* My Account */}
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

                {/* Transfer — Personal customers only */}
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

                {/* Transaction History */}
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
          )}

          {/* My Accounts */}
          <section aria-label={t("myAccounts")}>
            {loading ? (
              <div
                aria-label={t("loadingAccounts")}
                className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
              >
                {[1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="h-44 animate-pulse rounded-xl border border-slate-200 bg-white"
                  />
                ))}
              </div>
            ) : dashboard ? (
              <AccountSummary accounts={dashboard.accounts} />
            ) : null}
          </section>

          {/* Recent Transactions */}
          {!loading && dashboard && <RecentTransactions />}
        </>
      )}
    </div>
  );
}
