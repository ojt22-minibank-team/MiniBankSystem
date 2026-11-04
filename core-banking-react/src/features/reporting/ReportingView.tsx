import React, { useState } from 'react';
import ReportFilterBar, { type ReportTab } from './components/ReportFilterBar';
import DailyLedgerPanel from './components/DailyLedgerPanel';
import AccountStatusPanel from './components/AccountStatusPanel';
import AuditTrailPanel from './components/AuditTrailPanel';
import FeeRevenuePanel from './components/FeeRevenuePanel';
import LargeTransactionPanel from './components/LargeTransactionPanel';
import TransactionDetailPanel from './components/TransactionDetailPanel';

const today = new Date().toISOString().slice(0, 10);
const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
const todayDt = today + 'T23:59';
const monthAgoDt = monthAgo + 'T00:00';

const tabs: { key: ReportTab; label: string }[] = [
  { key: 'ledger', label: 'Daily Ledger Summary' },
  { key: 'account', label: 'Account Status' },
  { key: 'audit', label: 'Audit Trail Logs' },
  { key: 'fee', label: 'Fee & Revenue Breakdown' },
  { key: 'aml', label: 'Large Transactions (AML)' },
  { key: 'transactionDetail', label: 'Transaction Detail' },
];

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
    transactionDetail: false,
  });

  const [searchKeys, setSearchKeys] = useState<Record<ReportTab, number>>({
    ledger: 0,
    account: 0,
    audit: 0,
    fee: 0,
    aml: 0,
    transactionDetail: 0,
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
    } else if (activeTab === 'transactionDetail') {
      setStartDate(monthAgo);
      setEndDate(today);
      setLedgerStatus('');
      setLedgerTransactionType('');
      setFeeChannel('');
      setAppliedStartDate(monthAgo);
      setAppliedEndDate(today);
      setAppliedLedgerStatus('');
      setAppliedLedgerTransactionType('');
      setAppliedFeeChannel('');
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
    transactionDetail: {
      title: 'Ready to Generate Transaction Detail Report',
      description:
        'Select your date range, status, type, and channel filters above, then click the "Search" button to inspect individual transaction ledger records.',
    },
  };

  return (
    <div className="w-full max-w-full overflow-hidden">
      {/* Page Header */}
      <div className="mb-4 sm:mb-5">
        <h2 className="text-lg sm:text-xl font-bold text-blue-900 tracking-tight flex items-center gap-2">
          Reporting & Analytics
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Staff Operations Portal — Group 2 Reporting Subsystem
        </p>
      </div>

      {/* Responsive Horizontal Tab Bar */}
      <div className="flex gap-1.5 sm:gap-2 mb-5 overflow-x-auto pb-2 scrollbar-thin no-scrollbar sm:flex-wrap">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Filter Bar */}
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

      {/* Tab Panels */}
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

      {hasSearched.transactionDetail && (
        <div style={{ display: activeTab === 'transactionDetail' ? 'block' : 'none' }}>
          <TransactionDetailPanel
            startDate={appliedStartDate}
            endDate={appliedEndDate}
            status={appliedLedgerStatus}
            transactionType={appliedLedgerTransactionType}
            channel={appliedFeeChannel}
            searchKey={searchKeys.transactionDetail}
            onLoadingChange={(l) => {
              if (activeTab === 'transactionDetail') setIsSearching(l);
            }}
          />
        </div>
      )}

      {/* Empty Search Prompt */}
      {!hasSearched[activeTab] && (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-8 sm:p-14 text-center shadow-xs">
          <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4 text-xl">
            🔍
          </div>
          <h3 className="text-sm sm:text-base font-bold text-slate-800 mb-2">
            {tabInfo[activeTab].title}
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mb-5 leading-relaxed">
            {tabInfo[activeTab].description}
          </p>
          <button
            type="button"
            onClick={handleSearch}
            disabled={isSearching}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-xs sm:text-sm shadow-xs transition-colors cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSearching ? 'Searching...' : 'Search Report'}
          </button>
        </div>
      )}
    </div>
  );
};

export default ReportingView;
