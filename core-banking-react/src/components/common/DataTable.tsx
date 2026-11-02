import { type ReactNode } from 'react';

interface Column {
  key: string;
  header: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  render?: (row: any) => ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right';
}

interface DataTableProps {
  columns: Column[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[];
  isLoading?: boolean;
  emptyMessage?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  keyExtractor: (row: any) => string;
}

export default function DataTable({
  columns,
  data,
  isLoading = false,
  emptyMessage = 'No data available in this ledger scope.',
  keyExtractor,
}: DataTableProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <svg
            className="h-8 w-8 animate-spin text-[#0284C7]"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-xs font-semibold text-slate-600">Retrieving banking records...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
        <thead className="bg-slate-50/80">
          <tr>
            {columns.map((col) => {
              const isAmount =
                col.header.toLowerCase().includes('amount') ||
                col.header.toLowerCase().includes('balance') ||
                col.header.toLowerCase().includes('total') ||
                col.header.toLowerCase().includes('fee') ||
                col.align === 'right';

              const isStatus =
                col.header.toLowerCase().includes('status') ||
                col.align === 'center';

              const alignClass = isStatus
                ? 'text-center'
                : isAmount
                ? 'text-right'
                : 'text-left';

              return (
                <th
                  key={col.key}
                  scope="col"
                  className={[
                    'px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-600',
                    alignClass,
                    col.className ?? '',
                  ].join(' ')}
                >
                  {col.header}
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-5 py-12 text-center text-xs text-slate-400 font-medium">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr
                key={keyExtractor(row)}
                className="hover:bg-slate-50/70 transition-colors duration-150"
              >
                {columns.map((col) => {
                  const isAmount =
                    col.header.toLowerCase().includes('amount') ||
                    col.header.toLowerCase().includes('balance') ||
                    col.header.toLowerCase().includes('total') ||
                    col.header.toLowerCase().includes('fee') ||
                    col.align === 'right';

                  const isStatus =
                    col.header.toLowerCase().includes('status') ||
                    col.align === 'center';

                  const alignClass = isStatus
                    ? 'text-center'
                    : isAmount
                    ? 'text-right font-mono font-semibold tabular-nums'
                    : 'text-left';

                  return (
                    <td
                      key={col.key}
                      className={[
                        'px-5 py-3.5 text-xs text-slate-700',
                        alignClass,
                        col.className ?? '',
                      ].join(' ')}
                    >
                      {col.render
                        ? col.render(row)
                        : String(row[col.key] ?? '—')}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
