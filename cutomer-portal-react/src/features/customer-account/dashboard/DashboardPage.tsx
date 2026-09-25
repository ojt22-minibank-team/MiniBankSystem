import {
  ArrowRight,
  CreditCard,
  Eye,
  EyeOff,
  Send,
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
      <section className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

        <div>
          <p className="text-sm font-medium text-slate-500">
            Welcome back,
          </p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#172033]">
            {loading ? "Loading..." : dashboard?.fullName}
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Here's your account overview.
          </p>
        </div>

        {/* Transfer */}
        <Link
          to="/transfer"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#0878E8] px-5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-[#0668CB] hover:shadow-md focus:outline-none focus:ring-4 focus:ring-blue-100"
        >
          <Send size={17} />
          Transfer Money
        </Link>
      </section>

      {/* =====================================================
          TOTAL BALANCE
      ====================================================== */}
      <section>
        <div className="relative overflow-hidden rounded-2xl bg-[#08295C] px-6 py-8 shadow-sm sm:px-8 sm:py-10">

          {/* Decorative Circles */}
          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-white/[0.04]" />

          <div className="pointer-events-none absolute -bottom-32 left-1/3 h-64 w-64 rounded-full bg-blue-400/[0.04]" />

          {/* Content */}
          <div className="relative flex flex-col items-center text-center">

            {/* Label */}
            <p className="text-sm font-medium text-blue-200">
              Total Balance
            </p>

            <p className="mt-1 text-xs text-blue-300">
              Across all your accounts
            </p>

            {/* Amount */}
            <div className="mt-5 flex items-center justify-center gap-3">

              <p className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                {loading
                  ? "Loading..."
                  : showBalance
                    ? `MMK ${formattedBalance}`
                    : "MMK ••••••••••"}
              </p>

              {/* Show / Hide */}
              <button
                type="button"
                onClick={() =>
                  setShowBalance((value) => !value)
                }
                aria-label={
                  showBalance
                    ? "Hide total balance"
                    : "Show total balance"
                }
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-blue-100 transition hover:bg-white/15 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/30"
              >
                {showBalance ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>

            {/* Account Information */}
            <div className="mt-5 flex items-center gap-2">

              <span className="rounded-full bg-emerald-400/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">
                Active
              </span>

              <span className="text-xs text-blue-200">
                {loading
                  ? "Loading accounts..."
                  : `${accountCount} accounts`}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          QUICK ACTIONS
      ====================================================== */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-bold text-[#172033]">
            Quick Actions
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Common banking tasks
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">

          {/* My Accounts */}
          <Link
            to="/accounts"
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-[#0878E8] transition group-hover:bg-[#0878E8] group-hover:text-white">
              <WalletCards size={19} />
            </div>

            <p className="mt-4 text-sm font-semibold text-slate-800">
              My Accounts
            </p>

            <p className="mt-1 text-xs text-slate-500">
              View your accounts
            </p>

            <ArrowRight
              size={15}
              className="mt-4 text-slate-300 transition group-hover:translate-x-1 group-hover:text-[#0878E8]"
            />
          </Link>

          {/* Transfer */}
          <Link
            to="/transfer"
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-[#0878E8] transition group-hover:bg-[#0878E8] group-hover:text-white">
              <Send size={19} />
            </div>

            <p className="mt-4 text-sm font-semibold text-slate-800">
              Transfer Money
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Send money securely
            </p>

            <ArrowRight
              size={15}
              className="mt-4 text-slate-300 transition group-hover:translate-x-1 group-hover:text-[#0878E8]"
            />
          </Link>

          {/* Transactions */}
          <Link
            to="/transaction"
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-[#0878E8] transition group-hover:bg-[#0878E8] group-hover:text-white">
              <CreditCard size={19} />
            </div>

            <p className="mt-4 text-sm font-semibold text-slate-800">
              Transactions
            </p>

            <p className="mt-1 text-xs text-slate-500">
              View transaction history
            </p>

            <ArrowRight
              size={15}
              className="mt-4 text-slate-300 transition group-hover:translate-x-1 group-hover:text-[#0878E8]"
            />
          </Link>
        </div>
      </section>

      {/* =====================================================
          MY ACCOUNTS
      ====================================================== */}
      <section>

        <div className="mb-4 flex items-end justify-between">

          <div>
            <h2 className="text-lg font-bold text-[#172033]">
              My Accounts
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Your active bank accounts
            </p>
          </div>

          <Link
            to="/accounts"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0878E8] transition hover:text-[#0668CB]"
          >
            View all
            <ArrowRight size={16} />
          </Link>
        </div>

        <AccountSummary />
      </section>

      {/* =====================================================
          RECENT TRANSACTIONS
      ====================================================== */}
      <section>

        <div className="mb-4 flex items-end justify-between">

          <div>
            <h2 className="text-lg font-bold text-[#172033]">
              Recent Transactions
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Your latest account activity
            </p>
          </div>

          <Link
            to="/transaction"
            className="hidden items-center gap-1.5 text-sm font-semibold text-[#0878E8] transition hover:text-[#0668CB] sm:inline-flex"
          >
            View history
            <ArrowRight size={16} />
          </Link>
        </div>

        <RecentTransactions />
      </section>

    </div>
  );
}