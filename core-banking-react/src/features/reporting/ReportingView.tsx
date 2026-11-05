import React, { useState } from 'react';
import ReportFilterBar, { type ReportTab } from './components/ReportFilterBar';
import DailyLedgerPanel from './components/DailyLedgerPanel';
import AccountStatusPanel from './components/AccountStatusPanel';
import AuditTrailPanel from './components/AuditTrailPanel';
import FeeRevenuePanel from './components/FeeRevenuePanel';
import LargeTransactionPanel from './components/LargeTransactionPanel';

const today = new Date().toISOString().slice(0, 10);
const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
const todayDt = today + 'T23:59';
const monthAgoDt = monthAgo + 'T00:00';

function tabStyle(active: boolean): React.CSSProperties {
  return {
    padding: '9px 18px',
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

  const [feeChannel, setFeeChannel] = useState('');
  const [amlThreshold, setAmlThreshold] = useState<number>(10000000);
  const [amlTransactionType, setAmlTransactionType] = useState('');

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

  const [appliedFeeChannel, setAppliedFeeChannel] = useState('');
  const [appliedAmlThreshold, setAppliedAmlThreshold] = useState<number>(10000000);
  const [appliedAmlTransactionType, setAppliedAmlTransactionType] = useState('');

  const [hasSearched, setHasSearched] = useState<Record<ReportTab, boolean>>({
    ledger: false,
    account: false,
    audit: false,
    fee: false,
    aml: false,
  });

  const [searchKeys, setSearchKeys] = useState<Record<ReportTab, number>>({
    ledger: 0,
    account: 0,
    audit: 0,
    fee: 0,
    aml: 0,
  });

  const [isSearching, setIsSearching] = useState(false);

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
    setAppliedFeeChannel(feeChannel);
    setAppliedAmlThreshold(amlThreshold);
    setAppliedAmlTransactionType(amlTransactionType);

    setHasSearched((prev) => ({ ...prev, [activeTab]: true }));
    setSearchKeys((prev) => ({ ...prev, [activeTab]: prev[activeTab] + 1 }));
  };

  const handleReset = () => {
    if (activeTab === 'ledger') {
      setStartDate(monthAgo);
      setEndDate(today);
      setLedgerStatus('');
      setLedgerTransactionType('');
      setAppliedStartDate(monthAgo);
      setAppliedEndDate(today);
      setAppliedLedgerStatus('');
      setAppliedLedgerTransactionType('');
    } else if (activeTab === 'account') {
      setStartDate(monthAgo);
      setEndDate(today);
      setAccountStatus('');
      setAppliedStartDate(monthAgo);
      setAppliedEndDate(today);
      setAppliedAccountStatus('');
    } else if (activeTab === 'audit') {
      setAuditStartDate(monthAgoDt);
      setAuditEndDate(todayDt);
      setStaffId('');
      setActionType('');
      setAccountNo('');
      setAppliedAuditStartDate(monthAgoDt);
      setAppliedAuditEndDate(todayDt);
      setAppliedStaffId('');
      setAppliedActionType('');
      setAppliedAccountNo('');
    } else if (activeTab === 'fee') {
      setStartDate(monthAgo);
      setEndDate(today);
      setFeeChannel('');
      setAppliedStartDate(monthAgo);
      setAppliedEndDate(today);
      setAppliedFeeChannel('');
    } else if (activeTab === 'aml') {
      setStartDate(monthAgo);
      setEndDate(today);
      setAmlThreshold(10000000);
      setAmlTransactionType('');
      setAppliedStartDate(monthAgo);
      setAppliedEndDate(today);
      setAppliedAmlThreshold(10000000);
      setAppliedAmlTransactionType('');
    }

    setHasSearched((prev) => ({ ...prev, [activeTab]: false }));
    setSearchKeys((prev) => ({ ...prev, [activeTab]: 0 }));
    setIsSearching(false);
  };

  const tabInfo: Record<ReportTab, { title: string; description: string }> = {
    ledger: {
      title: 'Ready to Generate Daily Ledger Summary',
      description:
        'Select your date range and filters above, then click the "Search" button to view transaction volumes and ledger summaries.',
    },
    account: {
      title: 'Ready to Generate Account Status Report',
      description:
        'Select your date range and status filters above, then click the "Search" button to inspect account statuses and balance brackets.',
    },
    audit: {
      title: 'Ready to View Audit Trail Logs',
      description:
        'Specify your desired time window, staff ID, or account number above, then click the "Search" button to retrieve audit logs.',
    },
    fee: {
      title: 'Ready to Generate Fee & Revenue Report',
      description:
        'Select your date range and channel filters above, then click the "Search" button to analyze collected fees and non-interest income.',
    },
    aml: {
      title: 'Ready to Generate Large Transaction & AML Report',
      description:
        'Define the threshold amount and transaction filters above, then click the "Search" button to flag high-value AML compliance records.',
    },
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
        <button
          style={tabStyle(activeTab === 'fee')}
          onClick={() => setActiveTab('fee')}
        >
          Fee & Revenue Breakdown
        </button>
        <button
          style={tabStyle(activeTab === 'aml')}
          onClick={() => setActiveTab('aml')}
        >
          Large Transactions (AML)
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
        feeChannel={feeChannel}
        onFeeChannelChange={setFeeChannel}
        amlThreshold={amlThreshold}
        onAmlThresholdChange={setAmlThreshold}
        amlTransactionType={amlTransactionType}
        onAmlTransactionTypeChange={setAmlTransactionType}
        onSearch={handleSearch}
        onReset={handleReset}
        loading={isSearching}
      />

      {hasSearched.ledger && (
        <div style={{ display: activeTab === 'ledger' ? 'block' : 'none' }}>
          <DailyLedgerPanel
            startDate={appliedStartDate}
            endDate={appliedEndDate}
            ledgerStatus={appliedLedgerStatus}
            transactionType={appliedLedgerTransactionType}
            searchKey={searchKeys.ledger}
            onLoadingChange={(l) => {
              if (activeTab === 'ledger') setIsSearching(l);
            }}
          />
        </div>
      )}

      {hasSearched.account && (
        <div style={{ display: activeTab === 'account' ? 'block' : 'none' }}>
          <AccountStatusPanel
            startDate={appliedStartDate}
            endDate={appliedEndDate}
            accountStatus={appliedAccountStatus}
            searchKey={searchKeys.account}
            onLoadingChange={(l) => {
              if (activeTab === 'account') setIsSearching(l);
            }}
          />
        </div>
      )}

      {hasSearched.audit && (
        <div style={{ display: activeTab === 'audit' ? 'block' : 'none' }}>
          <AuditTrailPanel
            staffId={appliedStaffId}
            actionType={appliedActionType}
            auditStartDate={appliedAuditStartDate}
            auditEndDate={appliedAuditEndDate}
            accountNo={appliedAccountNo}
            searchKey={searchKeys.audit}
            onLoadingChange={(l) => {
              if (activeTab === 'audit') setIsSearching(l);
            }}
          />
        </div>
      )}

      {hasSearched.fee && (
        <div style={{ display: activeTab === 'fee' ? 'block' : 'none' }}>
          <FeeRevenuePanel
            startDate={appliedStartDate}
            endDate={appliedEndDate}
            channel={appliedFeeChannel}
            searchKey={searchKeys.fee}
            onLoadingChange={(l) => {
              if (activeTab === 'fee') setIsSearching(l);
            }}
          />
        </div>
      )}

      {hasSearched.aml && (
        <div style={{ display: activeTab === 'aml' ? 'block' : 'none' }}>
          <LargeTransactionPanel
            startDate={appliedStartDate}
            endDate={appliedEndDate}
            threshold={appliedAmlThreshold}
            transactionType={appliedAmlTransactionType}
            searchKey={searchKeys.aml}
            onLoadingChange={(l) => {
              if (activeTab === 'aml') setIsSearching(l);
            }}
          />
        </div>
      )}

      {!hasSearched[activeTab] && (
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            border: '1px dashed #cbd5e1',
            padding: '56px 24px',
            textAlign: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              backgroundColor: '#eff6ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              fontSize: '22px',
            }}
          >
            🔍
          </div>
          <h3
            style={{
              fontSize: '15px',
              fontWeight: 700,
              color: '#1e293b',
              margin: '0 0 8px 0',
            }}
          >
            {tabInfo[activeTab].title}
          </h3>
          <p
            style={{
              fontSize: '13px',
              color: '#64748b',
              maxWidth: '460px',
              margin: '0 auto 20px',
              lineHeight: '1.5',
            }}
          >
            {tabInfo[activeTab].description}
          </p>
          <button
            type="button"
            onClick={handleSearch}
            disabled={isSearching}
            style={{
              padding: '9px 24px',
              backgroundColor: '#2563EB',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '13px',
              cursor: isSearching ? 'not-allowed' : 'pointer',
              opacity: isSearching ? 0.7 : 1,
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            }}
          >
            {isSearching ? 'Searching...' : 'Search Report'}
          </button>
        </div>
      )}
    </div>
  );
};

export default ReportingView;
