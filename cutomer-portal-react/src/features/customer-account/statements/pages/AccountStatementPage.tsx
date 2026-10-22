import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { FileText, AlertCircle, RefreshCw, AlertTriangle } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../../../lib/redux";
import { fetchMyAccounts } from "../../accounts/stores/accountsSlice";
import { StatementForm } from "../components/StatementForm";
import { StatementVerify } from "../components/StatementVerify";
import { StatementDownload } from "../components/StatementDownload";
import { StatementErrorModal } from "../components/StatementErrorModal";
import type { StatementAccountType, StatementFilterForm, StatementStep } from "../types/statementTypes";
import { validateStatementForm } from "../types/statementTypes";

function StatementPageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Loading account statement form">
      {/* Header skeleton */}
      <div className="flex items-center gap-3.5">
        <div className="h-12 w-12 rounded-2xl bg-slate-200" />
        <div className="space-y-2">
          <div className="h-6 w-48 rounded-md bg-slate-200" />
          <div className="h-3.5 w-64 rounded-md bg-slate-200" />
        </div>
      </div>

      {/* Form card skeleton */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-20 bg-slate-100 rounded-xl" />
          <div className="h-20 bg-slate-100 rounded-xl" />
          <div className="h-20 bg-slate-100 rounded-xl" />
          <div className="h-20 bg-slate-100 rounded-xl" />
        </div>
        <div className="h-10 w-28 bg-slate-200 rounded-xl ml-auto" />
      </div>
    </div>
  );
}

function StatementPageError({ onRetry }: { onRetry: () => void }) {
  return (
    <section
      className="flex flex-col items-center justify-center rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm sm:p-10"
      role="alert"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600 mb-4" aria-hidden="true">
        <AlertCircle size={24} />
      </div>
      <h2 className="text-base font-bold text-slate-900">Unable to Load Customer Accounts</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
        We couldn't retrieve your bank account details to generate a statement. Please try again.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-[#0878E8] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
      >
        <RefreshCw size={15} aria-hidden="true" />
        Try Again
      </button>
    </section>
  );
}

