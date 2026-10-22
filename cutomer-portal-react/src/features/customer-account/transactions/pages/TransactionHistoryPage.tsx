import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { History, AlertCircle, RefreshCw, AlertTriangle } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../../../lib/redux";
import { fetchMyAccounts } from "../../accounts/stores/accountsSlice";
import type {
  CusTransactionHistoryResponseDTO,
  TransactionFilterDraft,
  TransactionFilterApplied,
} from "../types/transactionHistoryTypes";
import {
  getDefaultSelectedAccountNumber,
} from "../types/transactionHistoryTypes";
import {
  getTransactions,
  getTransactionStatuses,
  getTransactionTypes,
} from "../services/transactionHistoryService";
import TransactionFilters from "../components/TransactionFilters";
import TransactionTable from "../components/TransactionTable";
import TransactionPagination from "../components/TransactionPagination";

const INITIAL_DRAFT_FILTERS: TransactionFilterDraft = {
  status: "",
  transactionType: "",
  fromDate: "",
  toDate: "",
  minAmount: "",
  maxAmount: "",
};

const INITIAL_APPLIED_FILTERS: TransactionFilterApplied = {
  status: "",
  transactionType: "",
  fromDate: "",
  toDate: "",
  minAmount: undefined,
  maxAmount: undefined,
};

