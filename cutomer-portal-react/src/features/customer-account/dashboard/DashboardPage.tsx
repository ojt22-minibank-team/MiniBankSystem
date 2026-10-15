import {
  ArrowRight,
  CreditCard,
  Eye,
  EyeOff,
  Send,
  UserRound,
  Landmark,
  WalletCards,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";

import AccountSummary from "./components/AccountSummary";
import RecentTransactions from "./components/RecentTransactions";

import { getCustomerDashboard } from "../api/dashboardApi";
import type { DashboardResponse } from "../types/dashboardTypes";

export default function DashboardPage() {
  // Balance is hidden by default for privacy
  const [showBalance, setShowBalance] = useState(false);

  const [dashboard, setDashboard] =
    useState<DashboardResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);
        setError(null);

        const data = await getCustomerDashboard();

        setDashboard(data);
      } catch (err) {
        console.error("Dashboard loading failed:", err);

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load dashboard."
        );
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  const totalBalance = dashboard?.totalBalance ?? 0;

  const formattedBalance = totalBalance.toLocaleString("en-MM", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const accountCount = dashboard?.accountCount ?? 0;

  return (
    <div className="mx-auto max-w-[1600px] space-y-8">

      {/* =====================================================
          ERROR
      ====================================================== */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}
      {/* =====================================================
    WELCOME HEADER
====================================================== */}
<section className="mb-8 flex flex-col gap-5 border-b border-slate-200/80 pb-6 sm:flex-row sm:items-center sm:justify-between">
  {/* Welcome Content */}
  <div className="flex items-center gap-4">
    {/* Welcome Icon */}
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#0878E8]">
      <UserRound size={23} strokeWidth={1.8} />
    </div>

    <div>
      {/* Small Label */}
      <div className="flex items-center gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Welcome back
        </p>

        <span className="h-1 w-1 rounded-full bg-slate-300" />

        <span className="text-xs font-medium text-slate-400">
          Customer Portal
        </span>
      </div>

      {/* Customer Name */}
      <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#08295C] sm:text-3xl">
        {loading ? (
          <span className="block h-8 w-52 animate-pulse rounded-md bg-slate-200" />
        ) : (
          dashboard?.fullName || "Guest"
        )}
      </h1>

      {/* Description */}
      <p className="mt-1 text-sm text-slate-500">
        Here's your account overview and recent activity.
      </p>
    </div>
  </div>
</section>
      {/* =====================================================
    TOTAL BALANCE - Left-Aligned Modern Fintech Style
====================================================== */}
      <section>
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0878E8] via-[#176FE0] to-[#0755B8] p-6 shadow-md ring-1 ring-white/10 sm:p-8">

          {/* Subtle Background Glows */}
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-blue-300/20 blur-3xl" />

          <div className="pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-cyan-300/10 blur-2xl" />

          {/* Decorative Background Shape */}
          <div className="pointer-events-none absolute right-[-80px] top-1/2 h-64 w-64 -translate-y-1/2 rounded-full border-[28px] border-blue-300/10" />

          <div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-center">

            {/* Left Column: Label & Balance */}
            <div className="space-y-2">

              {/* Total Balance */}
              <div className="flex items-center gap-2">

                <WalletCards
                  size={16}
                  className="text-blue-100/90"
                />

                <span className="text-xs font-semibold uppercase tracking-wider text-blue-100/90">
                  Total Balance
                </span>

                <span className="h-1 w-1 rounded-full bg-blue-100/60" />

                <span className="text-xs text-blue-50/80">
                  Across all accounts
                </span>

                {/* Eye Toggle */}
                <button
                  type="button"
                  onClick={() => setShowBalance((v) => !v)}
                  aria-label={
                    showBalance
                      ? "Hide total balance"
                      : "Show total balance"
                  }
                  title={
                    showBalance
                      ? "Hide total balance"
                      : "Show total balance"
                  }
                  className="inline-flex items-center justify-center rounded-full p-1 text-blue-100/80 transition hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
                >
                  {showBalance ? (
                    <EyeOff size={15} />
                  ) : (
                    <Eye size={15} />
                  )}
                </button>
              </div>

              {/* Balance Display */}
              <div className="flex items-baseline gap-2 pt-1">

                <span className="text-xl font-bold text-blue-100">
                  MMK
                </span>

                <div className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                  {loading ? (
                    <span className="inline-block h-10 w-52 animate-pulse rounded-lg bg-white/10 align-middle" />
                  ) : showBalance ? (
                    formattedBalance
                  ) : (
                    <span className="tracking-widest text-blue-100/80">
                      * * * * * *
                    </span>
                  )}
                </div>
              </div>

              {/* Status & Account Badges */}
              <div className="flex items-center gap-2.5 pt-2">

                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-300/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-100 ring-1 ring-inset ring-emerald-200/20">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300" />
                  Active
                </span>

                <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium text-blue-50/90 ring-1 ring-inset ring-white/10">
                  {loading
                    ? "..."
                    : `${accountCount} Linked Accounts`}
                </span>

              </div>
            </div>

            {/* Right Decorative Bank Icon */}
            <div className="pointer-events-none absolute -right-5 top-1/2 hidden -translate-y-1/2 sm:block">

              <Landmark
                size={165}
                strokeWidth={1.2}
                className="text-blue-100/30"
              />

            </div>
          </div>
        </div>
      </section>


      {/* QUICK ACTIONS */}
      <section>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

          {/* My Account */}
          <Link
            to="/accounts"
            className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:border-blue-300 hover:bg-blue-50/40 hover:shadow-md"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[#0878E8] transition-colors duration-200 group-hover:bg-[#0878E8] group-hover:text-white">
                <WalletCards size={24} />
              </div>

              <div>
                <h3 className="text-sm font-bold text-[#08295C]">
                  My Account
                </h3>

                <p className="mt-1 text-xs text-slate-400">
                  View account details
                </p>
              </div>
            </div>

            <ArrowRight
              size={20}
              className="shrink-0 text-slate-400 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-[#0878E8]"
            />
          </Link>

          {/* Transfer Money */}
          <Link
            to="/transfer"
            className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:border-blue-300 hover:bg-blue-50/40 hover:shadow-md"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[#0878E8] transition-colors duration-200 group-hover:bg-[#0878E8] group-hover:text-white">
                <Send size={24} />
              </div>

              <div>
                <h3 className="text-sm font-bold text-[#08295C]">
                  Transfer Money
                </h3>

                <p className="mt-1 text-xs text-slate-400">
                  Send money easily
                </p>
              </div>
            </div>

            <ArrowRight
              size={20}
              className="shrink-0 text-slate-400 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-[#0878E8]"
            />
          </Link>

          {/* Transaction History */}
          <Link
            to="/transaction"
            className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:border-blue-300 hover:bg-blue-50/40 hover:shadow-md"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[#0878E8] transition-colors duration-200 group-hover:bg-[#0878E8] group-hover:text-white">
                <CreditCard size={24} />
              </div>

              <div>
                <h3 className="text-sm font-bold text-[#08295C]">
                  Transaction History
                </h3>

                <p className="mt-1 text-xs text-slate-400">
                  Check your past transactions
                </p>
              </div>
            </div>

            <ArrowRight
              size={20}
              className="shrink-0 text-slate-400 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-[#0878E8]"
            />
          </Link>

        </div>
      </section>
      {/* =====================================================
    MY ACCOUNTS
====================================================== */}
      <section>


        <AccountSummary accounts={dashboard?.accounts ?? []} />
      </section>

      {/* =====================================================
          RECENT TRANSACTIONS
      ====================================================== */}
      <section>


        <RecentTransactions />
      </section>

    </div>
  );
}