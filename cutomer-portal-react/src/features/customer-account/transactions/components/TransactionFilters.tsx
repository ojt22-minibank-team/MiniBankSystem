import { useId } from "react";
import { Filter, X, AlertCircle } from "lucide-react";
import type { CustomerAccount } from "../../accounts/types/accountTypes";
import type { TransactionFilterDraft } from "../types/transactionHistoryTypes";
import { formatStatusLabel, formatTypeLabel } from "../types/transactionHistoryTypes";

interface TransactionFiltersProps {
  accounts: CustomerAccount[];
  selectedAccountNumber: string;
  onAccountChange: (accountNumber: string) => void;
  availableStatuses: string[];
  availableTypes: string[];
  draftFilters: TransactionFilterDraft;
  onDraftChange: (field: keyof TransactionFilterDraft, value: string) => void;
  onApply: () => void;
  onClear: () => void;
  isApplying?: boolean;
  validationError: string | null;
}

export default function TransactionFilters({
  accounts,
  selectedAccountNumber,
  onAccountChange,
  availableStatuses,
  availableTypes,
  draftFilters,
  onDraftChange,
  onApply,
  onClear,
  isApplying = false,
  validationError,
}: TransactionFiltersProps) {
  const accountSelectId = useId();
  const typeSelectId = useId();
  const statusSelectId = useId();
  const fromDateId = useId();
  const toDateId = useId();
  const minAmountId = useId();
  const maxAmountId = useId();

  const activeAccounts = accounts.filter((acc) => acc.status === "ACTIVE");

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-[#0878E8]" aria-hidden="true" />
          <h2 className="text-sm font-bold text-slate-800">Filter Transactions</h2>
        </div>
      </div>

      {/* Validation Error Banner */}
      {validationError && (
        <div
          role="alert"
          className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700"
        >
          <AlertCircle size={16} className="shrink-0" aria-hidden="true" />
          <span>{validationError}</span>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!validationError && !isApplying) {
            onApply();
          }
        }}
        className="space-y-4"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* 1. Account Selector */}
          <div>
            <label
              htmlFor={accountSelectId}
              className="mb-1.5 block text-xs font-semibold text-slate-700"
            >
              Account <span className="text-red-500">*</span>
            </label>
            <select
              id={accountSelectId}
              value={selectedAccountNumber}
              onChange={(e) => onAccountChange(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-sm transition hover:border-slate-400 focus:border-[#0878E8] focus:outline-none focus:ring-1 focus:ring-[#0878E8]"
            >
              {activeAccounts.length === 0 ? (
                <option value="">No active accounts</option>
              ) : (
                activeAccounts.map((account) => (
                  <option key={account.accountNumber} value={account.accountNumber}>
                    {account.accountNumber} • {account.accountType}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* 2. Transaction Type Filter */}
          <div>
            <label
              htmlFor={typeSelectId}
              className="mb-1.5 block text-xs font-semibold text-slate-700"
            >
              Transaction Type
            </label>
            <select
              id={typeSelectId}
              value={draftFilters.transactionType}
              onChange={(e) => onDraftChange("transactionType", e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-sm transition hover:border-slate-400 focus:border-[#0878E8] focus:outline-none focus:ring-1 focus:ring-[#0878E8]"
            >
              <option value="">All Types</option>
              {availableTypes.map((type) => (
                <option key={type} value={type}>
                  {formatTypeLabel(type)}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Status Filter */}
          <div>
            <label
              htmlFor={statusSelectId}
              className="mb-1.5 block text-xs font-semibold text-slate-700"
            >
              Status
            </label>
            <select
              id={statusSelectId}
              value={draftFilters.status}
              onChange={(e) => onDraftChange("status", e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-sm transition hover:border-slate-400 focus:border-[#0878E8] focus:outline-none focus:ring-1 focus:ring-[#0878E8]"
            >
              <option value="">All Statuses</option>
              {availableStatuses.map((st) => (
                <option key={st} value={st}>
                  {formatStatusLabel(st)}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Date From */}
          <div>
            <label
              htmlFor={fromDateId}
              className="mb-1.5 block text-xs font-semibold text-slate-700"
            >
              From Date
            </label>
            <input
              id={fromDateId}
              type="date"
              value={draftFilters.fromDate}
              onChange={(e) => onDraftChange("fromDate", e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 shadow-sm transition hover:border-slate-400 focus:border-[#0878E8] focus:outline-none focus:ring-1 focus:ring-[#0878E8]"
            />
          </div>

          {/* 5. Date To */}
          <div>
            <label
              htmlFor={toDateId}
              className="mb-1.5 block text-xs font-semibold text-slate-700"
            >
              To Date
            </label>
            <input
              id={toDateId}
              type="date"
              value={draftFilters.toDate}
              onChange={(e) => onDraftChange("toDate", e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 shadow-sm transition hover:border-slate-400 focus:border-[#0878E8] focus:outline-none focus:ring-1 focus:ring-[#0878E8]"
            />
          </div>

          {/* 6. Amount Range */}
          <div>
            <label
              htmlFor={minAmountId}
              className="mb-1.5 block text-xs font-semibold text-slate-700"
            >
              Amount Range (MMK)
            </label>
            <div className="flex items-center gap-2">
              <input
                id={minAmountId}
                type="number"
                min="0"
                step="any"
                placeholder="Min"
                value={draftFilters.minAmount}
                onChange={(e) => onDraftChange("minAmount", e.target.value)}
                className="w-1/2 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 shadow-sm transition hover:border-slate-400 focus:border-[#0878E8] focus:outline-none focus:ring-1 focus:ring-[#0878E8]"
              />
              <span className="text-slate-400 text-xs font-bold">-</span>
              <input
                id={maxAmountId}
                type="number"
                min="0"
                step="any"
                placeholder="Max"
                value={draftFilters.maxAmount}
                onChange={(e) => onDraftChange("maxAmount", e.target.value)}
                className="w-1/2 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 shadow-sm transition hover:border-slate-400 focus:border-[#0878E8] focus:outline-none focus:ring-1 focus:ring-[#0878E8]"
              />
            </div>
          </div>
        </div>

        {/* Filter Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClear}
            disabled={isApplying}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:opacity-50"
          >
            <X size={14} aria-hidden="true" />
            Clear Filters
          </button>
          <button
            type="submit"
            disabled={Boolean(validationError) || isApplying}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#0878E8] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-[#0878E8] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isApplying ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Applying...
              </>
            ) : (
              "Apply Filters"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
