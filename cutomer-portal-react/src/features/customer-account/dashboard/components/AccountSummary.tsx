
import {
  ArrowUpRight,
  CreditCard,
} from "lucide-react";
import { Link } from "react-router-dom";

import { accounts } from "../../data/mockData";

export default function AccountSummary() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {accounts.map((account) => (
        <div
          key={account.id}
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            {/* Account Information */}
            <div className="flex min-w-0 items-center gap-3">
              <div className="shrink-0 rounded-lg bg-blue-50 p-3 text-blue-700">
                <CreditCard size={21} />
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {account.accountName}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {account.accountNumber}
                </p>
              </div>
            </div>

            {/* Account Status */}
            <span
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                account.status === "ACTIVE"
                  ? "bg-green-50 text-green-700"
                  : account.status === "FROZEN"
                  ? "bg-yellow-50 text-yellow-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {account.status}
            </span>
          </div>

          {/* Balance */}
          <div className="mt-6">
            <p className="text-xs text-slate-500">
              Available Balance
            </p>

            <p className="mt-1 text-2xl font-bold text-slate-900">
              {account.availableBalance.toLocaleString()}{" "}
              <span className="text-sm font-medium text-slate-500">
                {account.currency}
              </span>
            </p>
          </div>

          {/* Footer */}
          <div className="mt-5 flex items-center justify-between gap-4 border-t border-slate-100 pt-4">
            {/* Account Type */}
            <div>
              <p className="text-xs text-slate-400">
                Account Type
              </p>

              <p className="mt-1 text-sm font-medium text-slate-700">
                {account.accountType}
              </p>
            </div>

            {/* View Details */}
            <Link
              to={`/accounts/${account.id}`}
              className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-blue-700 transition hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              View Details
              <ArrowUpRight size={16} />
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
