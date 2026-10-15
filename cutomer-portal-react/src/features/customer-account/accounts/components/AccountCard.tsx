
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  Copy,
  CreditCard,
  Eye,
  EyeOff,
  PiggyBank,
} from "lucide-react";
import { Link } from "react-router-dom";

import type { MouseEvent } from "react";
import type { CustomerAccount } from "../../types/accountTypes";

interface AccountCardProps {
  account: CustomerAccount;
}

function getAccountIcon(accountType: string) {
  const type = accountType.toUpperCase();

  if (type.includes("SAVING")) {
    return PiggyBank;
  }

  return CreditCard;
}

const statusStyles: Record<CustomerAccount["status"], string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700",
  DORMANT: "bg-amber-50 text-amber-700",
  FROZEN: "bg-amber-50 text-amber-700",
  CLOSED: "bg-red-50 text-red-700",
};

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

export default function AccountCard({
  account,
}: AccountCardProps) {
  const AccountIcon = getAccountIcon(account.accountType);

  const [showAccountNumber, setShowAccountNumber] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  const copyTimeoutRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  async function handleCopyAccountNumber(
    event: MouseEvent<HTMLButtonElement>,
  ) {
    event.preventDefault();
    event.stopPropagation();

    if (copyTimeoutRef.current) {
      clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = null;
    }

    setCopied(false);
    setCopyError(false);

    try {
      await navigator.clipboard.writeText(account.accountNumber);

      setCopied(true);

      copyTimeoutRef.current = setTimeout(() => {
        setCopied(false);
        copyTimeoutRef.current = null;
      }, 1500);
    } catch (error) {
      console.error("Failed to copy account number:", error);
      setCopyError(true);

      copyTimeoutRef.current = setTimeout(() => {
        setCopyError(false);
        copyTimeoutRef.current = null;
      }, 2000);
    }
  }

  function handleToggleAccountNumber(
    event: MouseEvent<HTMLButtonElement>,
  ) {
    event.preventDefault();
    event.stopPropagation();

    setShowAccountNumber((previous) => !previous);
  }

  return (
    <Link
      to={`/accounts/${encodeURIComponent(account.accountNumber)}`}
      aria-label={`View details for ${account.accountType} account ending ${account.accountNumber.slice(-4)}`}
      className="group block min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0878E8] focus-visible:ring-offset-2 sm:p-5"
    >
      {/* Account Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#0878E8] transition-colors duration-200 group-hover:bg-[#0878E8] group-hover:text-white">
            <AccountIcon size={22} strokeWidth={1.8} />
          </div>

          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-[#08295C] sm:text-base">
              {account.accountType}
            </h2>

            {/* Account Number + Eye + Copy */}
            <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1">
              <p className="min-w-0 break-all font-mono text-xs tracking-wide text-slate-500">
                {showAccountNumber
                  ? account.accountNumber
                  : maskAccountNumber(account.accountNumber)}
              </p>

              <button
                type="button"
                onClick={handleToggleAccountNumber}
                aria-label={
                  showAccountNumber
                    ? "Hide account number"
                    : "Show account number"
                }
                title={
                  showAccountNumber
                    ? "Hide account number"
                    : "Show account number"
                }
                className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-blue-50 hover:text-[#0878E8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0878E8]"
              >
                {showAccountNumber ? (
                  <EyeOff size={14} aria-hidden="true" />
                ) : (
                  <Eye size={14} aria-hidden="true" />
                )}
              </button>

              <button
                type="button"
                onClick={handleCopyAccountNumber}
                aria-label="Copy account number"
                title={copied ? "Copied!" : "Copy account number"}
                className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-blue-50 hover:text-[#0878E8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0878E8]"
              >
                {copied ? (
                  <Check
                    size={14}
                    className="text-emerald-600"
                    aria-hidden="true"
                  />
                ) : (
                  <Copy size={14} aria-hidden="true" />
                )}
              </button>

              {copied && (
                <span
                  className="whitespace-nowrap text-xs font-medium text-emerald-600"
                  role="status"
                >
                  Copied!
                </span>
              )}

              {copyError && (
                <span
                  className="whitespace-nowrap text-xs text-red-600"
                  role="status"
                >
                  Copy failed
                </span>
              )}
            </div>
          </div>
        </div>

        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold sm:text-xs ${
            statusStyles[account.status] ??
            "bg-slate-100 text-slate-600"
          }`}
        >
          {account.status.charAt(0) +
            account.status.slice(1).toLowerCase()}
        </span>
      </div>

      {/* Available Balance */}
      <div className="mt-5">
        <p className="text-xs font-medium text-slate-500 sm:text-sm">
          Available Balance
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
      <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
        <div className="min-w-0">
          <p className="text-xs text-slate-500">
            Account Type
          </p>

          <p className="mt-1 truncate text-sm font-medium text-slate-700">
            {account.accountType}
          </p>
        </div>

        <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-[#0878E8] transition-colors group-hover:text-[#0668ca] sm:text-sm">
          View Details

          <ArrowRight
            size={16}
            strokeWidth={1.8}
            aria-hidden="true"
            className="transition-transform duration-200 group-hover:translate-x-1"
          />
        </span>
      </div>
    </Link>
  );
}