export default function TransactionHistoryPage() {
  const dispatch = useAppDispatch();
  const { accounts, loading: accountsLoading, error: accountsError } = useAppSelector(
    (state) => state.accounts
  );

  // Selected account state (user selection takes precedence, initialized via default rule)
  const [selectedAccNo, setSelectedAccNo] = useState<string | null>(null);

  // Discovery options
  const [availableStatuses, setAvailableStatuses] = useState<string[]>([]);
  const [availableTypes, setAvailableTypes] = useState<string[]>([]);

  // Filter state
  const [draftFilters, setDraftFilters] = useState<TransactionFilterDraft>(INITIAL_DRAFT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<TransactionFilterApplied>(INITIAL_APPLIED_FILTERS);

  // Pagination state (0-indexed page)
  const [page, setPage] = useState<number>(0);
  const [size, setSize] = useState<number>(10);

  // Retry trigger for error recovery
  const [retryTrigger, setRetryTrigger] = useState<number>(0);

  // Data & loading states
  const [historyData, setHistoryData] = useState<CusTransactionHistoryResponseDTO | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  // Load customer accounts on mount if needed
  useEffect(() => {
    if (accounts.length === 0) {
      void dispatch(fetchMyAccounts());
    }
  }, [dispatch, accounts.length]);

  // Derive initial default account when accounts load and user hasn't selected one
  const activeAccountNumber = useMemo(() => {
    if (selectedAccNo !== null) {
      return selectedAccNo;
    }
    return getDefaultSelectedAccountNumber(accounts);
  }, [selectedAccNo, accounts]);

  // Client validation for draft filters
  const validationError = useMemo<string | null>(() => {
    const { fromDate, toDate, minAmount, maxAmount } = draftFilters;

    if (fromDate && toDate && fromDate > toDate) {
      return "From date cannot be after To date.";
    }

    const minNum = minAmount.trim() !== "" ? Number(minAmount) : NaN;
    const maxNum = maxAmount.trim() !== "" ? Number(maxAmount) : NaN;

    if (!Number.isNaN(minNum) && minNum < 0) {
      return "Minimum amount must be greater than or equal to 0.";
    }

    if (!Number.isNaN(maxNum) && maxNum < 0) {
      return "Maximum amount must be greater than or equal to 0.";
    }

    if (!Number.isNaN(minNum) && !Number.isNaN(maxNum) && minNum > maxNum) {
      return "Minimum amount cannot be greater than Maximum amount.";
    }

    return null;
  }, [draftFilters]);

  // Check if any filters are currently applied
  const hasFiltersApplied = useMemo(() => {
    return (
      appliedFilters.status !== "" ||
      appliedFilters.transactionType !== "" ||
      appliedFilters.fromDate !== "" ||
      appliedFilters.toDate !== "" ||
      appliedFilters.minAmount !== undefined ||
      appliedFilters.maxAmount !== undefined
    );
  }, [appliedFilters]);

  // Status and Type discovery effect: strictly owned by activeAccountNumber
  useEffect(() => {
    if (!activeAccountNumber) {
      setAvailableStatuses([]);
      setAvailableTypes([]);
      return;
    }

    const controller = new AbortController();

    Promise.all([
      getTransactionStatuses(activeAccountNumber, controller.signal),
      getTransactionTypes(activeAccountNumber, controller.signal),
    ])
      .then(([statuses, types]) => {
        setAvailableStatuses(statuses);
        setAvailableTypes(types);
      })
      .catch((err: unknown) => {
        if (!axios.isCancel(err) && !(err instanceof Error && err.name === "AbortError")) {
          console.error("Failed to discover statuses or types:", err);
        }
      });

    return () => {
      controller.abort();
    };
  }, [activeAccountNumber]);

  // Transaction history effect: strictly owned by account, applied filters, pagination, and retry
  useEffect(() => {
    if (!activeAccountNumber) {
      setHistoryData(null);
      setIsLoadingHistory(false);
      return;
    }

    const controller = new AbortController();
    setIsLoadingHistory(true);
    setHistoryError(null);

    getTransactions(
      {
        accountNumber: activeAccountNumber,
        page,
        size,
        status: appliedFilters.status,
        transactionType: appliedFilters.transactionType,
        fromDate: appliedFilters.fromDate,
        toDate: appliedFilters.toDate,
        minAmount: appliedFilters.minAmount,
        maxAmount: appliedFilters.maxAmount,
      },
      controller.signal
    )
      .then((result) => {
        setHistoryData(result);
      })
      .catch((err: unknown) => {
        if (
          axios.isCancel(err) ||
          (err instanceof Error && (err.name === "CanceledError" || err.name === "AbortError"))
        ) {
          return;
        }
        let errorMsg = "Failed to load transaction history. Please try again.";
        if (axios.isAxiosError(err)) {
          errorMsg = err.response?.data?.message || err.message || errorMsg;
        }
        setHistoryError(errorMsg);
      })
      .finally(() => {
        setIsLoadingHistory(false);
      });

    return () => {
      controller.abort();
    };
  }, [activeAccountNumber, appliedFilters, page, size, retryTrigger]);

  // Handle Account Change
  const handleAccountChange = (newAccNo: string) => {
    if (newAccNo === activeAccountNumber) return;

    setSelectedAccNo(newAccNo);
    setPage(0);

    setDraftFilters((prev) => ({
      ...prev,
      status: "",
      transactionType: "",
    }));
    setAppliedFilters((prev) => ({
      ...prev,
      status: "",
      transactionType: "",
    }));
  };

  // Draft filter input changes
  const handleDraftChange = (field: keyof TransactionFilterDraft, value: string) => {
    setDraftFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Apply filters handler
  const handleApplyFilters = () => {
    if (validationError || !activeAccountNumber) return;

    const minNum = draftFilters.minAmount.trim() !== "" ? Number(draftFilters.minAmount) : undefined;
    const maxNum = draftFilters.maxAmount.trim() !== "" ? Number(draftFilters.maxAmount) : undefined;

    setAppliedFilters({
      status: draftFilters.status,
      transactionType: draftFilters.transactionType,
      fromDate: draftFilters.fromDate,
      toDate: draftFilters.toDate,
      minAmount: minNum,
      maxAmount: maxNum,
    });
    setPage(0);
  };

  // Clear filters handler
  const handleClearFilters = () => {
    setDraftFilters(INITIAL_DRAFT_FILTERS);
    setAppliedFilters(INITIAL_APPLIED_FILTERS);
    setPage(0);
  };

  // Pagination page change
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  // Pagination size change
  const handleSizeChange = (newSize: number) => {
    setSize(newSize);
    setPage(0);
  };

  // Retry on error
  const handleRetry = () => {
    setRetryTrigger((prev) => prev + 1);
  };

  const hasActiveAccounts = accounts.some((a) => a.status === "ACTIVE");

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0878E8]/10 text-[#0878E8] shadow-sm">
            <History size={24} aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Transaction History
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Review and filter real-time transaction activity across your accounts.
            </p>
          </div>
        </div>
      </div>

      {/* Account Loading Skeleton */}
      {accountsLoading && (
        <div className="animate-pulse space-y-4">
          <div className="h-32 rounded-2xl bg-slate-200" />
          <div className="h-64 rounded-2xl bg-slate-200" />
        </div>
      )}

      {/* Accounts Fetch Error */}
      {!accountsLoading && accountsError && (
        <section
          role="alert"
          className="flex flex-col items-center justify-center rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600 mb-4">
            <AlertCircle size={24} aria-hidden="true" />
          </div>
          <h2 className="text-base font-bold text-slate-900">Unable to Load Customer Accounts</h2>
          <p className="mt-2 max-w-md text-sm text-slate-500">
            {accountsError || "Could not retrieve your bank accounts. Please try again."}
          </p>
          <button
            type="button"
            onClick={() => void dispatch(fetchMyAccounts())}
            className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-[#0878E8] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            <RefreshCw size={15} aria-hidden="true" />
            Try Again
          </button>
        </section>
      )}

      {/* Case A Empty State: No Active Account Available */}
      {!accountsLoading && !accountsError && !hasActiveAccounts && (
        <div
          role="alert"
          className="flex flex-col items-center justify-center rounded-2xl border border-amber-200 bg-amber-50/50 p-8 text-center shadow-sm"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-700 mb-4">
            <AlertTriangle size={24} aria-hidden="true" />
          </div>
          <h2 className="text-base font-bold text-slate-900">No Active Account Available</h2>
          <p className="mt-2 max-w-md text-xs sm:text-sm text-slate-600">
            No active bank account is available to view transaction history. Please contact customer
            support or open an active account.
          </p>
        </div>
      )}

      {/* Main Content Area */}
      {!accountsLoading && !accountsError && hasActiveAccounts && (
        <>
          {/* Filters Form */}
          <TransactionFilters
            accounts={accounts}
            selectedAccountNumber={activeAccountNumber}
            onAccountChange={handleAccountChange}
            availableStatuses={availableStatuses}
            availableTypes={availableTypes}
            draftFilters={draftFilters}
            onDraftChange={handleDraftChange}
            onApply={handleApplyFilters}
            onClear={handleClearFilters}
            isApplying={isLoadingHistory}
            validationError={validationError}
          />

          {/* History Error Banner */}
          {historyError && (
            <div
              role="alert"
              className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800"
            >
              <div className="flex items-center gap-3">
                <AlertCircle size={20} className="shrink-0 text-red-600" aria-hidden="true" />
                <span className="text-xs sm:text-sm font-medium">{historyError}</span>
              </div>
              <button
                type="button"
                onClick={handleRetry}
                className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-red-700"
              >
                <RefreshCw size={14} aria-hidden="true" />
                Try Again
              </button>
            </div>
          )}

          {/* Transaction Table */}
          <TransactionTable
            transactions={historyData?.content || []}
            isLoading={isLoadingHistory}
            hasFiltersApplied={hasFiltersApplied}
            onClearFilters={handleClearFilters}
          />

          {/* Pagination */}
          <TransactionPagination
            page={page}
            size={size}
            totalPages={historyData?.totalPages || 0}
            totalElements={historyData?.totalElements || 0}
            hasNext={Boolean(historyData?.hasNext)}
            hasPrevious={Boolean(historyData?.hasPrevious)}
            onPageChange={handlePageChange}
            onSizeChange={handleSizeChange}
            disabled={isLoadingHistory}
          />
        </>
      )}
    </div>
  );
}
