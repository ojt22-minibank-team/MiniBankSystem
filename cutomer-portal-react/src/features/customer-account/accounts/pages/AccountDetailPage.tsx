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
  PiggyBank,
  RefreshCw,
  Wallet,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { getMyAccount } from "../api/customerAccountApi";
import type {
  CustomerAccount,
  TransferLimitInfo,
  AccountStatus as AccountStatusType,
} from "../types/accountTypes";
import AccountStatus from "../components/AccountStatus";
import { TransferLimitCard } from "../components/TransferLimitCard";

function formatLabel(value: string): string {
  return value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function getAccountTypeLabel(
  accountType: string,
  t: (key: string) => string,
): string {
  const type = accountType.toUpperCase();

  if (type.includes("SAVING")) return t("accountTypeSavings");
  if (type.includes("CURRENT")) return t("accountTypeCurrent");

  return formatLabel(accountType);
}

function getStatusLabel(
  status: AccountStatusType,
  t: (key: string) => string,
): string {
  const labels: Record<AccountStatusType, string> = {
    ACTIVE: t("statusActive"),
    DORMANT: t("statusDormant"),
    FROZEN: t("statusFrozen"),
    CLOSED: t("statusClosed"),
  };

  return labels[status] ?? status;
}

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

function getAccountIcon(accountType: string) {
  const type = accountType.toUpperCase();

  if (type.includes("SAVING")) return PiggyBank;
  if (type.includes("CURRENT")) return CreditCard;

  return Wallet;
}

function maskAccountNumber(accountNumber: string): string {
  if (accountNumber.length <= 4) {
    return "•".repeat(accountNumber.length);
  }

  return `**** **** ${accountNumber.slice(-4)}`;
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="grid grid-cols-[18px_minmax(0,1fr)] items-center gap-x-3 border-b border-slate-100 py-3 last:border-b-0 sm:grid-cols-[18px_minmax(0,1fr)_minmax(100px,auto)]">
      <Icon
        size={16}
        className="text-slate-400"
        aria-hidden="true"
      />

      <dt className="text-sm text-slate-500">{label}</dt>

      <dd className="col-start-2 mt-1 break-words text-sm font-semibold text-slate-800 sm:col-start-3 sm:mt-0 sm:text-right">
        {value}
      </dd>
    </div>
  );
}

function AccountDetailSkeleton() {
  const { t } = useTranslation("accounts");

  return (
    <div
      className="mx-auto max-w-5xl space-y-4 p-4 md:p-6"
      role="status"
      aria-label={t("loadingAccountDetails")}
    >
      <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />

      <div className="grid animate-pulse grid-cols-1 gap-5 rounded-2xl border border-slate-200 bg-white p-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-5">
          <div className="flex gap-3">
            <div className="h-12 w-12 rounded-xl bg-slate-200" />

            <div className="flex-1 space-y-2 py-1">
              <div className="h-5 w-36 rounded bg-slate-200" />
              <div className="h-4 w-28 rounded bg-slate-200" />
            </div>
          </div>

          <div className="h-6 w-48 rounded bg-slate-200" />
          <div className="h-6 w-48 rounded bg-slate-200" />
        </div>

        <div className="space-y-4">
          <div className="h-8 rounded bg-slate-100" />
          <div className="h-8 rounded bg-slate-100" />
          <div className="h-8 rounded bg-slate-100" />
        </div>
      </div>

      <span className="sr-only">{t("loadingAccountDetails")}</span>
    </div>
  );
}

