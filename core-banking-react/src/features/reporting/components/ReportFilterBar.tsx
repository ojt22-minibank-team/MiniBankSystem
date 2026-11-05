import React from 'react';

export type ReportTab = 'ledger' | 'account' | 'audit' | 'fee' | 'aml' | 'transactionDetail';

interface ReportFilterBarProps {
  activeTab: ReportTab;
  startDate: string;
  endDate: string;
  onStartDateChange: (v: string) => void;
  onEndDateChange: (v: string) => void;
  ledgerStatus: string;
  onLedgerStatusChange: (v: string) => void;
  ledgerTransactionType?: string;
  onLedgerTransactionTypeChange?: (v: string) => void;
  accountStatus: string;
  onAccountStatusChange: (v: string) => void;
  staffId: string;
  onStaffIdChange: (v: string) => void;
  actionType: string;
  onActionTypeChange: (v: string) => void;
  accountNo: string;
  onAccountNoChange: (v: string) => void;
  auditStartDate: string;
  auditEndDate: string;
  onAuditStartDateChange: (v: string) => void;
  onAuditEndDateChange: (v: string) => void;
  feeChannel?: string;
  onFeeChannelChange?: (v: string) => void;
  amlThreshold?: number;
  onAmlThresholdChange?: (v: number) => void;
  amlTransactionType?: string;
  onAmlTransactionTypeChange?: (v: string) => void;
  onSearch: () => void;
  onReset: () => void;
  loading?: boolean;
}

const LEDGER_STATUSES = ['', 'COMPLETED', 'PENDING', 'FAILED', 'REVERSED'];
const LEDGER_TRANSACTION_TYPES = [
  '',
  'INTERNAL_TRANSFER',
  'OTC_DEPOSIT',
  'OTC_WITHDRAWAL',
  'EXTERNAL_PAYMENT',
  'REFUND',
];
const ACCOUNT_STATUSES = ['', 'ACTIVE', 'FROZEN', 'SUSPENDED', 'CLOSED'];
const CHANNELS = ['', 'CUSTOMER_PORTAL', 'STAFF_PORTAL', 'PAYMENT_GATEWAY', 'SYSTEM'];
const ACTION_TYPES = [
  '',
  'LOGIN',
  'LOGOUT',
  'CREATE_ACCOUNT',
  'UPDATE_ACCOUNT',
  'FREEZE_ACCOUNT',
  'UNFREEZE_ACCOUNT',
  'SUSPEND_ACCOUNT',
  'CREATE_CUSTOMER',
  'UPDATE_CUSTOMER',
  'DELETE_CUSTOMER',
  'APPROVE_KYC',
  'REJECT_KYC',
  'TRANSFER',
  'OTC_DEPOSIT',
];

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm text-slate-800 shadow-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors';
const labelClass =
  'block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1 truncate';

