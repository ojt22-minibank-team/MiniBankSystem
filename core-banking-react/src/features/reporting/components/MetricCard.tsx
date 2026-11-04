import React from 'react';

interface MetricCardProps {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  icon?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  sub,
  color = '#1E40AF',
  icon,
}) => {
  const displayVal = String(value);
  const isLongVal = displayVal.length > 14;

  return (
    <div
      className="relative flex flex-col justify-between rounded-xl bg-white p-4 sm:p-5 border border-slate-200/90 shadow-xs hover:shadow-md transition-all duration-200 min-w-0 overflow-hidden"
      style={{ borderLeft: `4px solid ${color}` }}
    >
      <div className="flex items-center gap-2 mb-2 min-w-0">
        {icon && (
          <span className="text-base sm:text-lg shrink-0 select-none" aria-hidden="true">
            {icon}
          </span>
        )}
        <span
          className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider truncate"
          title={label}
        >
          {label}
        </span>
      </div>

      <div
        className={`font-bold tracking-tight text-slate-900 truncate ${
          isLongVal
            ? 'text-lg sm:text-xl xl:text-2xl'
            : 'text-xl sm:text-2xl xl:text-[26px]'
        }`}
        style={{ color }}
        title={displayVal}
      >
        {value}
      </div>

      {sub && (
        <div
          className="text-[11px] text-slate-400 mt-1 font-medium truncate"
          title={sub}
        >
          {sub}
        </div>
      )}
    </div>
  );
};

export default MetricCard;
