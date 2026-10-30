import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  Copy,
  CreditCard,
  Eye,
  EyeOff,
  FileText,
  RefreshCw,
  Send,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { getMyAccount } from "../api/customerAccountApi";
import type {
  CustomerAccount,
  TransferLimitInfo,
  AccountStatus as AccountStatusType,
} from "../types/accountTypes";
import BankCard from "../../dashboard/components/BankCard";
import { TransferLimitCard } from "../components/TransferLimitCard";

function formatLabel(value: string): string {
  return value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function getAccountTypeLabel(
  accountType: string,
  t: (key: string, options?: { defaultValue?: string }) => string,
): string {
  const type = accountType.toUpperCase();

  if (type.includes("SAVING"))
    return t("accountTypeSavings", { defaultValue: "Savings Account" });
  if (type.includes("CURRENT"))
    return t("accountTypeCurrent", { defaultValue: "Current Account" });

  return formatLabel(accountType);
}

function getStatusLabel(
  status: AccountStatusType,
  t: (key: string, options?: { defaultValue?: string }) => string,
): string {
  const labels: Record<AccountStatusType, string> = {
    ACTIVE: t("statusActive", { defaultValue: "Active" }),
    DORMANT: t("statusDormant", { defaultValue: "Dormant" }),
    FROZEN: t("statusFrozen", { defaultValue: "Frozen" }),
    CLOSED: t("statusClosed", { defaultValue: "Closed" }),
  };

  return labels[status] ?? status;
}

const statusStyles: Record<AccountStatusType, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  DORMANT: "bg-amber-50 text-amber-700 border-amber-200",
  FROZEN: "bg-amber-50 text-amber-700 border-amber-200",
  CLOSED: "bg-red-50 text-red-700 border-red-200",
};

function formatMoney(amount: number, currency: string): string {
  const formattedAmount = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);

  return `${formattedAmount} ${currency}`;
}

