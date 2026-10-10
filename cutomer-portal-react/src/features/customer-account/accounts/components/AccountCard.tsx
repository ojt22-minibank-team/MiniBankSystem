import {
  ArrowUpRight,
  CreditCard,
} from "lucide-react";
import { type CustomerAccount } from "../../types/accountTypes";
interface AccountCardProps {
  account: CustomerAccount;
}

export default function AccountCard({
  account,
}: AccountCardProps) {
  const formatMoney = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount) + ` ${currency}`;
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-emerald-50 text-emerald-700";

      case "FROZEN":
        return "bg-amber-50 text-amber-700";

      case "SUSPENDED":
        return "bg-red-50 text-red-700";

      case "CLOSED":
        return "bg-slate-100 text-slate-600";

      default:
        return "bg-slate-100 text-slate-600";
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">

      {/* Header */}
      <div className="flex items-start justify-between">

        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-blue-50 p-3 text-blue-700">
            <CreditCard size={22} />
          </div>

          <div>
            <p className="text-sm text-slate-500">
              {account.accountType}
            </p>

            <p className="font-semibold text-slate-900">
              {account.accountNumber}
            </p>
          </div>
        </div>

        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusStyle(
            account.status
          )}`}
        >
          {account.status}
        </span>
      </div>

      {/* Balance */}
      <div className="mt-6">
        <p className="text-sm text-slate-500">
          Available Balance
        </p>

        <p className="mt-1 text-2xl font-bold text-slate-900">
          {formatMoney(
            account.availableBalance,
            account.currency
          )}
        </p>
      </div>

      {/* Details */}
      <div className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-100 pt-5">

        <div>
          <p className="text-xs text-slate-400">
            Current Balance
          </p>

          <p className="mt-1 text-sm font-medium text-slate-700">
            {formatMoney(
              account.currentBalance,
              account.currency
            )}
          </p>
        </div>

        <div>
          <p className="text-xs text-slate-400">
            Account Category
          </p>

          <p className="mt-1 text-sm font-medium text-slate-700">
            {account.accountCategory}
          </p>
        </div>

        <div>
          <p className="text-xs text-slate-400">
            Daily Transfer Limit
          </p>

          <p className="mt-1 text-sm font-medium text-slate-700">
            {formatMoney(
              account.dailyTransferLimit,
              account.currency
            )}
          </p>
        </div>

        <div>
          <p className="text-xs text-slate-400">
            Joint Account
          </p>

          <p className="mt-1 text-sm font-medium text-slate-700">
            {account.jointAccount ? "Yes" : "No"}
          </p>
        </div>
      </div>

      {/* View Details */}
      <button
        type="button"
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
      >
        View Account Details
        <ArrowUpRight size={16} />
      </button>
    </div>
  );
}