export default function AccountStatementPage() {
  const dispatch = useAppDispatch();
  const { accounts, loading, error } = useAppSelector((state) => state.accounts);

  // User selections (null when unselected by user)
  const [selectedType, setSelectedType] = useState<StatementAccountType | null>(null);
  const [selectedAccNo, setSelectedAccNo] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");

  // Validation state (Step 6C)
  const [latestError, setLatestError] = useState<string | null>(null);
  const [isErrorModalOpen, setIsErrorModalOpen] = useState<boolean>(false);

  // Step state (Step 6D)
  const [currentStep, setCurrentStep] = useState<StatementStep>("form");
  const [confirmedForm, setConfirmedForm] = useState<StatementFilterForm | null>(null);

  // Load customer accounts on mount
  useEffect(() => {
    if (accounts.length === 0) {
      void dispatch(fetchMyAccounts());
    }
  }, [dispatch, accounts.length]);

  // Default Account Number & Initial Account Type Selection (Rules A, B, C)
  const defaultAccount = useMemo<{ type: StatementAccountType; accountNumber: string }>(() => {
    // Rule A: If one or more ACTIVE CURRENT accounts exist
    const activeCurrent = accounts.filter(
      (a) => a.accountType === "CURRENT" && a.status === "ACTIVE"
    );
    if (activeCurrent.length > 0) {
      return { type: "CURRENT", accountNumber: activeCurrent[0].accountNumber };
    }

    // Rule B: If NO ACTIVE CURRENT accounts, find first ACTIVE account of any supported type
    const firstActiveAny = accounts.find(
      (a) =>
        (a.accountType === "CURRENT" || a.accountType === "SAVINGS") &&
        a.status === "ACTIVE"
    );
    if (firstActiveAny) {
      return {
        type: firstActiveAny.accountType as StatementAccountType,
        accountNumber: firstActiveAny.accountNumber,
      };
    }

    // Rule C: No active accounts at all
    return { type: "CURRENT", accountNumber: "" };
  }, [accounts]);

  // Effective form state
  const form: StatementFilterForm = useMemo(() => {
    const accountType = selectedType ?? defaultAccount.type;
    const accountNumber = selectedAccNo ?? defaultAccount.accountNumber;
    return {
      accountType,
      accountNumber,
      fromDate,
      toDate,
    };
  }, [selectedType, selectedAccNo, defaultAccount, fromDate, toDate]);

  // Manual Account Type change handler (Rule 6)
  const handleAccountTypeChange = (newType: StatementAccountType) => {
    setSelectedType(newType);
    const matchingActiveAccounts = accounts.filter(
      (a) => a.accountType === newType && a.status === "ACTIVE"
    );
    setSelectedAccNo(
      matchingActiveAccounts.length > 0 ? matchingActiveAccounts[0].accountNumber : ""
    );
  };

  const handleAccountNumberChange = (accNo: string) => {
    setSelectedAccNo(accNo);
  };

  const handleFromDateChange = (date: string) => {
    setFromDate(date);
  };

  const handleToDateChange = (date: string) => {
    setToDate(date);
  };

  // Retain access to the full selected CustomerAccount object (Rule 9)
  const selectedAccount = useMemo(() => {
    return accounts.find((a) => a.accountNumber === form.accountNumber) || null;
  }, [accounts, form.accountNumber]);

  // Validation handler for Step 6C & 6D
  const handleContinue = () => {
    const validationError = validateStatementForm(form, selectedAccount);
    if (validationError) {
      setLatestError(validationError);
      setIsErrorModalOpen(true);
      return;
    }

    // Validation succeeded: clear error and modal, transition to verify step
    setLatestError(null);
    setIsErrorModalOpen(false);
    setCurrentStep("verify");
  };

  const handleChange = () => {
    // Return to form step, preserving all entered values
    setCurrentStep("form");
  };

  const handleConfirm = () => {
    // Capture confirmed snapshot and transition to download step
    setConfirmedForm({ ...form });
    setCurrentStep("download");
  };

  const handleChangeDetails = () => {
    // Return to form step from download, preserving all entered values
    setConfirmedForm(null);
    setCurrentStep("form");
  };

  const handleRetry = () => {
    setSelectedType(null);
    setSelectedAccNo(null);
    setLatestError(null);
    setIsErrorModalOpen(false);
    setCurrentStep("form");
    setConfirmedForm(null);
    void dispatch(fetchMyAccounts());
  };

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6 md:p-8" aria-busy={loading}>
      {/* Page Header with Breadcrumb */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5">
          {/* Header Icon */}
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[#0878E8] shadow-sm">
            <FileText size={24} />
          </div>

          <div className="min-w-0">
            {/* Breadcrumb Navigation */}
            <nav aria-label="Breadcrumb" className="mb-1 flex flex-wrap items-center gap-2 text-xs font-semibold">
              <Link
                to="/dashboard"
                className="text-slate-500 transition-colors hover:text-[#0878E8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0878E8]"
              >
                Dashboard
              </Link>
              <span className="text-slate-300" aria-hidden="true">/</span>
              <span className="text-[#0878E8]" aria-current="page">Account Statement</span>
            </nav>

            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[#08295C]">
              Account Statement
            </h1>
            <p className="text-xs md:text-sm text-slate-500 mt-0.5">
              {currentStep === "form" && "Select an account and date range to prepare your statement."}
              {currentStep === "verify" && "Please review your statement details before confirming."}
              {currentStep === "download" && "Your statement criteria have been confirmed."}
            </p>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      {loading && accounts.length === 0 ? (
        <StatementPageSkeleton />
      ) : error && accounts.length === 0 ? (
        <StatementPageError onRetry={handleRetry} />
      ) : (
        <>
          {/* Step 1: Form */}
          {currentStep === "form" && (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
              <div className="mb-6 border-b border-slate-100 pb-4">
                <h2 className="text-base font-bold text-slate-900">Statement Criteria</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Choose your account and transaction time period below.
                </p>
              </div>

              {/* Persistent Warning Trigger if previous validation error exists */}
              {latestError && (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setIsErrorModalOpen(true)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setIsErrorModalOpen(true);
                    }
                  }}
                  className="mb-6 flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/90 p-4 text-amber-900 transition-all hover:bg-amber-100 hover:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  title="Click to view validation error details"
                  aria-label={`Validation notice: ${latestError}. Click to view details.`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                      <AlertTriangle size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-wider text-amber-800">
                        Validation Notice
                      </p>
                      <p className="truncate text-sm font-medium text-amber-900">
                        {latestError}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 text-xs font-semibold text-amber-700 underline hover:text-amber-800">
                    View Details &rarr;
                  </span>
                </div>
              )}

              <StatementForm
                form={form}
                accounts={accounts}
                selectedAccount={selectedAccount}
                onAccountTypeChange={handleAccountTypeChange}
                onAccountNumberChange={handleAccountNumberChange}
                onFromDateChange={handleFromDateChange}
                onToDateChange={handleToDateChange}
                onContinue={handleContinue}
              />
            </section>
          )}

          {/* Step 2: Verify */}
          {currentStep === "verify" && (
            <StatementVerify
              form={form}
              account={selectedAccount}
              onChange={handleChange}
              onConfirm={handleConfirm}
            />
          )}

          {/* Step 3: Download Placeholder */}
          {currentStep === "download" && (
            <StatementDownload
              confirmedForm={confirmedForm}
              account={selectedAccount}
              onChangeDetails={handleChangeDetails}
            />
          )}
        </>
      )}

      {/* Validation Error Modal (Only for form step) */}
      {currentStep === "form" && (
        <StatementErrorModal
          isOpen={isErrorModalOpen}
          error={latestError}
          onClose={() => setIsErrorModalOpen(false)}
        />
      )}
    </main>
  );
}
