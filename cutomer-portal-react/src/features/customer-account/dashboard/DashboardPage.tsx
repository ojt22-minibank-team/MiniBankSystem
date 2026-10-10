
import { ArrowRight, Send } from "lucide-react";
import { Link } from "react-router-dom";

import TotalBalanceCard from "./components/TotalBalanceCard";
import AccountSummary from "./components/AccountSummary";
import RecentTransactions from "./components/RecentTransactions";

import { accounts, customer } from "../data/mockData";

export default function DashboardPage() {
  const totalBalance = accounts.reduce(
    (total, account) => total + account.balance,
    0
  );

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm text-slate-500">
            Welcome back
          </p>

          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            {customer.fullName}
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Here is your account overview.
          </p>
        </div>

        {/* Transfer Button */}
        <Link
          to="/transfer"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <Send size={18} />
          Transfer Money
        </Link>
      </section>

      {/* Total Balance */}
      <section>
        <TotalBalanceCard
          totalBalance={totalBalance}
          accountCount={accounts.length}
        />
      </section>

      {/* My Accounts */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              My Accounts
            </h2>

            <p className="text-sm text-slate-500">
              Your active bank accounts
            </p>
          </div>

          <Link
            to="/accounts"
            className="inline-flex items-center gap-1 text-sm font-medium text-blue-700 transition hover:text-blue-800"
          >
            View all
            <ArrowRight size={16} />
          </Link>
        </div>

        <AccountSummary />
      </section>

      {/* Recent Transactions */}
      <section>
        <RecentTransactions />
      </section>
    </div>
  );
}
