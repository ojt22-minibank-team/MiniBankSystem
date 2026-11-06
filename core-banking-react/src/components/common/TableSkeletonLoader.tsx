
interface TableSkeletonLoaderProps {
  columns?: number;
  rows?: number;
  showHeader?: boolean;
}

export default function TableSkeletonLoader({
  columns = 6,
  rows = 8,
  showHeader = true,
}: TableSkeletonLoaderProps) {
  return (
    <div className="overflow-hidden rounded-2xl liquid-glass border border-slate-200/80 bg-white/70 shadow-xs animate-pulse">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
          {showHeader && (
            <thead className="bg-slate-50/80">
              <tr>
                {Array.from({ length: columns }).map((_, i) => (
                  <th key={`skeleton-th-${i}`} className="px-5 py-3.5">
                    <div className="h-3.5 bg-slate-200/90 rounded-md w-20" />
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody className="divide-y divide-slate-100 bg-white">
            {Array.from({ length: rows }).map((_, rIdx) => (
              <tr key={`skeleton-row-${rIdx}`} className="transition-colors">
                {Array.from({ length: columns }).map((_, cIdx) => (
                  <td key={`skeleton-cell-${rIdx}-${cIdx}`} className="px-5 py-4">
                    {cIdx === 0 ? (
                      <div className="h-3.5 bg-slate-200 rounded-md w-24 font-mono" />
                    ) : cIdx === 1 ? (
                      <div className="space-y-1.5">
                        <div className="h-3.5 bg-slate-200/90 rounded-md w-36" />
                        <div className="h-2.5 bg-slate-100 rounded-md w-24" />
                      </div>
                    ) : cIdx === columns - 1 ? (
                      <div className="flex justify-center gap-1.5">
                        <div className="h-6 bg-slate-200/80 rounded-lg w-16" />
                        <div className="h-6 bg-slate-200/80 rounded-lg w-14" />
                      </div>
                    ) : (
                      <div
                        className="h-3 bg-slate-200/70 rounded-md"
                        style={{
                          width: `${Math.max(40, (70 - (cIdx * 12) + (rIdx % 3) * 10))}%`,
                        }}
                      />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
