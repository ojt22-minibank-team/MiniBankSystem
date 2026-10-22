import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  Check,
  Copy,
  CreditCard,
  Eye,
  EyeOff,
  PiggyBank,
  WalletCards,
} from "lucide-react";
import { Link } from "react-router-dom";

import type { DashboardAccount } from "../types/dashboardTypes";

interface AccountSummaryProps {
  accounts: DashboardAccount[];
}

const statusStyles: Record<string, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700",
  FROZEN: "bg-amber-50 text-amber-700",
  SUSPENDED: "bg-red-50 text-red-700",
  DORMANT: "bg-amber-50 text-amber-700",
  CLOSED: "bg-slate-100 text-slate-600",
};

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

function formatMoney(amount: number): string {
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function maskAccountNumber(accountNumber: string): string {
  if (accountNumber.length <= 4) {
    return "•".repeat(accountNumber.length);
  }

  return `**** **** ${accountNumber.slice(-4)}`;
}

function getAccountTypeLabel(
  accountType: string,
  t: (key: string) => string,
): string {
  const normalizedType = accountType.toUpperCase();

  if (normalizedType.includes("SAVING")) {
    return t("accountTypeSavings");
  }

  if (normalizedType.includes("CURRENT")) {
    return t("accountTypeCurrent");
  }

  return accountType;
}

function getStatusLabel(
  status: string,
  t: (key: string) => string,
): string {
  const normalizedStatus = status.toUpperCase();

  const statusKeys: Record<string, string> = {
    ACTIVE: "statusActive",
    DORMANT: "statusDormant",
    FROZEN: "statusFrozen",
    CLOSED: "statusClosed",
  };

  const translationKey = statusKeys[normalizedStatus];

  return translationKey ? t(translationKey) : status;
}

export default function AccountSummary({
  accounts,
}: AccountSummaryProps) {
  const { t } = useTranslation("dashboard");

  const [visibleAccounts, setVisibleAccounts] = useState<Set<string>>(
    () => new Set(),
  );

  const [copiedAccountNumber, setCopiedAccountNumber] =
    useState<string | null>(null);

  const [copyErrorAccountNumber, setCopyErrorAccountNumber] =
    useState<string | null>(null);

  const copyTimeoutRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  const errorTimeoutRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }

      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
    };
  }, []);

  function toggleAccountNumber(accountNumber: string) {
    setVisibleAccounts((previous) => {
      const next = new Set(previous);

      if (next.has(accountNumber)) {
        next.delete(accountNumber);
      } else {
        next.add(accountNumber);
      }

      return next;
    });
  }

  async function handleCopyAccountNumber(accountNumber: string) {
    if (copyTimeoutRef.current) {
      clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = null;
    }

    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
      errorTimeoutRef.current = null;
    }

    setCopiedAccountNumber(null);
    setCopyErrorAccountNumber(null);

    try {
      await navigator.clipboard.writeText(accountNumber);

      setCopiedAccountNumber(accountNumber);

      copyTimeoutRef.current = setTimeout(() => {
        setCopiedAccountNumber((current) =>
          current === accountNumber ? null : current,
        );
        copyTimeoutRef.current = null;
      }, 1500);
    } catch (error) {
      console.error("Failed to copy account number:", error);

      setCopyErrorAccountNumber(accountNumber);

      errorTimeoutRef.current = setTimeout(() => {
        setCopyErrorAccountNumber((current) =>
          current === accountNumber ? null : current,
        );
        errorTimeoutRef.current = null;
      }, 2000);
    }
  }

  if (accounts.length === 0) {
    return (
      <section
        aria-label={t("myAccounts")}
        className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center"
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-[#0878E8]">
          <WalletCards size={24} aria-hidden="true" />
        </div>

        <h2 className="mt-3 text-base font-semibold text-[#08295C]">
          {t("noAccountsAvailable")}
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          {t("accountsWillAppear")}
        </p>
      </section>
    );
  }

  return (
    <section
      aria-label={t("myAccounts")}
      className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
    >
      {accounts.map((account) => {
        const AccountIcon = getAccountIcon(account.accountType);
        const isVisible = visibleAccounts.has(account.accountNumber);
        const isCopied =
          copiedAccountNumber === account.accountNumber;
        const hasCopyError =
          copyErrorAccountNumber === account.accountNumber;

        const statusClass =
          statusStyles[account.status.toUpperCase()] ??
          "bg-slate-100 text-slate-600";

        const accountTypeLabel = getAccountTypeLabel(
          account.accountType,
          t,
        );

        const statusLabel = getStatusLabel(account.status, t);

        const visibilityLabel = isVisible
          ? t("hideAccountNumber")
          : t("showAccountNumber");

        const accountDetailsLabel = t("viewDetails");

        return (
          <article
            key={account.accountNumber}
            className="group min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md sm:p-5"
          >
            {/* Account Header */}
            <div className="flex items-start justify-between gap-3">
              <Link
                to={`/accounts/${encodeURIComponent(account.accountNumber)}`}
                aria-label={`${accountTypeLabel}, ${t("accountNumber")} ending ${account.accountNumber.slice(-4)}`}
                className="flex min-w-0 flex-1 items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0878E8]"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#0878E8] transition-colors group-hover:bg-[#0878E8] group-hover:text-white">
                  <AccountIcon size={22} strokeWidth={1.8} />
                </div>

                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold text-[#08295C] sm:text-base">
                    {accountTypeLabel}
                  </h3>
                </div>
              </Link>

              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold sm:text-xs ${statusClass}`}
              >
                {statusLabel}
              </span>
            </div>

            {/* Account Number + Eye + Copy */}
            <div className="mt-2 flex min-w-0 flex-wrap items-center gap-1">
              <p className="min-w-0 break-all font-mono text-xs tracking-wide text-slate-500">
                {isVisible
                  ? account.accountNumber
                  : maskAccountNumber(account.accountNumber)}
              </p>

              <button
                type="button"
                onClick={() =>
                  toggleAccountNumber(account.accountNumber)
                }
                aria-label={visibilityLabel}
                aria-pressed={isVisible}
                title={visibilityLabel}
                className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-500 transition hover:bg-blue-50 hover:text-[#0878E8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0878E8]"
              >
                {isVisible ? (
                  <EyeOff size={14} aria-hidden="true" />
                ) : (
                  <Eye size={14} aria-hidden="true" />
                )}
              </button>

              <button
                type="button"
                onClick={() =>
                  handleCopyAccountNumber(account.accountNumber)
                }
                aria-label={
                  isCopied
                    ? t("copied")
                    : t("copyAccountNumber")
                }
                title={
                  isCopied
                    ? t("copied")
                    : t("copyAccountNumber")
                }
                className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-500 transition hover:bg-blue-50 hover:text-[#0878E8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0878E8]"
              >
                {isCopied ? (
                  <Check
                    size={14}
                    className="text-emerald-600"
                    aria-hidden="true"
                  />
                ) : (
                  <Copy size={14} aria-hidden="true" />
                )}
              </button>

              {isCopied && (
                <span
                  className="whitespace-nowrap text-xs font-medium text-emerald-600"
                  role="status"
                >
                  {t("copied")}
                </span>
              )}

              {hasCopyError && (
                <span
                  className="whitespace-nowrap text-xs text-red-600"
                  role="status"
                >
                  {t("copyFailed")}
                </span>
              )}
            </div>

            {/* Available Balance */}
            <div className="mt-4">
              <p className="text-xs font-medium text-slate-500 sm:text-sm">
                {t("availableBalance")}
              </p>

              <div className="mt-1.5 flex min-w-0 flex-wrap items-baseline gap-x-2">
                <span className="break-words text-xl font-bold leading-tight tracking-tight text-[#08295C] sm:text-2xl">
                  {formatMoney(account.availableBalance)}
                </span>

                <span className="text-sm font-medium text-slate-500">
                  {account.currency}
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
              <div className="min-w-0">
                <p className="text-xs text-slate-500">
                  {t("accountType")}
                </p>

                <p className="mt-1 truncate text-sm font-medium text-slate-700">
                  {accountTypeLabel}
                </p>
              </div>

              <Link
                to={`/accounts/${encodeURIComponent(account.accountNumber)}`}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-md text-xs font-semibold text-[#0878E8] transition-colors hover:text-[#0668ca] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0878E8] sm:text-sm"
              >
                {accountDetailsLabel}

                <ArrowRight
                  size={15}
                  strokeWidth={1.8}
                  aria-hidden="true"
                  className="transition-transform duration-200 group-hover:translate-x-0.5"
                />
              </Link>
            </div>
          </article>
        );
      })}
    </section>
  );
}