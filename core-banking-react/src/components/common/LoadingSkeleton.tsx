import React from 'react';

export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({
  rows = 5,
  columns = 6,
}) => {
  return (
    <div className="animate-pulse space-y-3 p-4">
      {/* Header row */}
      <div className="flex gap-4 border-b border-slate-200 pb-3">
        {Array.from({ length: columns }).map((_, i) => (
          <div key={`head-${i}`} className="h-4 bg-slate-200 rounded flex-1" />
        ))}
      </div>
      {/* Data rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div key={`row-${r}`} className="flex gap-4 py-2.5 border-b border-slate-100">
          {Array.from({ length: columns }).map((_, c) => (
            <div
              key={`cell-${r}-${c}`}
              className="h-4 bg-slate-100 rounded flex-1"
              style={{ width: `${Math.max(40, 90 - (c * 10))}%` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

export const CardSkeleton: React.FC = () => {
  return (
    <div className="animate-pulse bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
      <div className="space-y-2 flex-1">
        <div className="h-3.5 bg-slate-200 rounded w-1/3" />
        <div className="h-7 bg-slate-200 rounded w-1/2" />
      </div>
      <div className="w-12 h-12 bg-slate-100 rounded-xl" />
    </div>
  );
};
