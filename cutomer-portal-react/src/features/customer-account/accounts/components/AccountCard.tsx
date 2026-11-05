import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, FileText, Send, Copy, Check, Building2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { CustomerAccount } from "../types/accountTypes";
import BankCard from "../../dashboard/components/BankCard";

interface AccountCardProps {
  account: CustomerAccount;
  index?: number;
  onSelect?: (accountNumber: string) => void;
}

const statusStyles: Record<CustomerAccount["status"], string> = {
  ACTIVE:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/80",
  DORMANT:
    "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/80",
  FROZEN:
    "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/80",
  CLOSED:
    "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300 border-red-200/80 dark:border-red-800/80",
};

export default function AccountCard({
  account,
  index = 0,
  onSelect,
}: AccountCardProps) {
  const { t } = useTranslation("accounts");
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    void navigator.clipboard.writeText(account.accountNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const statusClass =
    statusStyles[account.status] ??
    "bg-slate-100 text-slate-600 border-slate-200";

  const accountTypeLabel =
    account.accountType.toUpperCase().includes("SAVING")
      ? t("accountTypeSavings", { defaultValue: "Savings Account" })
      : account.accountType.toUpperCase().includes("CURRENT")
        ? t("accountTypeCurrent", { defaultValue: "Current Account" })
        : account.accountType;

  const statusLabels: Record<CustomerAccount["status"], string> = {
    ACTIVE: t("statusActive", { defaultValue: "Active" }),
    DORMANT: t("statusDormant", { defaultValue: "Dormant" }),
    FROZEN: t("statusFrozen", { defaultValue: "Frozen" }),
    CLOSED: t("statusClosed", { defaultValue: "Closed" }),
  };

  const statusLabel = statusLabels[account.status] ?? account.status;

  // Format account number revealing 3 digits matching the bank card (e.g. **** *** 568)
  const maskedAccNumber = (() => {
    const cleaned = account.accountNumber.replace(/\D/g, "");
    if (cleaned.length === 10) {
      return `**** *** ${cleaned.slice(7, 10)}`;
    }
    const last3 = cleaned.length >= 3 ? cleaned.slice(-3) : cleaned;
    return `**** *** ${last3}`;
  })();

  return (
    <article className="overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0A192F] shadow-xs hover:shadow-md transition-all duration-300">
      {/* Upper Main Body: Flex-col on Mobile (<640px), Flex-row on Tablet & Desktop (>=640px) */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5 p-4 sm:p-5">
        {/* Left: Compact Bank Card Visual (displays balance and card number) */}
        <div className="shrink-0 flex justify-center sm:justify-start">
          <BankCard
            account={{
              accountNumber: account.accountNumber,
              accountCategory: account.accountCategory,
              accountType: account.accountType,
              currency: account.currency,
              currentBalance: account.currentBalance,
              availableBalance: Math.max(
                0,
                account.currentBalance - (account.minimumBalance || 10000),
              ),
              minimumBalance: account.minimumBalance,
              status: account.status,
              jointAccount: account.jointAccount,
              openedAt: account.openedAt,
            }}
            index={index}
            compact={true}
            showBalance={true}
            isLink={false}
            onClick={() => onSelect?.(account.accountNumber)}
          />
        </div>

        {/* Right: Account Information */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Row 1: Category & Type on Left, Status Badge on Right */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-cyan-50 dark:bg-cyan-950/50 text-[#00A3C4]">
                <Building2 size={16} />
              </div>
              <h2 className="truncate text-base sm:text-lg font-black text-[#0A192F] dark:text-white">
                <span className="font-extrabold text-slate-400 dark:text-slate-500 text-xs sm:text-sm uppercase mr-1.5">
                  {account.accountCategory} —
                </span>
                {accountTypeLabel}
              </h2>
            </div>

            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold border ${statusClass} shrink-0`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {statusLabel}
            </span>
          </div>

          {/* Row 2: Masked Account Number: revealing last 3 digits matching card with 1-Click Copy */}
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 tracking-wider">
              {maskedAccNumber}
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1 text-slate-400 hover:text-[#00A3C4] transition p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              title="Copy account number"
              aria-label="Copy account number"
            >
              {copied ? (
                <Check size={14} className="text-emerald-500" />
              ) : (
                <Copy size={14} />
              )}
            </button>
            {copied && (
              <span className="text-[11px] font-bold text-emerald-600 animate-in fade-in">
                Copied!
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Horizontal Divider Line */}
      <div className="border-t border-slate-100 dark:border-slate-800" />

      {/* Bottom Action Shortcuts Bar: Transfer, Statement, and View Details together */}
      <div className="px-4 py-2.5 sm:px-5 sm:py-3 bg-slate-50/70 dark:bg-slate-900/40 flex flex-wrap items-center gap-2 sm:gap-2.5">
        <Link
          to="/transfer"
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-2xs transition-all duration-200 hover:border-[#00A3C4] hover:bg-[#00A3C4] hover:text-white hover:shadow-xs"
        >
          <Send size={13} />
          <span>Transfer</span>
        </Link>

        <Link
          to="/statements"
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-2xs transition-all duration-200 hover:border-[#00A3C4] hover:bg-[#00A3C4] hover:text-white hover:shadow-xs"
        >
          <FileText size={13} />
          <span>Statement</span>
        </Link>

        <button
          type="button"
          onClick={() => onSelect?.(account.accountNumber)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-200/80 dark:border-cyan-800/80 bg-cyan-50/80 dark:bg-cyan-950/50 px-3.5 py-1.5 text-xs font-bold text-[#00A3C4] dark:text-cyan-300 shadow-2xs transition-all duration-200 hover:border-[#00A3C4] hover:bg-[#00A3C4] hover:text-white hover:shadow-xs cursor-pointer"
        >
          <span>{t("viewDetails", { defaultValue: "View Details" })}</span>
          <ArrowRight size={13} />
        </button>
      </div>
    </article>
  );
}
