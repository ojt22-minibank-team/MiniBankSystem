import React, { useState } from 'react';
import ReportFilterBar, { type ReportTab } from './components/ReportFilterBar';
import DailyLedgerPanel from './components/DailyLedgerPanel';
import AccountStatusPanel from './components/AccountStatusPanel';
import AuditTrailPanel from './components/AuditTrailPanel';

const today = new Date().toISOString().slice(0, 10);
const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
const todayDt = today + 'T23:59';
const monthAgoDt = monthAgo + 'T00:00';

function tabStyle(active: boolean): React.CSSProperties {
  return {
    padding: '9px 20px',
    borderRadius: '8px',
    border: 'none',
    fontSize: '13px',
    fontWeight: active ? 700 : 500,
    cursor: 'pointer',
    backgroundColor: active ? '#2563EB' : '#f1f5f9',
    color: active ? '#ffffff' : '#475569',
    transition: 'all 0.15s',
  };
}

const ReportingView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ReportTab>('ledger');

  // Input filter states (edited in the filter bar)
  const [startDate, setStartDate] = useState(monthAgo);
  const [endDate, setEndDate] = useState(today);
  const [ledgerStatus, setLedgerStatus] = useState('');
  const [ledgerTransactionType, setLedgerTransactionType] = useState('');
  const [accountStatus, setAccountStatus] = useState('');

  const [auditStartDate, setAuditStartDate] = useState(monthAgoDt);
  const [auditEndDate, setAuditEndDate] = useState(todayDt);
  const [staffId, setStaffId] = useState('');
  const [actionType, setActionType] = useState('');
  const [accountNo, setAccountNo] = useState('');

  // Applied filter states (applied on Search / Reset)
  const [appliedStartDate, setAppliedStartDate] = useState(monthAgo);
  const [appliedEndDate, setAppliedEndDate] = useState(today);
  const [appliedLedgerStatus, setAppliedLedgerStatus] = useState('');
  const [appliedLedgerTransactionType, setAppliedLedgerTransactionType] = useState('');
  const [appliedAccountStatus, setAppliedAccountStatus] = useState('');

  const [appliedAuditStartDate, setAppliedAuditStartDate] = useState(monthAgoDt);
  const [appliedAuditEndDate, setAppliedAuditEndDate] = useState(todayDt);
  const [appliedStaffId, setAppliedStaffId] = useState('');
  const [appliedActionType, setAppliedActionType] = useState('');
  const [appliedAccountNo, setAppliedAccountNo] = useState('');

  const [searchKey, setSearchKey] = useState(0);

  const handleSearch = () => {
    setAppliedStartDate(startDate);
    setAppliedEndDate(endDate);
    setAppliedLedgerStatus(ledgerStatus);
    setAppliedLedgerTransactionType(ledgerTransactionType);
    setAppliedAccountStatus(accountStatus);
    setAppliedAuditStartDate(auditStartDate);
    setAppliedAuditEndDate(auditEndDate);
    setAppliedStaffId(staffId);
    setAppliedActionType(actionType);
    setAppliedAccountNo(accountNo);
    setSearchKey((k) => k + 1);
  };

  const handleReset = () => {
    setStartDate(monthAgo);
    setEndDate(today);
    setLedgerStatus('');
    setLedgerTransactionType('');
    setAccountStatus('');
    setAuditStartDate(monthAgoDt);
    setAuditEndDate(todayDt);
    setStaffId('');
    setActionType('');
    setAccountNo('');

    setAppliedStartDate(monthAgo);
    setAppliedEndDate(today);
    setAppliedLedgerStatus('');
    setAppliedLedgerTransactionType('');
    setAppliedAccountStatus('');
    setAppliedAuditStartDate(monthAgoDt);
    setAppliedAuditEndDate(todayDt);
    setAppliedStaffId('');
    setAppliedActionType('');
    setAppliedAccountNo('');
    setSearchKey((k) => k + 1);
  };

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h2
          style={{
            fontSize: '18px',
            fontWeight: 700,
            color: '#1E40AF',
            margin: '0 0 4px 0',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          Reporting & Analytics
        </h2>
        <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
          Staff Operations Portal — Group 2 Reporting Subsystem
        </p>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button
          style={tabStyle(activeTab === 'ledger')}
          onClick={() => setActiveTab('ledger')}
        >
          Daily Ledger Summary
        </button>
        <button
          style={tabStyle(activeTab === 'account')}
          onClick={() => setActiveTab('account')}
        >
          Account Status
        </button>
        <button
          style={tabStyle(activeTab === 'audit')}
          onClick={() => setActiveTab('audit')}
        >
          Audit Trail Logs
        </button>
      </div>

      <ReportFilterBar
        activeTab={activeTab}
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        ledgerStatus={ledgerStatus}
        onLedgerStatusChange={setLedgerStatus}
        ledgerTransactionType={ledgerTransactionType}
        onLedgerTransactionTypeChange={setLedgerTransactionType}
        accountStatus={accountStatus}
        onAccountStatusChange={setAccountStatus}
        staffId={staffId}
        onStaffIdChange={setStaffId}
        actionType={actionType}
        onActionTypeChange={setActionType}
        accountNo={accountNo}
        onAccountNoChange={setAccountNo}
        auditStartDate={auditStartDate}
        onAuditStartDateChange={setAuditStartDate}
        auditEndDate={auditEndDate}
        onAuditEndDateChange={setAuditEndDate}
        onSearch={handleSearch}
        onReset={handleReset}
      />

      {activeTab === 'ledger' && (
        <DailyLedgerPanel
          startDate={appliedStartDate}
          endDate={appliedEndDate}
          ledgerStatus={appliedLedgerStatus}
          transactionType={appliedLedgerTransactionType}
          searchKey={searchKey}
        />
      )}
      {activeTab === 'account' && (
        <AccountStatusPanel
          startDate={appliedStartDate}
          endDate={appliedEndDate}
          accountStatus={appliedAccountStatus}
          searchKey={searchKey}
        />
      )}
      {activeTab === 'audit' && (
        <AuditTrailPanel
          staffId={appliedStaffId}
          actionType={appliedActionType}
          auditStartDate={appliedAuditStartDate}
          auditEndDate={appliedAuditEndDate}
          accountNo={appliedAccountNo}
          searchKey={searchKey}
        />
      )}
    </div>
  );
};

export default ReportingView;
