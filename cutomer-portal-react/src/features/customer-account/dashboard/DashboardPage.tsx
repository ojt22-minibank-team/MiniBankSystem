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
<section className="mb-8 flex flex-col gap-6 border-b border-slate-200/80 pb-6 sm:flex-row sm:items-end sm:justify-between">
  
  {/* Text Content */}
  <div className="space-y-1">
    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
      Welcome back
    </p>

    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
      {loading ? (
        <span className="mt-1 block h-9 w-48 animate-pulse rounded-md bg-slate-200" />
      ) : (
        dashboard?.fullName || "Guest"
      )}
    </h1>

    <p className="text-sm text-slate-500">
      Here's your account overview and recent activity.
    </p>
  </div>

  {/* CTA Action */}
  <div className="mt-2 sm:mt-0">
    <Link
      to="/transfer"
      className="group inline-flex h-11 items-center justify-center gap-2.5 rounded-lg bg-[#0878E8] px-6 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-[#0668CB] hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0878E8]"
    >
      <Send 
        size={16} 
        className="transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" 
      />
      Transfer Money
    </Link>
  </div>

</section>
      {/* =====================================================
    TOTAL BALANCE - Left-Aligned Modern Fintech Style
====================================================== */}
<section>
  <div className="relative overflow-hidden rounded-2xl bg-[#08295C] p-6 shadow-md ring-1 ring-white/10 sm:p-8">
    {/* Subtle Radial Glows */}
    <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-blue-500/20 blur-3xl" />
    <div className="pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-emerald-500/10 blur-2xl" />

    <div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
      
      {/* Left Column: Label & Balance */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-300/80">
            Total Balance
          </span>
          <span className="h-1 w-1 rounded-full bg-blue-400/50" />
          <span className="text-xs text-blue-200/70">Across all accounts</span>
        </div>

        {/* Balance Display */}
        <div className="flex items-baseline gap-2 pt-1">
          <span className="text-xl font-bold text-blue-300">MMK</span>
          <div className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            {loading ? (
              <span className="inline-block h-10 w-52 animate-pulse rounded-lg bg-white/10 align-middle" />
            ) : showBalance ? (
              formattedBalance
            ) : (
          <span className="tracking-widest text-blue-200">* * * * * * </span>
            )}
          </div>
        </div>

        {/* Status & Account Badges */}
        <div className="flex items-center gap-2.5 pt-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-300 ring-1 ring-inset ring-emerald-400/20">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Active
          </span>
          <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-xs font-medium text-blue-200/80 ring-1 ring-inset ring-white/10">
            {loading ? "..." : `${accountCount} Linked Accounts`}
          </span>
        </div>
      </div>

      {/* Right Column: Toggle Visibility Button */}
      <div className="self-start sm:self-center">
        <button
          type="button"
          onClick={() => setShowBalance((v) => !v)}
          aria-label={showBalance ? "Hide total balance" : "Show total balance"}
          className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3.5 py-2 text-xs font-semibold text-blue-100 backdrop-blur-md transition-all hover:bg-white/20 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
        >
          {showBalance ? <EyeOff size={15} /> : <Eye size={15} />}
          <span>{showBalance ? "Hide" : "Show"}</span>
        </button>
      </div>

    </div>
  </div>
</section>



  {/* QUICK ACTIONS */}
  <section>
    <div className="mb-4">
      <h2 className="text-lg font-bold tracking-tight text-slate-900">
        Quick Actions
      </h2>
      <p className="text-xs text-slate-500">
        Common everyday banking operations
      </p>
    </div>

    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">

      {/* My Accounts */}
      <Link
        to="/accounts"
        className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-blue-300 hover:shadow-md"
      >
        <div className="flex items-center justify-between">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-[#0878E8] transition-colors duration-200 group-hover:bg-[#0878E8] group-hover:text-white">
            <WalletCards size={20} />
          </div>
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-50 text-slate-400 transition-all duration-200 group-hover:bg-blue-50 group-hover:text-[#0878E8]">
            <ArrowRight size={14} className="transition-transform duration-200 group-hover:translate-x-0.5" />
          </span>
        </div>

        <div className="mt-5">
          <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#0878E8] transition-colors">
            My Accounts
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            View balances & details
          </p>
        </div>
      </Link>

      {/* Transfer */}
      <Link
        to="/transfer"
        className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-blue-300 hover:shadow-md"
      >
        <div className="flex items-center justify-between">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 transition-colors duration-200 group-hover:bg-emerald-600 group-hover:text-white">
            <Send size={20} />
          </div>
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-50 text-slate-400 transition-all duration-200 group-hover:bg-emerald-50 group-hover:text-emerald-600">
            <ArrowRight size={14} className="transition-transform duration-200 group-hover:translate-x-0.5" />
          </span>
        </div>

        <div className="mt-5">
          <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
            Transfer Money
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Send money securely
          </p>
        </div>
      </Link>

      {/* Transactions */}
      <Link
        to="/transaction"
        className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-blue-300 hover:shadow-md"
      >
        <div className="flex items-center justify-between">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 transition-colors duration-200 group-hover:bg-indigo-600 group-hover:text-white">
            <CreditCard size={20} />
          </div>
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-50 text-slate-400 transition-all duration-200 group-hover:bg-indigo-50 group-hover:text-indigo-600">
            <ArrowRight size={14} className="transition-transform duration-200 group-hover:translate-x-0.5" />
          </span>
        </div>

        <div className="mt-5">
          <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
            Transactions
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            View transaction history
          </p>
        </div>
      </Link>

    </div>
    </section>
{/* =====================================================
    MY ACCOUNTS
====================================================== */}
<section>
  <div className="mb-5 flex items-end justify-between">
    <div>
      <h2 className="text-lg font-bold tracking-tight text-[#172033]">
        My Accounts
      </h2>
      <p className="mt-0.5 text-xs font-medium text-slate-500">
        Your active bank accounts
      </p>
    </div>

    <Link
      to="/accounts"
      className="group inline-flex items-center gap-1.5 text-xs font-bold text-[#0878E8] transition-colors hover:text-[#0668CB]"
    >
      <span>View all</span>
      <ArrowRight
        size={14}
        className="transition-transform duration-200 group-hover:translate-x-0.5"
      />
    </Link>
  </div>

  <AccountSummary accounts={dashboard?.accounts ?? []} />
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