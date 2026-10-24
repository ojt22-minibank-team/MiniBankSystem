import { ChevronLeft, ChevronRight } from "lucide-react";

interface TransactionPaginationProps {
  page: number; // 0-indexed
  size: number;
  totalPages: number;
  totalElements: number;
  hasNext: boolean;
  hasPrevious: boolean;
  onPageChange: (newPage: number) => void;
  onSizeChange: (newSize: number) => void;
  disabled?: boolean;
}

export default function TransactionPagination({
  page,
  size,
  totalPages,
  totalElements,
  hasNext,
  hasPrevious,
  onPageChange,
  onSizeChange,
  disabled = false,
}: TransactionPaginationProps) {
  if (totalElements === 0) {
    return null;
  }

  const startItem = page * size + 1;
  const endItem = Math.min((page + 1) * size, totalElements);
  const displayTotalPages = Math.max(totalPages, 1);
  const currentPageNumber = page + 1;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-t border-slate-200 bg-white px-4 py-3.5 sm:px-6">
      {/* Total summary and page size selector */}
      <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-slate-600">
        <span>
          Showing{" "}
          <span className="font-semibold text-slate-900">{startItem}</span> to{" "}
          <span className="font-semibold text-slate-900">{endItem}</span> of{" "}
          <span className="font-semibold text-slate-900">{totalElements}</span>{" "}
          transactions
        </span>

        <div className="flex items-center gap-2">
          <label htmlFor="pageSizeSelect" className="text-xs text-slate-500">
            Per page:
          </label>
          <select
            id="pageSizeSelect"
            value={size}
            disabled={disabled}
            onChange={(e) => onSizeChange(Number(e.target.value))}
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm transition hover:border-slate-400 focus:border-[#0878E8] focus:outline-none focus:ring-1 focus:ring-[#0878E8] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

      {/* Navigation controls */}
      <div className="flex items-center justify-between sm:justify-end gap-2">
        <span className="text-xs sm:text-sm font-medium text-slate-600 mr-2">
          Page {currentPageNumber} of {displayTotalPages}
        </span>

        <div className="inline-flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={!hasPrevious || disabled}
            aria-label="Previous page"
            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0878E8] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft size={16} aria-hidden="true" />
            <span className="hidden sm:inline">Previous</span>
          </button>

          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={!hasNext || disabled}
            aria-label="Next page"
            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0878E8] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