export default function AccountDetailPage() {
  const { t } = useTranslation("accounts");
  const { accountNumber } = useParams<{ accountNumber: string }>();

  const [account, setAccount] = useState<CustomerAccount | null>(null);
  const [transferLimits, setTransferLimits] =
    useState<TransferLimitInfo | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  const [showAccountNumber, setShowAccountNumber] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadAccount() {
      setLoading(true);
      setError(null);
      setTransferLimits(null);
      setAccount(null);
      setShowAccountNumber(false);
      setCopied(false);
      setCopyError(null);

      if (!accountNumber) {
        setError(t("missingAccountNumber"));
        setLoading(false);
        return;
      }

      try {
        const data = await getMyAccount(accountNumber);

        if (cancelled) return;

        setAccount(data);
      } catch (err) {
        console.error("Failed to load account details:", err);

        if (cancelled) return;

        setError(t("accountLoadError"));
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
  }, [accountNumber, retryKey, t]);

  async function handleCopyAccountNumber() {
    if (!account) return;

    setCopied(false);
    setCopyError(null);

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard API is unavailable.");
      }

      await navigator.clipboard.writeText(account.accountNumber);
      setCopied(true);
    } catch (err) {
      console.error("Failed to copy account number:", err);
      setCopyError(t("copyFailedDescription"));
    }
  }

  if (loading) {
    return <AccountDetailSkeleton />;
  }

  if (error || !account) {
    return (
      <main className="mx-auto max-w-5xl p-4 md:p-6">
        <Link
          to="/accounts"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-[#0878E8]"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          {t("title")}
        </Link>

        <section
          className="mt-5 rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm"
          role="alert"
        >
          <CreditCard
            size={26}
            className="mx-auto text-red-500"
            aria-hidden="true"
          />

          <h1 className="mt-3 text-lg font-bold text-slate-900">
            {t("unableToLoadAccount")}
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            {error ?? t("accountNotFound")}
          </p>

          <button
            type="button"
            onClick={() => setRetryKey((key) => key + 1)}
            className="mt-4 inline-flex min-h-9 items-center gap-2 rounded-lg bg-[#0878E8] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0878E8] focus-visible:ring-offset-2"
          >
            <RefreshCw size={14} aria-hidden="true" />
            {t("tryAgain")}
          </button>
        </section>
      </main>
    );
  }

  const AccountIcon = getAccountIcon(account.accountType);
  const maskedAccountNumber = maskAccountNumber(account.accountNumber);
  const accountTypeLabel = getAccountTypeLabel(account.accountType, t);
  const statusLabel = getStatusLabel(account.status, t);

  return (
    <main className="mx-auto max-w-5xl space-y-4 p-4 md:p-6">
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-2 text-sm"
      >
        <Link
          to="/accounts"
          className="font-medium text-slate-500 transition-colors hover:text-[#0878E8]"
        >
          {t("title")}
        </Link>

        <span className="text-slate-300" aria-hidden="true">
          /
        </span>

        <span
          className="truncate font-medium text-[#08295C]"
          aria-current="page"
        >
          {accountTypeLabel}
        </span>
      </nav>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-blue-100 bg-gradient-to-r from-[#f5f9ff] to-[#edf5ff] px-4 py-4 sm:px-5">
          <div className="flex items-center gap-3">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-[#0878E8]"
              aria-hidden="true"
            >
              <AccountIcon size={23} strokeWidth={1.8} />
            </div>

            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-bold tracking-tight text-[#08295C]">
                {accountTypeLabel}
              </h1>

              <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5">
                <p className="break-all text-xs font-medium tracking-wide text-slate-600">
                  {showAccountNumber
                    ? account.accountNumber
                    : maskedAccountNumber}
                </p>

                <button
                  type="button"
                  onClick={() =>
                    setShowAccountNumber((visible) => !visible)
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
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-500 transition hover:bg-blue-100 hover:text-[#0878E8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0878E8]"
                >
                  {showAccountNumber ? (
                    <EyeOff size={15} aria-hidden="true" />
                  ) : (
                    <Eye size={15} aria-hidden="true" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleCopyAccountNumber}
                  aria-label={t("copyAccountNumber")}
                  title={copied ? t("copied") : t("copyAccountNumber")}
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-500 transition hover:bg-blue-100 hover:text-[#0878E8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0878E8]"
                >
                  {copied ? (
                    <Check
                      size={15}
                      className="text-emerald-600"
                      aria-hidden="true"
                    />
                  ) : (
                    <Copy size={15} aria-hidden="true" />
                  )}
                </button>
              </div>

              {copyError && (
                <p className="mt-1 text-xs text-red-600" role="status">
                  {copyError}
                </p>
              )}

              {copied && (
                <p className="mt-1 text-xs text-emerald-700" role="status">
                  {t("accountNumberCopied")}
                </p>
              )}
            </div>

            <div className="shrink-0">
              <AccountStatus status={account.status} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="min-w-0 p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {t("availableBalance")}
            </p>

            <p className="mt-1.5 break-words text-2xl font-bold tracking-tight text-[#08295C] sm:text-[27px]">
              {formatMoney(account.availableBalance, account.currency)}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              {t("fundsAvailableDescription")}
            </p>

            <div className="my-4 border-t border-slate-100" />

            <p className="text-xs font-medium text-slate-500">
              {t("currentBalance")}
            </p>

            <p className="mt-1 break-words text-lg font-semibold text-slate-800">
              {formatMoney(account.currentBalance, account.currency)}
            </p>

            <p className="mt-3 text-xs leading-5 text-slate-500">
              {account.accountType.toUpperCase().includes("SAVING")
                ? t("savingsDescription")
                : t("generalAccountDescription")}
            </p>
          </div>

          <div className="min-w-0 border-t border-slate-100 bg-slate-50/50 px-4 py-2 sm:px-5 lg:border-l lg:border-t-0">
            <h2 className="pb-1 pt-2 text-sm font-bold text-[#08295C]">
              {t("accountDetails")}
            </h2>

            <dl>
              <DetailRow
                icon={CreditCard}
                label={t("accountType")}
                value={accountTypeLabel}
              />

              <DetailRow
                icon={Wallet}
                label={t("currency")}
                value={account.currency}
              />

              <DetailRow
                icon={CalendarDays}
                label={t("openedDate")}
                value={formatDate(account.openedAt)}
              />

              <DetailRow
                icon={Wallet}
                label={t("minimumBalance")}
                value={formatMoney(account.minimumBalance, account.currency)}
              />
            </dl>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#0878E8]">
            <Wallet size={18} aria-hidden="true" />
          </div>

          <div className="min-w-0">
            <h2 className="text-base font-bold text-[#08295C]">
              {t("accountInformation")}
            </h2>

            <p className="mt-0.5 text-xs text-slate-500">
              {t("transferLimitsDescription")}
            </p>
          </div>
        </div>

        <dl className="mt-3 divide-y divide-slate-100">
          <DetailRow
            icon={CreditCard}
            label={t("accountCategory")}
            value={formatLabel(account.accountCategory)}
          />

          <DetailRow
            icon={Wallet}
            label={t("accountStatus")}
            value={statusLabel}
          />

          <DetailRow
            icon={Wallet}
            label={t("dailyTransferLimit")}
            value={formatMoney(account.dailyTransferLimit, account.currency)}
          />

          {transferLimits && (
            <>
              <DetailRow
                icon={CreditCard}
                label={t("oneTimeTransferLimitBeneficiary")}
                value={formatMoney(
                  transferLimits.effectiveOneTimeLimitBeneficiary,
                  account.currency,
                )}
              />

              <DetailRow
                icon={CreditCard}
                label={t("oneTimeTransferLimitStranger")}
                value={formatMoney(
                  transferLimits.effectiveOneTimeLimitStranger,
                  account.currency,
                )}
              />
            </>
          )}

          <DetailRow
            icon={CreditCard}
            label={t("jointAccount")}
            value={account.jointAccount ? t("yes") : t("no")}
          />

          <DetailRow
            icon={CreditCard}
            label={t("requiredApprovals")}
            value={String(account.requiredApprovals)}
          />

          {account.closedAt && (
            <DetailRow
              icon={CalendarDays}
              label={t("closedDate")}
              value={formatDate(account.closedAt)}
            />
          )}
        </dl>
      </section>

      <TransferLimitCard
        accountNumber={account.accountNumber}
        currency={account.currency}
        onLimitsLoaded={setTransferLimits}
      />

      <div className="flex items-start gap-2.5 rounded-lg border border-blue-100 bg-blue-50/60 p-3">
        <CreditCard
          size={16}
          className="mt-0.5 shrink-0 text-[#0878E8]"
          aria-hidden="true"
        />

        <p className="text-xs leading-5 text-slate-600">
          {t("securityNote")}
        </p>
      </div>
    </main>
  );
}