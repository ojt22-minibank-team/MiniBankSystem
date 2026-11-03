import React, { useState, useRef } from 'react';
import {
  Search,
  RotateCcw,
  SlidersHorizontal,
  ChevronDown,
} from 'lucide-react';
import type { StaffTransactionSearchParams } from '../../../types/transactions.types';

export type TimeRangePreset = 'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'CUSTOM';

export const getTodayDateRange = () => {
  const pad = (n: number) => String(n).padStart(2, '0');
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  const now = new Date();
  const s = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const e = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  return { startDate: fmt(s), endDate: fmt(e) };
};

interface Props {
  onFilterChange: (params: StaffTransactionSearchParams) => void;
  isLoading: boolean;
}

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'HELD', label: 'Held (AML/Review)' },
  { value: 'PENDING_AUTHORIZATION', label: 'Pending Auth' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'REVERSED', label: 'Reversed' },
];

const TYPE_OPTIONS = [
  { value: 'ALL', label: 'All Types' },
  { value: 'INTERNAL_TRANSFER', label: 'Internal Transfer' },
  { value: 'OTC_DEPOSIT', label: 'OTC Deposit' },
  { value: 'OTC_WITHDRAWAL', label: 'OTC Withdrawal' },
  { value: 'EXTERNAL_PAYMENT', label: 'External Payment' },
  { value: 'LEDGER_ADJUSTMENT', label: 'Ledger Adjustment' },
  { value: 'REFUND', label: 'Refund' },
];

const CHANNEL_OPTIONS = [
  { value: 'ALL', label: 'All Channels' },
  { value: 'WEB', label: 'Customer Web Portal' },
  { value: 'MOBILE', label: 'Mobile App' },
  { value: 'STAFF_PORTAL', label: 'Staff Portal' },
  { value: 'BRANCH', label: 'Branch OTC Counter' },
  { value: 'ATM', label: 'ATM Network' },
  { value: 'API', label: 'Payment Gateway (API)' },
];

