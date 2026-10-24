import { Inbox, RotateCcw } from "lucide-react";
import type { CusTransactionHistoryItemDTO } from "../types/transactionHistoryTypes";
import {
  formatTransactionDateTime,
  formatTransactionAmount,
  formatTypeLabel,
} from "../types/transactionHistoryTypes";
import TransactionStatusBadge from "./TransactionStatusBadge";

interface TransactionTableProps {
  transactions: CusTransactionHistoryItemDTO[];
  isLoading: boolean;
  hasFiltersApplied: boolean;
  onClearFilters: () => void;
}

export default function TransactionTable({
  transactions,
  isLoading,
  hasFiltersApplied,
  onClearFilters,
}: TransactionTableProps) {
  return (
    <div
      data-testid="transaction-list-container"
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      {/* 1. Loading Skeleton */}
      {isLoading && (
        <div data-testid="transaction-skeleton" className="divide-y divide-slate-100">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={`skeleton-${idx}`}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-6 p-4 sm:p-5 animate-pulse"
            >
              <div className="space-y-2 flex-1">
                {/* Description skeleton */}
                <div className="h-4 w-48 sm:w-64 rounded bg-slate-200" />
                {/* Date & Type skeleton */}
                <div className="h-3 w-40 sm:w-52 rounded bg-slate-200" />
                {/* Ref skeleton */}
                <div className="h-3 w-28 sm:w-36 rounded bg-slate-200" />
              </div>
              <div className="flex flex-col items-start sm:items-end justify-center gap-1.5 shrink-0">
                {/* Amount skeleton */}
                <div className="h-5 w-24 rounded bg-slate-200" />
                {/* Status badge skeleton */}
                <div className="h-5 w-20 rounded-full bg-slate-200" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 2. Empty States */}
      {!isLoading && transactions.length === 0 && (
        <div data-testid="transaction-empty-state" className="p-8 sm:p-14 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-3">
            <Inbox size={24} aria-hidden="true" />
          </div>
          {hasFiltersApplied ? (
            <div>
              <p className="text-sm font-semibold text-slate-800">
                No transactions found matching your criteria.
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Try modifying or clearing your filter criteria to see more transactions.
              </p>
              <button
                type="button"
                onClick={onClearFilters}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                <RotateCcw size={13} aria-hidden="true" />
                Clear Filters
              </button>
            </div>
          ) : (
            <div>
              <p className="text-sm font-semibold text-slate-800">
                No transaction history is available for this account.
              </p>
              <p className="mt-1 text-xs text-slate-500">
                When transactions occur on this account, they will appear here.
              </p>
            </div>
          )}
        </div>
      )}

      {/* 3. Populated Transaction List Cards */}
      {!isLoading && transactions.length > 0 && (
        <div className="divide-y divide-slate-100">
          {transactions.map((tx) => {
            const primaryTitle =
              tx.displayTitle && tx.displayTitle.trim().length > 0
                ? tx.displayTitle.trim()
                : tx.description && tx.description.trim().length > 0
                  ? tx.description.trim()
                  : formatTypeLabel(tx.transactionType) || "Transaction";

            const rawDate = tx.transactionDate || tx.initiatedAt;
            const displayDate = formatTransactionDateTime(rawDate);
            const displayType = formatTypeLabel(tx.transactionType);

            return (
              <div
                key={tx.transactionRef}
                data-testid="transaction-item"
                data-transaction-ref={tx.transactionRef}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-6 p-4 sm:p-5 transition hover:bg-slate-50/80"
              >
                {/* LEFT SECTION */}
                <div className="min-w-0 flex-1 space-y-1">
                  {/* Primary line: Display Title */}
                  <p className="text-sm font-semibold text-slate-900 break-words">
                    {primaryTitle}
                  </p>

                  {/* Secondary line: Date & Time • Transaction Type */}
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                    <span>{displayDate}</span>
                    <span className="text-slate-300" aria-hidden="true">
                      •
                    </span>
                    <span>{displayType}</span>
                  </div>

                  {/* Third line: Reference */}
                  <p className="text-xs text-slate-500">
                    Ref:{" "}
                    <span className="font-mono text-[11px] text-slate-600">
                      {tx.transactionRef}
                    </span>
                  </p>
                </div>

                {/* RIGHT SECTION */}
                <div className="flex flex-col items-start sm:items-end justify-center gap-1.5 shrink-0">
                  {/* Primary: Signed Amount */}
                  <div
                    data-testid="transaction-amount"
                    className="text-sm sm:text-base font-semibold tabular-nums text-slate-900"
                  >
                    {formatTransactionAmount(tx.amount, tx.currency, tx.direction)}
                  </div>

                  {/* Secondary: Status badge */}
                  <div data-testid="transaction-status">
                    <TransactionStatusBadge status={tx.status} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Export alias for naming clarity
export { TransactionTable as TransactionList };