const ReportFilterBar: React.FC<ReportFilterBarProps> = (props) => {
  const {
    activeTab,
    startDate,
    endDate,
    onStartDateChange,
    onEndDateChange,
    ledgerStatus,
    onLedgerStatusChange,
    ledgerTransactionType = '',
    onLedgerTransactionTypeChange,
    accountStatus,
    onAccountStatusChange,
    staffId,
    onStaffIdChange,
    actionType,
    onActionTypeChange,
    accountNo,
    onAccountNoChange,
    auditStartDate,
    auditEndDate,
    onAuditStartDateChange,
    onAuditEndDateChange,
    feeChannel = '',
    onFeeChannelChange,
    amlThreshold = 10000000,
    onAmlThresholdChange,
    amlTransactionType = '',
    onAmlTransactionTypeChange,
    onSearch,
    onReset,
    loading,
  } = props;

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 mb-5 shadow-xs">
      <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-blue-900 mb-3 sm:mb-4">
        <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        <span>Filter & Search</span>
      </div>

      <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4 items-end">
        {activeTab !== 'audit' && (
          <>
            <div className="min-w-0">
              <label className={labelClass}>Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => onStartDateChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                className={inputClass}
              />
            </div>
            <div className="min-w-0">
              <label className={labelClass}>End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => onEndDateChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                className={inputClass}
              />
            </div>
          </>
        )}

        {activeTab === 'ledger' && (
          <>
            <div className="min-w-0">
              <label className={labelClass}>Transaction Type</label>
              <select
                value={ledgerTransactionType}
                onChange={(e) => onLedgerTransactionTypeChange?.(e.target.value)}
                className={inputClass}
              >
                {LEDGER_TRANSACTION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t || 'All Types'}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-0">
              <label className={labelClass}>Transaction Status</label>
              <select
                value={ledgerStatus}
                onChange={(e) => onLedgerStatusChange(e.target.value)}
                className={inputClass}
              >
                {LEDGER_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s || 'All Statuses'}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        {activeTab === 'account' && (
          <div className="min-w-0">
            <label className={labelClass}>Account Status</label>
            <select
              value={accountStatus}
              onChange={(e) => onAccountStatusChange(e.target.value)}
              className={inputClass}
            >
              {ACCOUNT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s || 'All Statuses'}
                </option>
              ))}
            </select>
          </div>
        )}

        {activeTab === 'fee' && (
          <div className="min-w-0">
            <label className={labelClass}>Channel</label>
            <select
              value={feeChannel}
              onChange={(e) => onFeeChannelChange?.(e.target.value)}
              className={inputClass}
            >
              {CHANNELS.map((c) => (
                <option key={c} value={c}>
                  {c || 'All Channels'}
                </option>
              ))}
            </select>
          </div>
        )}

        {activeTab === 'aml' && (
          <>
            <div className="min-w-0">
              <label className={labelClass}>Min Threshold (MMK)</label>
              <input
                type="number"
                value={amlThreshold || ''}
                onChange={(e) => onAmlThresholdChange?.(Number(e.target.value))}
                onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                className={inputClass}
                placeholder="10000000"
              />
            </div>
            <div className="min-w-0">
              <label className={labelClass}>Transaction Type</label>
              <select
                value={amlTransactionType}
                onChange={(e) => onAmlTransactionTypeChange?.(e.target.value)}
                className={inputClass}
              >
                {LEDGER_TRANSACTION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t || 'All Types'}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        {activeTab === 'transactionDetail' && (
          <>
            <div className="min-w-0">
              <label className={labelClass}>Transaction Type</label>
              <select
                value={ledgerTransactionType}
                onChange={(e) => onLedgerTransactionTypeChange?.(e.target.value)}
                className={inputClass}
              >
                {LEDGER_TRANSACTION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t || 'All Types'}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-0">
              <label className={labelClass}>Transaction Status</label>
              <select
                value={ledgerStatus}
                onChange={(e) => onLedgerStatusChange(e.target.value)}
                className={inputClass}
              >
                {LEDGER_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s || 'All Statuses'}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-0">
              <label className={labelClass}>Channel</label>
              <select
                value={feeChannel}
                onChange={(e) => onFeeChannelChange?.(e.target.value)}
                className={inputClass}
              >
                {CHANNELS.map((c) => (
                  <option key={c} value={c}>
                    {c || 'All Channels'}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        {activeTab === 'audit' && (
          <>
            <div className="min-w-0">
              <label className={labelClass}>Start DateTime</label>
              <input
                type="datetime-local"
                value={auditStartDate}
                onChange={(e) => onAuditStartDateChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                className={inputClass}
              />
            </div>
            <div className="min-w-0">
              <label className={labelClass}>End DateTime</label>
              <input
                type="datetime-local"
                value={auditEndDate}
                onChange={(e) => onAuditEndDateChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                className={inputClass}
              />
            </div>
            <div className="min-w-0">
              <label className={labelClass}>Staff ID</label>
              <input
                type="text"
                placeholder="e.g. staff-uuid"
                value={staffId}
                onChange={(e) => onStaffIdChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                className={inputClass}
              />
            </div>
            <div className="min-w-0">
              <label className={labelClass}>Action Type</label>
              <select
                value={actionType}
                onChange={(e) => onActionTypeChange(e.target.value)}
                className={inputClass}
              >
                {ACTION_TYPES.map((a) => (
                  <option key={a} value={a}>
                    {a || 'All Actions'}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-0">
              <label className={labelClass}>Account No.</label>
              <input
                type="text"
                placeholder="e.g. ACC-001"
                value={accountNo}
                onChange={(e) => onAccountNoChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                className={inputClass}
              />
            </div>
          </>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-1 sm:pt-0 min-w-0 w-full">
          <button
            type="button"
            onClick={onSearch}
            disabled={loading}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Searching...</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span>Search</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onReset}
            disabled={loading}
            className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 text-xs sm:text-sm font-semibold transition-colors cursor-pointer disabled:opacity-60"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportFilterBar;
