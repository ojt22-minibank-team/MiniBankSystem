
import { useEffect, useState } from "react";
import type { MouseEvent } from "react";
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

import { getMyAccount } from "../api/customerAccountApi";
import type { CustomerAccount, TransferLimitInfo } from "../types/accountTypes";
import AccountStatus from "./components/AccountStatus";
import { TransferLimitCard } from "./components/TransferLimitCard";

function formatLabel(value: string): string {
  return value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatMoney(amount: number, currency: string): string {
  return `${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)} ${currency}`;
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
  icon: typeof Wallet;
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
  return (
    <div
      className="mx-auto max-w-5xl space-y-4 p-4 md:p-6"
      role="status"
      aria-label="Loading account details"
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

      <span className="sr-only">
        Loading your account details.
      </span>
    </div>
  );
}

export default function AccountDetailPage() {
  const { accountNumber } = useParams<{
    accountNumber: string;
  }>();

  const [account, setAccount] =
    useState<CustomerAccount | null>(null);

  const [transferLimits, setTransferLimits] =
    useState<TransferLimitInfo | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  const [showAccountNumber, setShowAccountNumber] =
    useState(false);

  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadAccount() {
      setLoading(true);
      setError(null);
      setTransferLimits(null);

      setShowAccountNumber(false);
      setCopied(false);
      setCopyError(null);

      if (!accountNumber) {
        setAccount(null);
        setError("The account number is missing from the URL.");
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

        setAccount(null);
        setError(
          "We couldn't load this account's details. Please try again."
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
  }, [accountNumber, retryKey]);

  async function handleCopyAccountNumber(
    event: MouseEvent<HTMLButtonElement>
  ) {
    event.preventDefault();
    event.stopPropagation();

    if (!account) return;

    setCopied(false);
    setCopyError(null);

    try {
      await navigator.clipboard.writeText(account.accountNumber);
      setCopied(true);
    } catch (err) {
      console.error("Failed to copy account number:", err);
      setCopyError("Unable to copy. Please select the number manually.");
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
          My Accounts
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
            Unable to Load Account
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            {error ?? "This account could not be found."}
          </p>

          <button
            type="button"
            onClick={() => setRetryKey((key) => key + 1)}
            className="mt-4 inline-flex min-h-9 items-center gap-2 rounded-lg bg-[#0878E8] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0878E8] focus-visible:ring-offset-2"
          >
            <RefreshCw size={14} aria-hidden="true" />
            Try Again
          </button>
        </section>
      </main>
    );
  }

  const AccountIcon = getAccountIcon(account.accountType);
  const maskedAccountNumber = maskAccountNumber(account.accountNumber);

  return (
    <main className="mx-auto max-w-5xl space-y-4 p-4 md:p-6">
      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-2 text-sm"
      >
        <Link
          to="/accounts"
          className="font-medium text-slate-500 transition-colors hover:text-[#0878E8]"
        >
          My Accounts
        </Link>

        <span className="text-slate-300" aria-hidden="true">
          /
        </span>

        <span
          className="truncate font-medium text-[#08295C]"
          aria-current="page"
        >
          {formatLabel(account.accountType)} Account
        </span>
      </nav>

      {/* Account Overview */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {/* Header */}
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
                {formatLabel(account.accountType)} Account
              </h1>

              {/* Account Number Controls */}
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
                      ? "Hide account number"
                      : "Show account number"
                  }
                  aria-pressed={showAccountNumber}
                  title={
                    showAccountNumber
                      ? "Hide account number"
                      : "Show account number"
                  }
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-500 transition hover:bg-blue-100 hover:text-[#0878E8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0878E8]"
                >
                  {showAccountNumber ? (
                    <EyeOff size={15} />
                  ) : (
                    <Eye size={15} />
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleCopyAccountNumber}
                  aria-label="Copy account number"
                  title={copied ? "Copied" : "Copy account number"}
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-500 transition hover:bg-blue-100 hover:text-[#0878E8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0878E8]"
                >
                  {copied ? (
                    <Check
                      size={15}
                      className="text-emerald-600"
                    />
                  ) : (
                    <Copy size={15} />
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
                  Account number copied.
                </p>
              )}
            </div>

            <div className="shrink-0">
              <AccountStatus status={account.status} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Balances */}
          <div className="min-w-0 p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Available Balance
            </p>

            <p className="mt-1.5 break-words text-2xl font-bold tracking-tight text-[#08295C] sm:text-[27px]">
              {formatMoney(
                account.availableBalance,
                account.currency
              )}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Funds available for transactions
            </p>

            <div className="my-4 border-t border-slate-100" />

            <p className="text-xs font-medium text-slate-500">
              Current Balance
            </p>

            <p className="mt-1 break-words text-lg font-semibold text-slate-800">
              {formatMoney(
                account.currentBalance,
                account.currency
              )}
            </p>

            <p className="mt-3 text-xs leading-5 text-slate-500">
              {account.accountType.toUpperCase().includes("SAVING")
                ? "Save for your future and manage your savings securely."
                : "Manage your account and available funds securely."}
            </p>
          </div>

          {/* Account Metadata */}
          <div className="min-w-0 border-t border-slate-100 bg-slate-50/50 px-4 py-2 sm:px-5 lg:border-l lg:border-t-0">
            <h2 className="pb-1 pt-2 text-sm font-bold text-[#08295C]">
              Account Details
            </h2>

            <dl>
              <DetailRow
                icon={CreditCard}
                label="Account Type"
                value={formatLabel(account.accountType)}
              />

              <DetailRow
                icon={Wallet}
                label="Currency"
                value={account.currency}
              />

              <DetailRow
                icon={CalendarDays}
                label="Opened Date"
                value={formatDate(account.openedAt)}
              />

              <DetailRow
                icon={Wallet}
                label="Minimum Balance"
                value={formatMoney(
                  account.minimumBalance,
                  account.currency
                )}
              />
            </dl>
          </div>
        </div>
      </section>

      {/* Additional Account Information */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#0878E8]">
            <Wallet size={18} aria-hidden="true" />
          </div>

          <div className="min-w-0">
            <h2 className="text-base font-bold text-[#08295C]">
              Account Information
            </h2>

            <p className="mt-0.5 text-xs text-slate-500">
              Account configuration and transfer limits
            </p>
          </div>
        </div>

        <dl className="mt-3 divide-y divide-slate-100">
          <DetailRow
            icon={CreditCard}
            label="Account Category"
            value={formatLabel(account.accountCategory)}
          />

          <DetailRow
            icon={Wallet}
            label="Account Status"
            value={formatLabel(account.status)}
          />

          <DetailRow
            icon={Wallet}
            label="Daily Transfer Limit"
            value={formatMoney(
              account.dailyTransferLimit,
              account.currency
            )}
          />

          {transferLimits && (
            <>
              <DetailRow
                icon={CreditCard}
                label="One-time Transfer Limit (Beneficiary)"
                value={formatMoney(
                  transferLimits.effectiveOneTimeLimitBeneficiary,
                  account.currency
                )}
              />

              <DetailRow
                icon={CreditCard}
                label="One-time Transfer Limit (Stranger)"
                value={formatMoney(
                  transferLimits.effectiveOneTimeLimitStranger,
                  account.currency
                )}
              />
            </>
          )}

          <DetailRow
            icon={CreditCard}
            label="Joint Account"
            value={account.jointAccount ? "Yes" : "No"}
          />

          <DetailRow
            icon={CreditCard}
            label="Required Approvals"
            value={String(account.requiredApprovals)}
          />

          {account.closedAt && (
            <DetailRow
              icon={CalendarDays}
              label="Closed Date"
              value={formatDate(account.closedAt)}
            />
          )}
        </dl>
      </section>

      {/* Transfer Limits & Security Management */}
      <TransferLimitCard
        accountNumber={account.accountNumber}
        currency={account.currency}
        onLimitsLoaded={setTransferLimits}

      />

      {/* Security Note */}
      <div className="flex items-start gap-2.5 rounded-lg border border-blue-100 bg-blue-50/60 p-3">
        <CreditCard
          size={16}
          className="mt-0.5 shrink-0 text-[#0878E8]"
          aria-hidden="true"
        />

        <p className="text-xs leading-5 text-slate-600">
          Account availability and transaction permissions depend
          on your bank's account status and policies.
        </p>
      </div>
    </main>
  );
}
