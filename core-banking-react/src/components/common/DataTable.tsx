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
      <div className="flex items-center justify-center py-20 liquid-glass rounded-2xl">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <div className="relative">
            <div className="h-10 w-10 rounded-full border-2 border-sky-500/20 border-t-sky-600 animate-spin" />
            <div className="absolute inset-0 rounded-full bg-sky-400/20 blur-md animate-pulse" />
          </div>
          <span className="text-xs font-bold text-slate-600">Retrieving core banking records...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl liquid-glass">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100/80 text-left text-xs">
          <thead className="bg-white/50 backdrop-blur-md">
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

          <tbody className="divide-y divide-slate-100/60 bg-white/40">
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-5 py-14 text-center text-xs text-slate-400 font-medium">
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-10 w-10 rounded-2xl bg-slate-100/80 flex items-center justify-center text-slate-400">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                    </div>
                    <span>{emptyMessage}</span>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr
                  key={keyExtractor(row)}
                  className="hover:bg-white/80 transition-colors duration-150"
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
                      ? 'text-right'
                      : 'text-left';

                    return (
                      <td
                        key={col.key}
                        className={[
                          'px-5 py-3.5 text-xs text-slate-700 whitespace-nowrap',
                          alignClass,
                          col.className ?? '',
                        ].join(' ')}
                      >
                        {col.render ? col.render(row) : (row[col.key] ?? '—')}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
