import { useEffect, useRef, useState } from "react";
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
import { useTranslation } from "react-i18next";

import type { CustomerAccount } from "../types/accountTypes";

interface AccountCardProps {
  account: CustomerAccount;
}

type CopyStatus = "idle" | "success" | "error";

const statusStyles: Record<CustomerAccount["status"], string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700",
  DORMANT: "bg-amber-50 text-amber-700",
  FROZEN: "bg-amber-50 text-amber-700",
  CLOSED: "bg-red-50 text-red-700",
};

const copyFeedbackDuration = 2000;

function getAccountIcon(accountType: string) {
  const type = accountType.toUpperCase();

  if (type.includes("SAVING")) return PiggyBank;
  if (type.includes("CURRENT")) return CreditCard;

  return WalletCards;
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function maskAccountNumber(accountNumber: string): string {
  if (accountNumber.length <= 4) {
    return "•".repeat(accountNumber.length);
  }

  return `**** **** ${accountNumber.slice(-4)}`;
}

export default function AccountCard({ account }: AccountCardProps) {
  const { t } = useTranslation("accounts");

  const [showAccountNumber, setShowAccountNumber] = useState(false);
  const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle");

  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const AccountIcon = getAccountIcon(account.accountType);

  const accountDetailsPath = `/accounts/${encodeURIComponent(
    account.accountNumber,
  )}`;

  const statusClass =
    statusStyles[account.status] ?? "bg-slate-100 text-slate-600";

  const accountTypeLabel =
    account.accountType.toUpperCase().includes("SAVING")
      ? t("accountTypeSavings")
      : account.accountType.toUpperCase().includes("CURRENT")
        ? t("accountTypeCurrent")
        : account.accountType;

  const statusLabels: Record<CustomerAccount["status"], string> = {
    ACTIVE: t("statusActive"),
    DORMANT: t("statusDormant"),
    FROZEN: t("statusFrozen"),
    CLOSED: t("statusClosed"),
  };

  const statusLabel = statusLabels[account.status] ?? account.status;

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current !== null) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  async function handleCopyAccountNumber() {
    if (copyTimeoutRef.current !== null) {
      clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = null;
    }

    setCopyStatus("idle");

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard API is unavailable.");
      }

      await navigator.clipboard.writeText(account.accountNumber);
      setCopyStatus("success");
    } catch (error) {
      console.error("Failed to copy account number:", error);
      setCopyStatus("error");
    }

    copyTimeoutRef.current = setTimeout(() => {
      setCopyStatus("idle");
      copyTimeoutRef.current = null;
    }, copyFeedbackDuration);
  }

  return (
    <article className="group min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#0878E8] transition-colors duration-200 group-hover:bg-[#0878E8] group-hover:text-white">
            <AccountIcon size={22} strokeWidth={1.8} aria-hidden="true" />
          </div>

          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-[#08295C] sm:text-base">
              <Link
                to={accountDetailsPath}
                aria-label={`${t("viewDetails")}: ${accountTypeLabel}, ${account.accountNumber.slice(-4)}`}
                className="rounded-sm hover:text-[#0878E8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0878E8]"
              >
                {accountTypeLabel}
              </Link>
            </h2>

            <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1">
              <p className="min-w-0 break-all font-mono text-xs tracking-wide text-slate-500">
                {showAccountNumber
                  ? account.accountNumber
                  : maskAccountNumber(account.accountNumber)}
              </p>

              <button
                type="button"
                onClick={() =>
                  setShowAccountNumber((previous) => !previous)
                }
                aria-label={
                  showAccountNumber
                    ? t("hideAccountNumber")
                    : t("showAccountNumber")
                }
                aria-pressed={showAccountNumber}
                title={
                  showAccountNumber
                    ? t("hideAccountNumber")
                    : t("showAccountNumber")
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
                aria-label={
                  copyStatus === "success"
                    ? t("accountNumberCopied")
                    : t("copyAccountNumber")
                }
                title={
                  copyStatus === "success"
                    ? t("copied")
                    : copyStatus === "error"
                      ? t("copyFailed")
                      : t("copyAccountNumber")
                }
                className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-blue-50 hover:text-[#0878E8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0878E8]"
              >
                {copyStatus === "success" ? (
                  <Check
                    size={14}
                    className="text-emerald-600"
                    aria-hidden="true"
                  />
                ) : (
                  <Copy size={14} aria-hidden="true" />
                )}
              </button>

              {copyStatus === "success" && (
                <span
                  className="whitespace-nowrap text-xs font-medium text-emerald-600"
                  role="status"
                >
                  {t("copied")}
                </span>
              )}

              {copyStatus === "error" && (
                <span
                  className="whitespace-nowrap text-xs text-red-600"
                  role="status"
                >
                  {t("copyFailed")}
                </span>
              )}
            </div>
          </div>
        </div>

        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold sm:text-xs ${statusClass}`}
        >
          {statusLabel}
        </span>
      </div>

      <div className="mt-5">
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

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
        <div className="min-w-0">
          <p className="text-xs text-slate-500">{t("accountType")}</p>
          <p className="mt-1 truncate text-sm font-medium text-slate-700">
            {accountTypeLabel}
          </p>
        </div>

        <Link
          to={accountDetailsPath}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md text-xs font-semibold text-[#0878E8] transition-colors hover:text-[#0668ca] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0878E8] sm:text-sm"
        >
          {t("viewDetails")}
          <ArrowRight
            size={16}
            strokeWidth={1.8}
            aria-hidden="true"
            className="transition-transform duration-200 group-hover:translate-x-0.5"
          />
        </Link>
      </div>
    </article>
  );
}