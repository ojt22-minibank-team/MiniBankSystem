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
  const thStyle: React.CSSProperties = {
    padding: '10px 12px',
    textAlign: 'left',
    fontSize: '11px',
    fontWeight: 700,
    color: '#ffffff',
    backgroundColor: '#1E40AF',
    borderBottom: '2px solid #1d3a7a',
    whiteSpace: 'nowrap',
  };
  const tdStyle: React.CSSProperties = {
    padding: '9px 12px',
    fontSize: '13px',
    color: '#334155',
    borderBottom: '1px solid #f1f5f9',
  };

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={String(col.key)} style={thStyle}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td
                colSpan={columns.length}
                style={{ ...tdStyle, textAlign: 'center', color: '#94a3b8', padding: '32px' }}
              >
                Loading...
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                style={{ ...tdStyle, textAlign: 'center', color: '#94a3b8', padding: '32px' }}
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                {columns.map((col) => (
                  <td key={String(col.key)} style={tdStyle}>
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

      {totalPages !== undefined && totalPages > 1 && onPageChange && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '8px',
            marginTop: '16px',
            flexWrap: 'wrap',
          }}
        >
          <button
            style={pageBtnStyle(false)}
            onClick={() => onPageChange(Math.max(1, (page ?? 1) - 1))}
            disabled={(page ?? 1) <= 1}
          >
            Prev
          </button>
          {Array.from({ length: Math.min(totalPages, 7) }, (_, idx) => {
            const pg = idx + 1;
            return (
              <button
                key={pg}
                style={pageBtnStyle(pg === page)}
                onClick={() => onPageChange(pg)}
              >
                {pg}
              </button>
            );
          })}
          {totalPages > 7 && (
            <span style={{ color: '#94a3b8', fontSize: '12px' }}>... {totalPages}</span>
          )}
          <button
            style={pageBtnStyle(false)}
            onClick={() => onPageChange(Math.min(totalPages, (page ?? 1) + 1))}
            disabled={(page ?? 1) >= totalPages}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

function pageBtnStyle(active: boolean): React.CSSProperties {
  return {
    padding: '6px 12px',
    borderRadius: '6px',
    border: `1px solid ${active ? '#1E40AF' : '#cbd5e1'}`,
    backgroundColor: active ? '#1E40AF' : '#fff',
    color: active ? '#fff' : '#334155',
    fontSize: '12px',
    fontWeight: active ? 700 : 400,
    cursor: 'pointer',
  };
}

export default DataTable;
