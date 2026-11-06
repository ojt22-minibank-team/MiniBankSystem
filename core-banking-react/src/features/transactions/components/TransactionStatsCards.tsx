import React from 'react';
import type { StaffTransactionStats } from '../../../types/transactions.types';
import { formatCurrency } from '../../../utils/formatCurrency';
import {
  Activity,
  CheckCircle2,
  XCircle,
  Coins,
  AlertTriangle,
} from 'lucide-react';

interface Props {
  stats: StaffTransactionStats | null;
  isLoading: boolean;
  onFilterStatus?: (status: string) => void;
}

export default React.memo(function TransactionStatsCards({ stats, isLoading, onFilterStatus }: Props) {
  if (isLoading || !stats) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 mb-6">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="p-4 rounded-2xl liquid-glass animate-pulse border border-slate-200/50 bg-white/40 h-24 flex flex-col justify-between"
          >
            <div className="h-4 w-20 bg-slate-200 rounded-md" />
            <div className="h-6 w-24 bg-slate-300 rounded-md" />
          </div>
        ))}
      </div>
    );
  }

  const cards = [
    {
      label: 'Total Transactions',
      value: stats.totalCount.toLocaleString(),
      icon: Activity,
      textColor: 'text-slate-800',
      badgeBg: 'bg-blue-50 text-blue-600 border border-blue-200/60',
      status: 'ALL',
    },
    {
      label: 'Completed',
      value: stats.completedCount.toLocaleString(),
      icon: CheckCircle2,
      textColor: 'text-emerald-700',
      badgeBg: 'bg-emerald-50 text-emerald-600 border border-emerald-200/60',
      status: 'COMPLETED',
    },
    {
      label: 'Held & In Review',
      value: stats.heldOrPendingCount.toLocaleString(),
      icon: AlertTriangle,
      textColor: 'text-amber-700',
      badgeBg: 'bg-amber-50 text-amber-600 border border-amber-200/60',
      status: 'HELD',
    },
    {
      label: 'Failed / Rejected',
      value: stats.failedCount.toLocaleString(),
      icon: XCircle,
      textColor: 'text-rose-700',
      badgeBg: 'bg-rose-50 text-rose-600 border border-rose-200/60',
      status: 'FAILED',
    },
    {
      label: 'Settled Volume',
      value: formatCurrency(stats.totalCompletedVolume, 'MMK'),
      icon: Coins,
      textColor: 'text-indigo-800',
      badgeBg: 'bg-indigo-50 text-indigo-600 border border-indigo-200/60',
      status: undefined,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 mb-6">
      {cards.map((c) => {
        const Icon = c.icon;
        const isClickable = Boolean(onFilterStatus && c.status);
        return (
          <div
            key={c.label}
            onClick={() => {
              if (onFilterStatus && c.status) {
                onFilterStatus(c.status);
              }
            }}
            className={`p-4 rounded-2xl liquid-glass border border-slate-200/60 bg-white/70 shadow-xs hover:shadow-md transition-all flex flex-col justify-between ${
              isClickable ? 'cursor-pointer hover:border-blue-300' : ''
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">
                {c.label}
              </span>
              <div className={`p-1.5 rounded-lg ${c.badgeBg}`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className={`text-xl font-bold tracking-tight ${c.textColor} truncate`}>
              {c.value}
            </div>
          </div>
        );
      })}
    </div>
  );
});