function formatDate(value: string | null): string {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function maskAccountNumber(accountNumber: string): string {
  if (!accountNumber) return "**** *** ***";
  const cleaned = accountNumber.replace(/\D/g, "");

  if (cleaned.length === 10) {
    return `**** *** ${cleaned.slice(7, 10)}`;
  }

  const last3 = cleaned.length >= 3 ? cleaned.slice(-3) : cleaned;
  return `**** *** ${last3}`;
}

function InfoItem({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-100 last:border-b-0">
      <div className="flex items-center gap-2.5 text-slate-500">
        <Icon size={16} className="text-slate-400" />
        <span className="text-xs sm:text-sm font-medium">{label}</span>
      </div>
      <span className="text-xs sm:text-sm font-bold text-[#0A192F]">
        {value}
      </span>
    </div>
  );
}

function AccountDetailSkeleton() {
  const { t } = useTranslation("accounts");

  return (
    <div
      className="mx-auto max-w-6xl space-y-4 px-4 py-3 sm:px-6 sm:py-4 md:px-8"
      role="status"
      aria-label={t("loadingAccountDetails", {
        defaultValue: "Loading account details",
      })}
    >
      <div className="h-6 w-48 animate-pulse rounded-md bg-slate-200" />
      <div className="h-72 animate-pulse rounded-3xl bg-slate-200" />
      <div className="space-y-4">
        <div className="h-64 animate-pulse rounded-3xl bg-slate-200" />
        <div className="h-64 animate-pulse rounded-3xl bg-slate-200" />
      </div>
    </div>
  );
}

export interface AccountDetailPageProps {
  accountNumber?: string;
  onBack?: () => void;
  allAccounts?: CustomerAccount[];
  onSelectAccount?: (accountNumber: string) => void;
}

export default function AccountDetailPage({
  accountNumber: propAccountNumber,
  onBack,
  allAccounts,
  onSelectAccount,
}: AccountDetailPageProps = {}) {
  const { t } = useTranslation("accounts");
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ accountNumber: string }>();

  const locationState = location.state as {
    accountNumber?: string;
    autoOpenLimitModal?: boolean;
  } | null;

  const targetAccountNumber =
    propAccountNumber ||
    locationState?.accountNumber ||
    params.accountNumber;

  const [account, setAccount] = useState<CustomerAccount | null>(null);
  const [transferLimits, setTransferLimits] =
    useState<TransferLimitInfo | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  const [showAccountNumber, setShowAccountNumber] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  useEffect(() => {
    if (locationState?.autoOpenLimitModal) {
      const el = document.getElementById("transfer-limit-section");
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [locationState?.autoOpenLimitModal]);

  useEffect(() => {
    let cancelled = false;

    async function loadAccount() {
      setLoading(true);
      setError(null);
      setTransferLimits(null);
      setAccount(null);
      setShowAccountNumber(false);
      setCopied(false);

      if (!targetAccountNumber) {
        setError(
          t("missingAccountNumber", {
            defaultValue: "Account number is missing.",
          }),
        );
        setLoading(false);
        return;
      }

      try {
        const data = await getMyAccount(targetAccountNumber);

        if (cancelled) return;

        setAccount(data);
      } catch (err) {
        console.error("Failed to load account details:", err);

        if (cancelled) return;

        setError(
          t("accountLoadError", {
            defaultValue: "Failed to load account details.",
          }),
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadAccount();

    return () => {
      cancelled = true;
    };
  }, [targetAccountNumber, retryKey, t]);

  async function handleCopyAccountNumber() {
    if (!account) return;

    setCopied(false);
    try {
      await navigator.clipboard.writeText(account.accountNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error("Failed to copy account number:", err);
    }
  }

  if (loading) {
    return <AccountDetailSkeleton />;
  }

  if (error || !account) {
    return (
      <main className="mx-auto max-w-4xl p-4 md:p-8">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition-colors hover:text-[#00A3C4]"
        >
          <ArrowLeft size={16} />
          <span>Back to My Accounts</span>
        </button>

        <section
          className="mt-6 rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm"
          role="alert"
        >
          <CreditCard size={32} className="mx-auto text-red-500" />
          <h1 className="mt-3 text-lg font-bold text-slate-900">
            Unable to Load Account
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {error ?? "Account details could not be found."}
          </p>
          <button
            type="button"
            onClick={() => setRetryKey((key) => key + 1)}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#00A3C4] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0891B2]"
          >
            <RefreshCw size={15} />
            <span>Try Again</span>
          </button>
        </section>
      </main>
    );
  }

  const accountTypeLabel = getAccountTypeLabel(account.accountType, t);
  const statusLabel = getStatusLabel(account.status, t);
  const statusStyle =
    statusStyles[account.status] ??
    "bg-slate-100 text-slate-700 border-slate-200";

  return (
    <main className="mx-auto max-w-6xl space-y-3.5 px-4 py-2.5 sm:px-6 sm:py-3.5 md:px-8">
      {/* Top Header: Step-Back Arrow, Account Switcher & Status Badge */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between pb-0.5">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={handleBack}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-2xs transition-all hover:border-[#00A3C4] hover:bg-cyan-50/50 hover:text-[#00A3C4]"
            title="Go back"
            aria-label="Go back"
          >
            <ArrowLeft size={16} />
          </button>

          {/* Account Switcher Tabs (when customer has 2 or more accounts) */}
          {allAccounts && allAccounts.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-none">
              {allAccounts.map((acc) => {
                const isSelected = acc.accountNumber === targetAccountNumber;
                const typeShort = acc.accountType.toUpperCase().includes("SAVING")
                  ? "Savings"
                  : "Current";
                return (
                  <button
                    key={acc.accountNumber}
                    type="button"
                    onClick={() => onSelectAccount?.(acc.accountNumber)}
                    className={`shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all duration-200 ${
                      isSelected
                        ? "bg-[#00A3C4] text-white shadow-xs shadow-cyan-500/25"
                        : "border border-slate-200 bg-white text-slate-600 hover:border-[#00A3C4] hover:text-[#00A3C4] hover:bg-cyan-50/40"
                    }`}
                  >
                    <span>
                      {typeShort} (•••{acc.accountNumber.slice(-3)})
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Status Badge */}
        <div
          className={`self-start sm:self-auto inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-xs font-bold ${statusStyle}`}
        >
          <span className="h-2 w-2 rounded-full bg-current opacity-80" />
          <span>{statusLabel}</span>
        </div>
      </div>

      {/* Hero Section: Bank Card on Left, Balance & Quick Actions on Right */}
      <section className="overflow-hidden rounded-3xl border border-slate-100 bg-white p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          {/* Bank Card Component */}
          <div className="shrink-0 flex justify-center">
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
              index={
                allAccounts
                  ? Math.max(
                      0,
                      allAccounts.findIndex(
                        (a) => a.accountNumber === account.accountNumber,
                      ),
                    )
                  : 0
              }
              showBalance={true}
              isLink={false}
            />
          </div>

          {/* Account Balances & Quick Actions Panel */}
          <div className="flex-1 space-y-4 min-w-0">
            {/* Account Number Copy Row */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Account Number:
              </span>
              <span className="font-mono text-sm font-bold text-[#0A192F]">
                {showAccountNumber
                  ? account.accountNumber
                  : maskAccountNumber(account.accountNumber)}
              </span>

              <button
                type="button"
                onClick={() => setShowAccountNumber((prev) => !prev)}
                className="p-1 text-slate-400 hover:text-slate-600"
                title={showAccountNumber ? "Hide number" : "Show number"}
              >
                {showAccountNumber ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>

              <button
                type="button"
                onClick={handleCopyAccountNumber}
                className="p-1 text-slate-400 hover:text-[#00A3C4]"
                title="Copy account number"
              >
                {copied ? (
                  <Check size={15} className="text-emerald-600" />
                ) : (
                  <Copy size={15} />
                )}
              </button>
            </div>

            {/* Balances Grid: Current Balance (Total Ledger) & Minimum Reserve (Locked Reserve) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-2xl bg-slate-50/80 p-4 border border-slate-100">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Current Balance
                </p>
                <p className="mt-1.5 text-xl font-extrabold text-[#0A192F] tracking-tight">
                  {formatMoney(account.currentBalance, account.currency)}
                </p>
                <p className="mt-1 text-[11px] text-slate-400">Total ledger balance</p>
              </div>

              <div className="rounded-2xl bg-slate-50/80 p-4 border border-slate-100">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Minimum Reserve
                </p>
                <p className="mt-1.5 text-xl font-extrabold text-slate-700 tracking-tight">
                  {formatMoney(account.minimumBalance, account.currency)}
                </p>
                <p className="mt-1 text-[11px] text-slate-400">Locked reserve amount</p>
              </div>
            </div>

            {/* Action Buttons: Unified styling, changing to Ekaraj Cyan/Blue on hover */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                to="/transfer"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 shadow-2xs transition-all duration-200 hover:border-[#00A3C4] hover:bg-[#00A3C4] hover:text-white hover:shadow-md hover:shadow-cyan-500/20"
              >
                <Send size={15} />
                <span>Make a Transfer</span>
              </Link>

              <Link
                to="/statements"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 shadow-2xs transition-all duration-200 hover:border-[#00A3C4] hover:bg-[#00A3C4] hover:text-white hover:shadow-md hover:shadow-cyan-500/20"
              >
                <FileText size={15} />
                <span>Account Statement</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Account Specifications & Transfer Limits (Stacked Vertically) */}
      <div className="space-y-4">
        {/* 1. Account Information Card */}
        <section className="rounded-3xl border border-slate-100 bg-white p-5 sm:p-6 shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-[#00A3C4]">
              <CreditCard size={20} />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-[#0A192F]">
                Account Information
              </h2>
              <p className="text-xs text-slate-400">
                Specifications and attributes
              </p>
            </div>
          </div>

          <div className="divide-y divide-slate-100 pt-1">
            <InfoItem
              icon={CreditCard}
              label="Account Type"
              value={accountTypeLabel}
            />
            <InfoItem
              icon={Wallet}
              label="Account Category"
              value={formatLabel(account.accountCategory)}
            />
            <InfoItem
              icon={Wallet}
              label="Currency"
              value={account.currency}
            />
            <InfoItem
              icon={CalendarDays}
              label="Opened Date"
              value={formatDate(account.openedAt)}
            />
            <InfoItem
              icon={CreditCard}
              label="Joint Account"
              value={account.jointAccount ? "Yes" : "No"}
            />
            <InfoItem
              icon={ShieldCheck}
              label="Required Approvals"
              value={String(account.requiredApprovals)}
            />
            {transferLimits && (
              <>
                <InfoItem
                  icon={CreditCard}
                  label="One-Time Limit (Beneficiary)"
                  value={formatMoney(
                    transferLimits.effectiveOneTimeLimitBeneficiary,
                    account.currency,
                  )}
                />
                <InfoItem
                  icon={CreditCard}
                  label="One-Time Limit (Stranger)"
                  value={formatMoney(
                    transferLimits.effectiveOneTimeLimitStranger,
                    account.currency,
                  )}
                />
              </>
            )}
          </div>
        </section>

        {/* 2. Transfer Limits & Safety Management Card */}
        <section id="transfer-limit-section">
          <TransferLimitCard
            accountNumber={account.accountNumber}
            currency={account.currency}
            onLimitsLoaded={setTransferLimits}
            autoOpenModal={Boolean(locationState?.autoOpenLimitModal)}
          />
        </section>
      </div>
    </main>
  );
}
