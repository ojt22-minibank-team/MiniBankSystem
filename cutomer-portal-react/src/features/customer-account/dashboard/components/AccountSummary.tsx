import {
  ArrowRight,
  CreditCard,
  PiggyBank,
  WalletCards,
} from "lucide-react";
import { Link } from "react-router-dom";

import type { DashboardAccount } from "../../types/dashboardTypes";

interface AccountSummaryProps {
  accounts: DashboardAccount[];
}

function getAccountIcon(accountType: string) {
  const type = accountType.toUpperCase();

  if (type.includes("SAVING")) {
    return PiggyBank;
  }

  if (type.includes("CURRENT")) {
    return CreditCard;
  }

  return WalletCards;
}

export default function AccountSummary({
  accounts,
}: AccountSummaryProps) {
  return (
    <section>

      {/* Account Cards */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {accounts.map((account) => {
          const AccountIcon = getAccountIcon(
            account.accountType
          );

          return (
            <Link
              key={account.accountNumber}
              to={`/accounts/${account.accountNumber}`}
              className="group block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
            >
              {/* Account Header */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-4">
                  {/* Account Icon */}
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[#0878E8] transition-colors duration-200 group-hover:bg-[#0878E8] group-hover:text-white">
                    <AccountIcon size={25} strokeWidth={1.8} />
                  </div>

                  {/* Account Information */}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-[#08295C]">
                      {account.accountType}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      {account.accountNumber}
                    </p>
                  </div>
                </div>

                {/* Status */}
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                    account.status === "ACTIVE"
                      ? "bg-emerald-50 text-emerald-600"
                      : account.status === "FROZEN"
                      ? "bg-amber-50 text-amber-600"
                      : "bg-red-50 text-red-600"
                  }`}
                >
                  {account.status}
                </span>
              </div>

              {/* Balance */}
              <div className="mt-5">
                <p className="text-xs text-slate-400">
                  Available Balance
                </p>

                <p className="mt-1 text-xl font-bold text-[#08295C]">
                  {account.availableBalance.toLocaleString(
                    "en-MM",
                    {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }
                  )}

                  <span className="ml-2 text-sm font-medium text-slate-500">
                    {account.currency}
                  </span>
                </p>
              </div>

              {/* Footer */}
              <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                <div>
                  <p className="text-xs text-slate-400">
                    Account Type
                  </p>

                  <p className="mt-1 text-sm font-medium text-slate-700">
                    {account.accountType}
                  </p>
                </div>

                <span className="inline-flex items-center gap-1 text-sm font-semibold text-[#0878E8] transition-colors group-hover:text-[#0668ca]">
                  View Details

                  <ArrowRight
                    size={16}
                    className="transition-transform duration-200 group-hover:translate-x-1"
                  />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}