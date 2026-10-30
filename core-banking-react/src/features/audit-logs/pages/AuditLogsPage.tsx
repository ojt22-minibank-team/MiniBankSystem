import { useState, useEffect, useCallback, useMemo } from 'react';
import AdminLayout from '../../../components/layout/AdminLayout';
import { auditApi } from '../../../services/auditService';
import type { AuditLogItem, AuditSearchParams } from '../../../types/audit.types';
import AuditLogDetailModal from '../components/AuditLogDetailModal';
import AuditStatsCards from '../components/AuditStatsCards';

type TimeRangePreset = 'ALL' | 'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'CUSTOM';
type ScopeTab = 'ALL' | 'STAFF' | 'CUSTOMER' | 'SYSTEM';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(20);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Inspector modal
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  // Filter States
  const [scopeTab, setScopeTab] = useState<ScopeTab>('ALL');
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [actorType, setActorType] = useState<string>('');
  const [actionCategory, setActionCategory] = useState<string>('');
  const [actionType, setActionType] = useState<string>('');
  const [timePreset, setTimePreset] = useState<TimeRangePreset>('ALL');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  // Calculate Date ranges based on preset
  const dateRange = useMemo(() => {
    const now = new Date();
    const formatLocalDateTime = (d: Date) => {
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    };

    switch (timePreset) {
      case 'TODAY': {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        return {
          startDate: formatLocalDateTime(start),
          endDate: formatLocalDateTime(end),
        };
      }
      case 'YESTERDAY': {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0);
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59);
        return {
          startDate: formatLocalDateTime(start),
          endDate: formatLocalDateTime(end),
        };
      }
      case 'LAST_7_DAYS': {
        const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return {
          startDate: formatLocalDateTime(start),
          endDate: formatLocalDateTime(now),
        };
      }
      case 'LAST_30_DAYS': {
        const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return {
          startDate: formatLocalDateTime(start),
          endDate: formatLocalDateTime(now),
        };
      }
      case 'CUSTOM': {
        return {
          startDate: customStartDate ? `${customStartDate}T00:00:00` : undefined,
          endDate: customEndDate ? `${customEndDate}T23:59:59` : undefined,
        };
      }
      case 'ALL':
      default:
        return { startDate: undefined, endDate: undefined };
    }
  }, [timePreset, customStartDate, customEndDate]);

  // Fetch Audit Logs from backend
  const fetchLogs = useCallback(
    async (pageToLoad: number = 0) => {
      setIsLoading(true);
      setError(null);
      try {
        const effectiveActorType =
          scopeTab !== 'ALL' ? scopeTab : actorType || undefined;

        const params: AuditSearchParams = {
          page: pageToLoad,
          size: pageSize,
          sort: 'createdAt,desc',
          actorType: effectiveActorType,
          actionCategory: actionCategory || undefined,
          actionType: actionType || undefined,
          staffUsername: searchKeyword.trim() || undefined,
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        };

        const response = await auditApi.search(params);
        setLogs(response.content || []);
        setTotalCount(response.totalElements || 0);
        setTotalPages(response.totalPages || 1);
        setCurrentPage(response.number || 0);
      } catch (err: any) {
        console.error('Failed to load audit logs:', err);
        setError(
          err?.response?.data?.message ||
            err?.message ||
            'Unable to fetch audit logs. Please try again.'
        );
      } finally {
        setIsLoading(false);
      }
    },
    [
      pageSize,
      scopeTab,
      actorType,
      actionCategory,
      actionType,
      searchKeyword,
      dateRange,
    ]
  );

  useEffect(() => {
    fetchLogs(0);
  }, [fetchLogs]);

  const handleScopeTabChange = (tab: ScopeTab) => {
    setScopeTab(tab);
    if (tab !== 'ALL') {
      setActorType(tab);
    } else {
      setActorType('');
    }
  };

  const handleResetFilters = () => {
    setScopeTab('ALL');
    setSearchKeyword('');
    setActorType('');
    setActionCategory('');
    setActionType('');
    setTimePreset('ALL');
    setCustomStartDate('');
    setCustomEndDate('');
  };

  const handleExportCSV = () => {
    if (logs.length === 0) return;

    const headers = [
      'Audit ID',
      'Timestamp',
      'Actor Type',
      'Actor Identifier',
      'Action Category',
      'Action Type',
      'Entity Type',
      'Entity ID',
      'Description',
      'IP Address',
    ];

    const rows = logs.map((log) => [
      log.auditId,
      log.createdAt ? new Date(log.createdAt).toISOString() : '',
      log.actorType,
      log.actorStaffUsername || log.actorCustomerId || log.actorStaffId || log.actorType,
      log.actionCategory || '',
      log.actionType,
      log.entityType || '',
      log.entityId || '',
      `"${(log.description || '').replace(/"/g, '""')}"`,
      log.ipAddress || '',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Ekaraj_Audit_Logs_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AdminLayout pageTitle="Audit Logs">
      <div className="max-w-[1440px] mx-auto space-y-6">

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
          <div>
            <h2 className="text-2xl sm:text-[28px] font-bold text-slate-900 tracking-tight">
              Audit Logs &amp; Security Trail
            </h2>
            <p className="mt-0.5 text-xs sm:text-sm text-slate-500 font-medium">
              EKARAJ BANK Core Banking Telemetry: Tamper-evident administrative activities and compliance logs
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => fetchLogs(currentPage)}
              disabled={isLoading}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs transition-colors disabled:opacity-50"
            >
              <svg className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Refresh</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              disabled={logs.length === 0}
              className="flex items-center gap-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold px-4 py-2 text-xs shadow-sm transition-colors disabled:opacity-50"
            >
              <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Stats Metrics Cards */}
        <AuditStatsCards logs={logs} totalCount={totalCount} />

        {/* Primary Controls Card */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] space-y-4">
          {/* Scope Tabs & Time Presets */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200/60 flex-wrap gap-1">
              <button
                type="button"
                onClick={() => handleScopeTabChange('ALL')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  scopeTab === 'ALL'
                    ? 'bg-white text-sky-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Activities
              </button>
              <button
                type="button"
                onClick={() => handleScopeTabChange('STAFF')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  scopeTab === 'STAFF'
                    ? 'bg-white text-sky-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-sky-500" />
                <span>Admin &amp; Staff</span>
              </button>
              <button
                type="button"
                onClick={() => handleScopeTabChange('CUSTOMER')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  scopeTab === 'CUSTOMER'
                    ? 'bg-white text-sky-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-indigo-500" />
                <span>Customer Portal</span>
              </button>
              <button
                type="button"
                onClick={() => handleScopeTabChange('SYSTEM')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  scopeTab === 'SYSTEM'
                    ? 'bg-white text-sky-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>System Automated</span>
              </button>
            </div>

            {/* Time Presets */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mr-1">Time:</span>
              {(['ALL', 'TODAY', 'YESTERDAY', 'LAST_7_DAYS', 'LAST_30_DAYS', 'CUSTOM'] as TimeRangePreset[]).map(
                (preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setTimePreset(preset)}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-all ${
                      timePreset === preset
                        ? 'border-sky-500 bg-sky-50 text-sky-600 shadow-xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {preset === 'ALL'
                      ? 'All Time'
                      : preset === 'TODAY'
                      ? 'Today'
                      : preset === 'YESTERDAY'
                      ? 'Yesterday'
                      : preset === 'LAST_7_DAYS'
                      ? '7 Days'
                      : preset === 'LAST_30_DAYS'
                      ? '30 Days'
                      : 'Custom'}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Custom Date Pickers */}
          {timePreset === 'CUSTOM' && (
            <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-slate-700">Start Date:</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-slate-700">End Date:</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                />
              </div>
            </div>
          )}

          {/* Search & Detailed Filters Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
            {/* Search Input */}
            <div className="lg:col-span-5 relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Search by username, staff # or keyword..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 transition-all placeholder:text-slate-400"
              />
            </div>

            {/* Actor Type Dropdown */}
            <div className="lg:col-span-2">
              <select
                value={actorType}
                onChange={(e) => setActorType(e.target.value)}
                disabled={scopeTab !== 'ALL'}
                className="w-full py-2 px-3.5 text-xs rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 disabled:opacity-60"
              >
                <option value="">All Actor Types</option>
                <option value="STAFF">STAFF</option>
                <option value="CUSTOMER">CUSTOMER</option>
                <option value="SYSTEM">SYSTEM</option>
                <option value="CORPORATE_USER">CORPORATE</option>
                <option value="GUEST">GUEST</option>
              </select>
            </div>

            {/* Category Dropdown */}
            <div className="lg:col-span-2">
              <select
                value={actionCategory}
                onChange={(e) => setActionCategory(e.target.value)}
                className="w-full py-2 px-3.5 text-xs rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400"
              >
                <option value="">All Categories</option>
                <option value="SECURITY">SECURITY</option>
                <option value="GENERAL">GENERAL</option>
                <option value="ACCOUNT">ACCOUNT</option>
                <option value="TRANSACTION">TRANSACTION</option>
                <option value="SYSTEM">SYSTEM</option>
              </select>
            </div>

            {/* Action Type Input */}
            <div className="lg:col-span-2">
              <input
                type="text"
                placeholder="Action type (e.g. LOGIN)"
                value={actionType}
                onChange={(e) => setActionType(e.target.value)}
                className="w-full py-2 px-3.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 placeholder:text-slate-400"
              />
            </div>

            {/* Reset Button */}
            <div className="lg:col-span-1 flex justify-end">
              <button
                type="button"
                onClick={handleResetFilters}
                title="Clear all filters"
                className="w-full py-2 px-3 text-xs font-semibold rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors text-center"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center justify-between">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => fetchLogs(currentPage)}
              className="font-bold underline ml-2"
            >
              Retry
            </button>
          </div>
        )}

        {/* Audit Logs Table */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4 w-16">ID</th>
                  <th className="py-3.5 px-4">Timestamp</th>
                  <th className="py-3.5 px-4">Actor</th>
                  <th className="py-3.5 px-4">Action &amp; Domain</th>
                  <th className="py-3.5 px-4">Target Entity</th>
                  <th className="py-3.5 px-4">Description</th>
                  <th className="py-3.5 px-4">Client IP</th>
                  <th className="py-3.5 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="py-4 px-4"><div className="h-3 bg-slate-100 rounded w-8" /></td>
                      <td className="py-4 px-4"><div className="h-3 bg-slate-100 rounded w-24" /></td>
                      <td className="py-4 px-4"><div className="h-3 bg-slate-100 rounded w-20" /></td>
                      <td className="py-4 px-4"><div className="h-3 bg-slate-100 rounded w-28" /></td>
                      <td className="py-4 px-4"><div className="h-3 bg-slate-100 rounded w-20" /></td>
                      <td className="py-4 px-4"><div className="h-3 bg-slate-100 rounded w-36" /></td>
                      <td className="py-4 px-4"><div className="h-3 bg-slate-100 rounded w-16" /></td>
                      <td className="py-4 px-4 text-right"><div className="h-6 bg-slate-100 rounded w-14 ml-auto" /></td>
                    </tr>
                  ))
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 mb-1">
                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <p className="text-sm font-bold text-slate-700">No audit log entries found</p>
                        <p className="text-xs text-slate-400 max-w-sm font-medium">
                          Try adjusting your filters, actor type, or date range to inspect historical events.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr
                      key={log.auditId}
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                      onClick={() => setSelectedLog(log)}
                    >
                      {/* ID */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 text-[11px]">
                        #{log.auditId}
                      </td>

                      {/* Timestamp */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-900">
                          {log.createdAt ? new Date(log.createdAt).toLocaleDateString() : '-'}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {log.createdAt ? new Date(log.createdAt).toLocaleTimeString() : ''}
                        </div>
                      </td>

                      {/* Actor */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                              log.actorType === 'STAFF'
                                ? 'bg-sky-50 text-sky-700 border-sky-200'
                                : log.actorType === 'CUSTOMER'
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}
                          >
                            {log.actorType}
                          </span>
                          <span className="font-semibold text-slate-800">
                            {log.actorStaffUsername ||
                              (log.actorCustomerId ? `Cus: ${log.actorCustomerId.slice(0, 8)}...` : '-')}
                          </span>
                        </div>
                      </td>

                      {/* Action & Category */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{log.actionType}</div>
                        {log.actionCategory && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200/60 mt-0.5">
                            {log.actionCategory}
                          </span>
                        )}
                      </td>

                      {/* Target Entity */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-mono text-slate-700 text-[11px] font-semibold">
                          {log.entityType || '-'}
                        </span>
                        {log.entityId && (
                          <div className="text-[10px] text-slate-400 truncate max-w-[120px] font-mono">
                            {log.entityId}
                          </div>
                        )}
                      </td>

                      {/* Description */}
                      <td className="py-3 px-4 max-w-xs truncate text-slate-600 text-xs font-medium">
                        {log.description || '-'}
                      </td>

                      {/* IP */}
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {log.ipAddress || '-'}
                      </td>

                      {/* Details button */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLog(log);
                          }}
                          className="px-3 py-1 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-sky-50 hover:text-sky-600 hover:border-sky-200 transition-all shadow-xs"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50/50 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span className="font-medium">Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(0);
                }}
                className="py-1 px-2.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-slate-300">|</span>
              <span className="font-medium">
                Showing {logs.length > 0 ? currentPage * pageSize + 1 : 0} to{' '}
                {Math.min((currentPage + 1) * pageSize, totalCount)} of {totalCount} logs
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fetchLogs(currentPage - 1)}
                disabled={currentPage === 0 || isLoading}
                className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-slate-700 transition-colors shadow-xs"
              >
                Previous
              </button>
              <span className="font-semibold text-slate-700">
                Page {currentPage + 1} of {Math.max(totalPages, 1)}
              </span>
              <button
                type="button"
                onClick={() => fetchLogs(currentPage + 1)}
                disabled={currentPage + 1 >= totalPages || isLoading}
                className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-slate-700 transition-colors shadow-xs"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {/* Inspector Modal */}
        <AuditLogDetailModal
          log={selectedLog}
          onClose={() => setSelectedLog(null)}
        />
      </div>
    </AdminLayout>
  );
}
