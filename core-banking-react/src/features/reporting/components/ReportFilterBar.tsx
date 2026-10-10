import React from 'react';

export type ReportTab = 'ledger' | 'account' | 'audit';

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
  onAuditStartDateChange: (v: string) => void;
  auditEndDate: string;
  onAuditEndDateChange: (v: string) => void;
  onSearch: () => void;
  onReset: () => void;
  loading?: boolean;
}

const inputStyle: React.CSSProperties = {
  padding: '8px 10px',
  borderRadius: '6px',
  border: '1px solid #cbd5e1',
  fontSize: '13px',
  outline: 'none',
  minWidth: '140px',
  flex: '1',
  color: '#334155',
  backgroundColor: '#fff',
};

const labelStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 600,
  color: '#475569',
  marginBottom: '4px',
  display: 'block',
  textTransform: 'uppercase',
  letterSpacing: '0.3px',
};

const fieldWrap: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  minWidth: '130px',
  flex: '1',
};

const LEDGER_STATUSES = ['', 'COMPLETED', 'PENDING', 'FAILED', 'REVERSED'];
const LEDGER_TRANSACTION_TYPES = [
  '',
  'INTERNAL_TRANSFER',
  'OTC_DEPOSIT',
  'OTC_WITHDRAWAL',
  'EXTERNAL_PAYMENT',
  'LEDGER_ADJUSTMENT',
  'REFUND',
  'TRANSFER',
  'MERCHANT_CHECKOUT',
];
const ACCOUNT_STATUSES = ['', 'ACTIVE', 'FROZEN', 'SUSPENDED', 'CLOSED'];
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
    onSearch,
    onReset,
    loading,
  } = props;

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '10px',
        border: '1px solid #e2e8f0',
        padding: '20px 24px',
        marginBottom: '20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      <div
        style={{
          fontSize: '13px',
          fontWeight: 700,
          color: '#1E40AF',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        Filter & Search
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'flex-end' }}>
        {(activeTab === 'ledger' || activeTab === 'account') && (
          <>
            <div style={fieldWrap}>
              <label style={labelStyle}>Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => onStartDateChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                style={inputStyle}
              />
            </div>
            <div style={fieldWrap}>
              <label style={labelStyle}>End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => onEndDateChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                style={inputStyle}
              />
            </div>
          </>
        )}

        {activeTab === 'ledger' && (
          <>
            <div style={fieldWrap}>
              <label style={labelStyle}>Transaction Type</label>
              <select
                value={ledgerTransactionType}
                onChange={(e) => onLedgerTransactionTypeChange?.(e.target.value)}
                style={inputStyle}
              >
                {LEDGER_TRANSACTION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t || 'All Types'}
                  </option>
                ))}
              </select>
            </div>
            <div style={fieldWrap}>
              <label style={labelStyle}>Transaction Status</label>
              <select
                value={ledgerStatus}
                onChange={(e) => onLedgerStatusChange(e.target.value)}
                style={inputStyle}
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
          <div style={fieldWrap}>
            <label style={labelStyle}>Account Status</label>
            <select
              value={accountStatus}
              onChange={(e) => onAccountStatusChange(e.target.value)}
              style={inputStyle}
            >
              {ACCOUNT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s || 'All Statuses'}
                </option>
              ))}
            </select>
          </div>
        )}

        {activeTab === 'audit' && (
          <>
            <div style={fieldWrap}>
              <label style={labelStyle}>Start DateTime</label>
              <input
                type="datetime-local"
                value={auditStartDate}
                onChange={(e) => onAuditStartDateChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                style={inputStyle}
              />
            </div>
            <div style={fieldWrap}>
              <label style={labelStyle}>End DateTime</label>
              <input
                type="datetime-local"
                value={auditEndDate}
                onChange={(e) => onAuditEndDateChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                style={inputStyle}
              />
            </div>
            <div style={fieldWrap}>
              <label style={labelStyle}>Staff ID</label>
              <input
                type="text"
                placeholder="e.g. staff-uuid"
                value={staffId}
                onChange={(e) => onStaffIdChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                style={inputStyle}
              />
            </div>
            <div style={fieldWrap}>
              <label style={labelStyle}>Action Type</label>
              <select
                value={actionType}
                onChange={(e) => onActionTypeChange(e.target.value)}
                style={inputStyle}
              >
                {ACTION_TYPES.map((a) => (
                  <option key={a} value={a}>
                    {a || 'All Actions'}
                  </option>
                ))}
              </select>
            </div>
            <div style={fieldWrap}>
              <label style={labelStyle}>Account No.</label>
              <input
                type="text"
                placeholder="e.g. ACC-001"
                value={accountNo}
                onChange={(e) => onAccountNoChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                style={inputStyle}
              />
            </div>
          </>
        )}

        <div style={{ display: 'flex', gap: '8px', alignSelf: 'flex-end', paddingBottom: '0' }}>
          <button
            type="button"
            onClick={onSearch}
            disabled={loading}
            style={{
              padding: '8px 20px',
              backgroundColor: '#2563EB',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 700,
              fontSize: '13px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Loading...' : 'Search'}
          </button>
          <button
            type="button"
            onClick={onReset}
            disabled={loading}
            style={{
              padding: '8px 16px',
              backgroundColor: '#f1f5f9',
              color: '#334155',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportFilterBar;
