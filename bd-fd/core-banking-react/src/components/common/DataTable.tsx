import { type ReactNode } from 'react';

interface Column {
  key: string;
  header: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  render?: (row: any) => ReactNode;
  className?: string;
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
  emptyMessage = 'No data available.',
  keyExtractor,
}: DataTableProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <svg
            className="h-8 w-8 animate-spin text-blue-600"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm">Loading data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={[
                  'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600',
                  col.className ?? '',
                ].join(' ')}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-100 bg-white">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center text-sm text-gray-400">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr key={keyExtractor(row)} className="hover:bg-gray-50 transition-colors">
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={['px-4 py-3 text-sm text-gray-700', col.className ?? ''].join(' ')}
                  >
                    {col.render
                      ? col.render(row)
                      : String(row[col.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
