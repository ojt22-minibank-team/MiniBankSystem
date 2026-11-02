import type { AuditLogItem } from '../../../types/audit.types';

interface AuditStatsCardsProps {
  logs: AuditLogItem[];
  totalCount: number;
}

export default function AuditStatsCards({ logs, totalCount }: AuditStatsCardsProps) {
  const staffCount = logs.filter((l) => l.actorType === 'STAFF').length;
  const customerCount = logs.filter((l) => l.actorType === 'CUSTOMER').length;
  const securityCount = logs.filter(
    (l) =>
      l.actionCategory === 'SECURITY' ||
      l.actionType?.includes('LOGIN') ||
      l.actionType?.includes('ROLE') ||
      l.actionType?.includes('OTP')
  ).length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {/* Total Events */}
      <div className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] flex flex-col justify-between min-h-[145px]">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Records</span>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50 text-sky-600 border border-sky-100 shadow-xs">
            <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        </div>
        <div className="mt-3">
          <span className="text-2xl sm:text-[28px] font-bold text-slate-900 font-mono tabular-nums">
            {totalCount.toLocaleString()}
          </span>
          <p className="text-[11px] text-slate-400 mt-0.5 font-medium">Immutable audit trail</p>
        </div>
      </div>

      {/* Staff Actions */}
      <div className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] flex flex-col justify-between min-h-[145px]">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Staff / Admin</span>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50 text-sky-600 border border-sky-100 shadow-xs">
            <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
        </div>
        <div className="mt-3">
          <span className="text-2xl sm:text-[28px] font-bold text-slate-900 font-mono tabular-nums">
            {staffCount.toLocaleString()}
          </span>
          <p className="text-[11px] text-slate-400 mt-0.5 font-medium">Internal authorizations</p>
        </div>
      </div>

      {/* Customer Actions */}
      <div className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] flex flex-col justify-between min-h-[145px]">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer</span>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50 text-sky-600 border border-sky-100 shadow-xs">
            <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
        </div>
        <div className="mt-3">
          <span className="text-2xl sm:text-[28px] font-bold text-slate-900 font-mono tabular-nums">
            {customerCount.toLocaleString()}
          </span>
          <p className="text-[11px] text-slate-400 mt-0.5 font-medium">Digital banking sessions</p>
        </div>
      </div>

      {/* Security Actions */}
      <div className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] flex flex-col justify-between min-h-[145px]">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Security Events</span>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600 border border-amber-100 shadow-xs">
            <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        </div>
        <div className="mt-3">
          <span className="text-2xl sm:text-[28px] font-bold text-slate-900 font-mono tabular-nums">
            {securityCount.toLocaleString()}
          </span>
          <p className="text-[11px] text-slate-400 mt-0.5 font-medium">Privileged audit events</p>
        </div>
      </div>
    </div>
  );
}