export default React.memo(function TransactionFilterBar({
  onFilterChange,
  isLoading,
}: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [status, setStatus] = useState('ALL');
  const [type, setType] = useState('ALL');
  const [channel, setChannel] = useState('ALL');
  const [timePreset, setTimePreset] = useState<TimeRangePreset>('TODAY');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Debounced search timer ref
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Compute ISO date range based on preset
  const computeDateRange = (preset: TimeRangePreset, start: string, end: string) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

    const now = new Date();
    switch (preset) {
      case 'TODAY': {
        const s = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        const e = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        return { startDate: fmt(s), endDate: fmt(e) };
      }
      case 'YESTERDAY': {
        const y = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        const s = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 0, 0, 0);
        const e = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 23, 59, 59);
        return { startDate: fmt(s), endDate: fmt(e) };
      }
      case 'LAST_7_DAYS': {
        const s = new Date(now.getTime() - 7 * 86400000);
        return { startDate: fmt(s), endDate: fmt(now) };
      }
      case 'LAST_30_DAYS': {
        const s = new Date(now.getTime() - 30 * 86400000);
        return { startDate: fmt(s), endDate: fmt(now) };
      }
      case 'CUSTOM': {
        return {
          startDate: start ? `${start}T00:00:00` : undefined,
          endDate: end ? `${end}T23:59:59` : undefined,
        };
      }
      default:
        return getTodayDateRange();
    }
  };

  const emitFilterChange = (overrides?: Partial<{
    search: string;
    status: string;
    type: string;
    channel: string;
    timePreset: TimeRangePreset;
    customStart: string;
    customEnd: string;
    minAmount: string;
    maxAmount: string;
  }>) => {
    const effectiveSearch = overrides?.search !== undefined ? overrides.search : searchTerm;
    const effectiveStatus = overrides?.status !== undefined ? overrides.status : status;
    const effectiveType = overrides?.type !== undefined ? overrides.type : type;
    const effectiveChannel = overrides?.channel !== undefined ? overrides.channel : channel;
    const effectivePreset = overrides?.timePreset !== undefined ? overrides.timePreset : timePreset;
    const effectiveStart = overrides?.customStart !== undefined ? overrides.customStart : customStart;
    const effectiveEnd = overrides?.customEnd !== undefined ? overrides.customEnd : customEnd;
    const effectiveMin = overrides?.minAmount !== undefined ? overrides.minAmount : minAmount;
    const effectiveMax = overrides?.maxAmount !== undefined ? overrides.maxAmount : maxAmount;

    const { startDate, endDate } = computeDateRange(effectivePreset, effectiveStart, effectiveEnd);

    onFilterChange({
      search: effectiveSearch.trim() || undefined,
      status: effectiveStatus !== 'ALL' ? effectiveStatus : undefined,
      transactionType: effectiveType !== 'ALL' ? effectiveType : undefined,
      channel: effectiveChannel !== 'ALL' ? effectiveChannel : undefined,
      startDate,
      endDate,
      minAmount: effectiveMin ? Number(effectiveMin) : undefined,
      maxAmount: effectiveMax ? Number(effectiveMax) : undefined,
    });
  };

  // Debounced search handler
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchTerm(val);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      emitFilterChange({ search: val });
    }, 350);
  };

  const handleReset = () => {
    setSearchTerm('');
    setStatus('ALL');
    setType('ALL');
    setChannel('ALL');
    setTimePreset('TODAY');
    setCustomStart('');
    setCustomEnd('');
    setMinAmount('');
    setMaxAmount('');
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    const { startDate, endDate } = getTodayDateRange();
    onFilterChange({
      startDate,
      endDate,
    });
  };

  const hasActiveFilters =
    searchTerm.trim() !== '' ||
    status !== 'ALL' ||
    type !== 'ALL' ||
    channel !== 'ALL' ||
    timePreset !== 'TODAY' ||
    customStart !== '' ||
    customEnd !== '' ||
    minAmount !== '' ||
    maxAmount !== '';

  return (
    <div className="bg-white/80 liquid-glass rounded-2xl border border-slate-200/70 p-4 mb-6 shadow-xs backdrop-blur-md">
      {/* Top Filter Row: Search & Core Selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
        {/* Search Input */}
        <div className="lg:col-span-4 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search Reference, Account No, Customer Name..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-white/90 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 placeholder-slate-400 font-medium transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm('');
                emitFilterChange({ search: '' });
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs px-1 cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* Status Dropdown */}
        <div className="lg:col-span-2">
          <div className="relative">
            <select
              value={status}
              onChange={(e) => {
                const val = e.target.value;
                setStatus(val);
                emitFilterChange({ status: val });
              }}
              className="w-full appearance-none pl-3 pr-8 py-2 text-xs rounded-xl border border-slate-200 bg-white/90 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-700 font-medium cursor-pointer transition-all"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Transaction Type Dropdown */}
        <div className="lg:col-span-2">
          <div className="relative">
            <select
              value={type}
              onChange={(e) => {
                const val = e.target.value;
                setType(val);
                emitFilterChange({ type: val });
              }}
              className="w-full appearance-none pl-3 pr-8 py-2 text-xs rounded-xl border border-slate-200 bg-white/90 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-700 font-medium cursor-pointer transition-all"
            >
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Time Presets Dropdown */}
        <div className="lg:col-span-2">
          <div className="relative">
            <select
              value={timePreset}
              onChange={(e) => {
                const val = e.target.value as TimeRangePreset;
                setTimePreset(val);
                if (val === 'CUSTOM') {
                  setShowAdvanced(true);
                }
                emitFilterChange({ timePreset: val });
              }}
              className="w-full appearance-none pl-3 pr-8 py-2 text-xs rounded-xl border border-slate-200 bg-white/90 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-700 font-medium cursor-pointer transition-all"
            >
              <option value="TODAY">Today</option>
              <option value="YESTERDAY">Yesterday</option>
              <option value="LAST_7_DAYS">Last 7 Days</option>
              <option value="LAST_30_DAYS">Last 30 Days</option>
              <option value="CUSTOM">Custom Range...</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Actions: Advanced Toggle & Reset */}
        <div className="lg:col-span-2 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
              showAdvanced || channel !== 'ALL' || minAmount || maxAmount
                ? 'bg-blue-50 border-blue-200 text-blue-600'
                : 'bg-white/80 border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>More</span>
          </button>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleReset}
              disabled={isLoading}
              title="Reset all filters"
              className="flex items-center gap-1 px-2.5 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Advanced Filter Row (Expandable) */}
      {showAdvanced && (
        <div className="mt-3.5 pt-3.5 border-t border-slate-200/60 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-fadeIn">
          {/* Channel Dropdown */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Transaction Channel
            </label>
            <div className="relative">
              <select
                value={channel}
                onChange={(e) => {
                  const val = e.target.value;
                  setChannel(val);
                  emitFilterChange({ channel: val });
                }}
                className="w-full appearance-none pl-3 pr-8 py-2 text-xs rounded-xl border border-slate-200 bg-white/90 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
              >
                {CHANNEL_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Custom Date Range Pickers */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              From Date
            </label>
            <input
              type="date"
              value={customStart}
              onChange={(e) => {
                const val = e.target.value;
                setCustomStart(val);
                setTimePreset('CUSTOM');
                emitFilterChange({ timePreset: 'CUSTOM', customStart: val });
              }}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white/90 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              To Date
            </label>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => {
                const val = e.target.value;
                setCustomEnd(val);
                setTimePreset('CUSTOM');
                emitFilterChange({ timePreset: 'CUSTOM', customEnd: val });
              }}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white/90 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* Min & Max Amount */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Amount Range (MMK)
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                placeholder="Min"
                value={minAmount}
                onChange={(e) => {
                  const val = e.target.value;
                  setMinAmount(val);
                  emitFilterChange({ minAmount: val });
                }}
                className="w-1/2 px-2.5 py-2 text-xs rounded-xl border border-slate-200 bg-white/90 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              <span className="text-slate-400 text-xs">-</span>
              <input
                type="number"
                placeholder="Max"
                value={maxAmount}
                onChange={(e) => {
                  const val = e.target.value;
                  setMaxAmount(val);
                  emitFilterChange({ maxAmount: val });
                }}
                className="w-1/2 px-2.5 py-2 text-xs rounded-xl border border-slate-200 bg-white/90 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
