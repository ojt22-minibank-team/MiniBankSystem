import React from 'react';

export interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (row: T, index: number) => React.ReactNode;
}

interface DataTableProps<T extends object> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  page?: number;
  totalPages?: number;
  onPageChange?: (p: number) => void;
}

type PaginationItem = number | 'ellipsis-left' | 'ellipsis-right';

function getPaginationItems(currentPage: number, totalPages: number): PaginationItem[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  // Near the start (e.g. pages 1, 2, 3, 4)
  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, 'ellipsis-right', totalPages];
  }

  // Near the end (e.g. currentPage in [totalPages - 3, totalPages])
  if (currentPage >= totalPages - 3) {
    return [
      1,
      'ellipsis-left',
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }

  // In the middle
  return [
    1,
    'ellipsis-left',
    currentPage - 1,
    currentPage,
    currentPage + 1,
    'ellipsis-right',
    totalPages,
  ];
}

function DataTable<T extends object>({
  columns,
  data,
  loading,
  emptyMessage = 'No data found.',
  page,
  totalPages,
  onPageChange,
}: DataTableProps<T>) {
  return (
    <div className="w-full">
      {/* Horizontally scrollable table container */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 shadow-xs">
        <table className="w-full border-collapse text-left text-xs sm:text-sm">
          <thead>
            <tr className="bg-[#1E40AF] text-white">
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  className="px-3.5 py-3 text-[11px] sm:text-xs font-bold uppercase tracking-wider whitespace-nowrap text-white/95"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {loading ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-12 text-center text-xs sm:text-sm text-slate-400"
                >
                  <div className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>Loading report data...</span>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-12 text-center text-xs sm:text-sm text-slate-400"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, i) => (
                <tr
                  key={i}
                  className={`${
                    i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                  } hover:bg-blue-50/50 transition-colors`}
                >
                  {columns.map((col) => (
                    <td
                      key={String(col.key)}
                      className="px-3.5 py-2.5 sm:py-3 text-slate-700 whitespace-nowrap"
                    >
                      {col.render
                        ? col.render(row, i)
                        : String((row as Record<string, unknown>)[String(col.key)] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Responsive Pagination */}
      {totalPages !== undefined && totalPages > 1 && onPageChange && (() => {
        const currentPage = Math.max(1, Math.min(page ?? 1, totalPages));
        const paginationItems = getPaginationItems(currentPage, totalPages);

        return (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 px-1">
            <div className="text-xs text-slate-500 font-medium">
              Showing page <span className="font-semibold text-slate-800">{currentPage}</span> of{' '}
              <span className="font-semibold text-slate-800">{totalPages}</span>
            </div>

            <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap justify-center">
              {/* First Page button */}
              <button
                type="button"
                className="hidden md:inline-flex px-2 py-1.5 rounded-md border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                onClick={() => onPageChange(1)}
                disabled={currentPage <= 1}
                title="First Page"
              >
                First
              </button>

              {/* Prev Page button */}
              <button
                type="button"
                className="px-2.5 py-1.5 rounded-md border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage <= 1}
                title="Previous Page"
              >
                Prev
              </button>

              {/* Mobile simplified page indicator */}
              <span className="sm:hidden text-xs font-medium text-slate-600 px-1">
                {currentPage} / {totalPages}
              </span>

              {/* Desktop number pills */}
              <div className="hidden sm:flex items-center gap-1">
                {paginationItems.map((item, idx) => {
                  if (item === 'ellipsis-left') {
                    return (
                      <button
                        key={`ellipsis-left-${idx}`}
                        type="button"
                        title="Jump back 5 pages"
                        className="min-w-[28px] h-7 px-1.5 rounded-md text-xs font-semibold text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition-colors cursor-pointer"
                        onClick={() => onPageChange(Math.max(1, currentPage - 5))}
                      >
                        ...
                      </button>
                    );
                  }

                  if (item === 'ellipsis-right') {
                    return (
                      <button
                        key={`ellipsis-right-${idx}`}
                        type="button"
                        title="Jump forward 5 pages"
                        className="min-w-[28px] h-7 px-1.5 rounded-md text-xs font-semibold text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition-colors cursor-pointer"
                        onClick={() => onPageChange(Math.min(totalPages, currentPage + 5))}
                      >
                        ...
                      </button>
                    );
                  }

                  const isActive = item === currentPage;
                  return (
                    <button
                      key={item}
                      type="button"
                      className={`min-w-[28px] h-7 px-2 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                      onClick={() => onPageChange(item)}
                    >
                      {item}
                    </button>
                  );
                })}
              </div>

              {/* Next Page button */}
              <button
                type="button"
                className="px-2.5 py-1.5 rounded-md border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage >= totalPages}
                title="Next Page"
              >
                Next
              </button>

              {/* Last Page button */}
              <button
                type="button"
                className="hidden md:inline-flex px-2 py-1.5 rounded-md border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                onClick={() => onPageChange(totalPages)}
                disabled={currentPage >= totalPages}
                title="Last Page"
              >
                Last
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

export default DataTable;
