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
      {totalPages !== undefined && totalPages > 1 && onPageChange && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 px-1">
          <div className="text-xs text-slate-500 font-medium">
            Showing page <span className="font-semibold text-slate-800">{page ?? 1}</span> of{' '}
            <span className="font-semibold text-slate-800">{totalPages}</span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap justify-center">
            <button
              type="button"
              className="px-2.5 py-1.5 rounded-md border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              onClick={() => onPageChange(Math.max(1, (page ?? 1) - 1))}
              disabled={(page ?? 1) <= 1}
            >
              Prev
            </button>

            {/* Mobile simplified page indicator vs desktop number pills */}
            <div className="hidden sm:flex items-center gap-1">
              {Array.from({ length: Math.min(totalPages, 7) }, (_, idx) => {
                const pg = idx + 1;
                const isActive = pg === page;
                return (
                  <button
                    key={pg}
                    type="button"
                    className={`min-w-[28px] h-7 px-2 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                    onClick={() => onPageChange(pg)}
                  >
                    {pg}
                  </button>
                );
              })}
              {totalPages > 7 && (
                <span className="px-1 text-slate-400 text-xs font-medium select-none">
                  ... {totalPages}
                </span>
              )}
            </div>

            <button
              type="button"
              className="px-2.5 py-1.5 rounded-md border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              onClick={() => onPageChange(Math.min(totalPages, (page ?? 1) + 1))}
              disabled={(page ?? 1) >= totalPages}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataTable;
