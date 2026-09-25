
import { Eye, WalletCards } from "lucide-react";
import { useState } from "react";

interface TotalBalanceCardProps {
  totalBalance: number;
  accountCount: number;
}

export default function TotalBalanceCard({
  totalBalance,
  accountCount,
}: TotalBalanceCardProps) {
  const [showBalance, setShowBalance] = useState(true);

  return (
    <section className="rounded-2xl bg-blue-700 p-6 text-white shadow-sm">
      <div className="flex items-start justify-between gap-4">
        {/* Balance Information */}
        <div className="min-w-0">
          {/* Title */}
          <div className="flex items-center gap-2">
            <WalletCards
              size={20}
              className="shrink-0 text-blue-100"
            />

            <p className="text-sm font-medium text-blue-100">
              Total Balance
            </p>
          </div>

          {/* Balance */}
          <div className="mt-4 flex items-center gap-3">
            <h2 className="text-3xl font-bold tracking-tight">
              {showBalance
                ? `${totalBalance.toLocaleString()} MMK`
                : "••••••••"}
            </h2>

            {/* Toggle Balance */}
            <button
              type="button"
              onClick={() => setShowBalance((prev) => !prev)}
              className="rounded-full p-2 text-blue-100 transition hover:bg-blue-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-300"
              aria-label={showBalance ? "Hide balance" : "Show balance"}
              title={showBalance ? "Hide balance" : "Show balance"}
            >
              <Eye size={19} />
            </button>
          </div>

          {/* Account Count */}
          <p className="mt-3 text-sm text-blue-100">
            Across {accountCount}{" "}
            {accountCount === 1 ? "account" : "accounts"}
          </p>
        </div>

        {/* Card Icon */}
        <div className="shrink-0 rounded-xl bg-blue-600 p-3">
          <WalletCards size={24} />
        </div>
      </div>
    </section>
  );
}
