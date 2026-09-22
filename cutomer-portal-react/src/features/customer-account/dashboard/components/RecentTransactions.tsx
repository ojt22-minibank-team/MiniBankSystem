
import {
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard,
  History,
} from "lucide-react";
import { Link } from "react-router-dom";

import { transactions } from "../../data/mockData";

export default function RecentTransactions() {
  const recentTransactions = transactions.slice(0, 4);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Recent Transactions
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Your latest account activities
          </p>
        </div>

        <Link
          to="/transactions"
          className="inline-flex shrink-0 items-center gap-2 text-sm font-medium text-blue-700 transition hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <History size={17} />
          <span className="hidden sm:inline">View History</span>
        </Link>
      </div>

      {/* Transactions */}
      <div className="divide-y divide-slate-100">
        {recentTransactions.map((transaction) => {
          const isCredit = transaction.amount > 0;

          return (
            <div
              key={transaction.id}
              className="flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-slate-50"
            >
              {/* Left */}
              <div className="flex min-w-0 items-center gap-3">
                {/* Transaction Icon */}
                <div
                  className={`shrink-0 rounded-full p-2 ${
                    isCredit
                      ? "bg-green-50 text-green-600"
                      : "bg-red-50 text-red-600"
                  }`}
                >
                  {isCredit ? (
                    <ArrowDownLeft size={18} />
                  ) : (
                    <ArrowUpRight size={18} />
                  )}
                </div>

                {/* Transaction Information */}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800">
                    {transaction.description}
                  </p>

                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-xs text-slate-400">
                      {transaction.date}
                    </span>

                    <span className="text-slate-300">
                      •
                    </span>

                    <span className="text-xs text-slate-400">
                      {transaction.type}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right */}
              <div className="shrink-0 text-right">
                <p
                  className={`text-sm font-semibold ${
                    isCredit
                      ? "text-green-600"
                      : "text-slate-800"
                  }`}
                >
                  {isCredit ? "+" : ""}
                  {Math.abs(transaction.amount).toLocaleString()} MMK
                </p>

                <div className="mt-1 flex items-center justify-end gap-1">
                  <CreditCard
                    size={12}
                    className="text-slate-400"
                  />

                  <span className="text-xs font-medium text-green-600">
                    {transaction.status}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {recentTransactions.length === 0 && (
        <div className="px-5 py-10 text-center text-sm text-slate-500">
          No recent transactions.
        </div>
      )}
    </div>
  );
}
