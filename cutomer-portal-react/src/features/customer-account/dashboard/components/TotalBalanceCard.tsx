import { useTranslation } from "react-i18next";
import {
  Eye,
  EyeOff,
  Landmark,
  WalletCards,
} from "lucide-react";

interface TotalBalanceCardProps {
  totalBalance: number;
  accountCount: number;
  showBalance: boolean;
  loading?: boolean;
  onToggleBalance: () => void;
}

function formatBalance(amount: number): string {
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function TotalBalanceCard({
  totalBalance,
  accountCount,
  showBalance,
  loading = false,
  onToggleBalance,
}: TotalBalanceCardProps) {
  const { t } = useTranslation("dashboard");

  const balanceVisibilityLabel = showBalance
    ? t("hideBalance")
    : t("showBalance");

  return (
    <section
      aria-label={t("totalBalance")}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0878E8] via-[#176FE0] to-[#0755B8] p-6 shadow-md ring-1 ring-white/10 sm:p-8"
    >
      {/* Decorative Background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-blue-300/20 blur-3xl"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-cyan-300/10 blur-2xl"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-[-80px] top-1/2 h-64 w-64 -translate-y-1/2 rounded-full border-[28px] border-blue-300/10"
      />

      <div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
        {/* Balance Information */}
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <WalletCards
              size={16}
              aria-hidden="true"
              className="text-blue-100/90"
            />

            <span className="text-xs font-semibold uppercase tracking-wider text-blue-100/90">
              {t("totalBalance")}
            </span>

            <span
              aria-hidden="true"
              className="h-1 w-1 rounded-full bg-blue-100/60"
            />

            <span className="text-xs text-blue-50/80">
              {t("acrossAllAccounts")}
            </span>

            <button
              type="button"
              onClick={onToggleBalance}
              disabled={loading}
              aria-label={balanceVisibilityLabel}
              aria-pressed={showBalance}
              title={balanceVisibilityLabel}
              className="inline-flex items-center justify-center rounded-full p-1 text-blue-100/80 transition hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {showBalance ? (
                <EyeOff size={15} aria-hidden="true" />
              ) : (
                <Eye size={15} aria-hidden="true" />
              )}
            </button>
          </div>

          {/* Balance */}
          <div
            className="flex flex-wrap items-baseline gap-x-2 gap-y-1 pt-1"
            aria-live="polite"
            aria-atomic="true"
          >
            <span className="text-xl font-bold text-blue-100">
              MMK
            </span>

            <div className="break-words text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              {loading ? (
                <span
                  aria-label={t("loadingBalance")}
                  className="inline-block h-10 w-52 animate-pulse rounded-lg bg-white/10 align-middle"
                />
              ) : showBalance ? (
                formatBalance(totalBalance)
              ) : (
                <span
                  aria-label={t("hideBalance")}
                  className="tracking-widest text-blue-100/80"
                >
                  ********
                </span>
              )}
            </div>
          </div>

          {/* Account Count */}
          <div className="flex flex-wrap items-center gap-2.5 pt-2">
            {!loading && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-300/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-100 ring-1 ring-inset ring-emerald-200/20">
                <span
                  aria-hidden="true"
                  className="h-1.5 w-1.5 rounded-full bg-emerald-300"
                />
                {t("overview")}
              </span>
            )}

            <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium text-blue-50/90 ring-1 ring-inset ring-white/10">
              {loading
                ? t("loadingAccounts")
                : t("linkedAccount", {
                    count: accountCount,
                  })}
            </span>
          </div>
        </div>

        {/* Decorative Bank Icon */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-5 top-1/2 hidden -translate-y-1/2 sm:block"
        >
          <Landmark
            size={165}
            strokeWidth={1.2}
            className="text-blue-100/30"
          />
        </div>
      </div>
    </section>
  );
}