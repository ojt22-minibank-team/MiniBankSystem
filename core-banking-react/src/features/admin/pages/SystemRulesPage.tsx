import { useEffect, useState, useMemo } from 'react';
import AdminLayout from '../../../components/layout/AdminLayout';
import DataTable from '../../../components/common/DataTable';
import ParameterCreateModal from '../components/ParameterCreateModal';
import ParameterEditModal from '../components/ParameterEditModal';
import FeeScheduleCreateModal from '../components/FeeScheduleCreateModal';
import FeeScheduleEditModal from '../components/FeeScheduleEditModal';
import ConfirmModal from '../components/ConfirmModal';
import { systemRulesApi } from '../../../services/apiClient';
import type {
  SystemParameterResponse,
  FeeScheduleResponse,
} from '../../../types/api.types';
import { formatDateTime } from '../../../utils/formatDate';
import type { AxiosError } from 'axios';

type ActiveTab = 'parameters' | 'fees';

export default function SystemRulesPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('parameters');

  // Data states
  const [parameters, setParameters] = useState<SystemParameterResponse[]>([]);
  const [feeSchedules, setFeeSchedules] = useState<FeeScheduleResponse[]>([]);
  const [isLoadingParams, setIsLoadingParams] = useState(true);
  const [isLoadingFees, setIsLoadingFees] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Search & filters
  const [paramSearch, setParamSearch] = useState('');
  const [feeSearch, setFeeSearch] = useState('');
  const [feeStatusFilter, setFeeStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Parameter modals
  const [isCreateParamOpen, setIsCreateParamOpen] = useState(false);
  const [selectedParam, setSelectedParam] = useState<SystemParameterResponse | null>(null);
  const [isEditParamOpen, setIsEditParamOpen] = useState(false);

  // Fee schedule modals
  const [isCreateFeeOpen, setIsCreateFeeOpen] = useState(false);
  const [selectedFee, setSelectedFee] = useState<FeeScheduleResponse | null>(null);
  const [isEditFeeOpen, setIsEditFeeOpen] = useState(false);
  const [isDeactivateFeeOpen, setIsDeactivateFeeOpen] = useState(false);
  const [isActivateFeeOpen, setIsActivateFeeOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch Parameters
  const loadParameters = async () => {
    setIsLoadingParams(true);
    setError(null);
    try {
      const res = await systemRulesApi.getAllParameters();
      setParameters(res.data);
    } catch (err) {
      const axErr = err as AxiosError<{ message?: string }>;
      if (axErr.response?.status === 403) {
        setError('Access denied. Administrator privileges required to manage system rules.');
      } else {
        setError('Failed to load system parameters.');
      }
    } finally {
      setIsLoadingParams(false);
    }
  };

  // Fetch Fees
  const loadFees = async () => {
    setIsLoadingFees(true);
    setError(null);
    try {
      const res = await systemRulesApi.getAllFees();
      setFeeSchedules(res.data);
    } catch (err) {
      const axErr = err as AxiosError<{ message?: string }>;
      if (axErr.response?.status === 403) {
        setError('Access denied. Administrator privileges required to manage fee rules.');
      } else {
        setError('Failed to load fee schedules.');
      }
    } finally {
      setIsLoadingFees(false);
    }
  };

  useEffect(() => {
    loadParameters();
    loadFees();
  }, []);

  const handleShowSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => {
      setSuccessMessage(null);
    }, 4000);
  };

  // Filtered Parameters
  const filteredParameters = useMemo(() => {
    return parameters.filter((p) => {
      if (!paramSearch.trim()) return true;
      const term = paramSearch.toLowerCase();
      return (
        p.parameterKey.toLowerCase().includes(term) ||
        p.parameterValue.toLowerCase().includes(term) ||
        (p.description && p.description.toLowerCase().includes(term))
      );
    });
  }, [parameters, paramSearch]);

  // Filtered Fees
  const filteredFees = useMemo(() => {
    return feeSchedules.filter((f) => {
      const matchesSearch =
        !feeSearch.trim() ||
        f.feeCode.toLowerCase().includes(feeSearch.toLowerCase()) ||
        f.transactionType.toLowerCase().includes(feeSearch.toLowerCase()) ||
        f.currency.toLowerCase().includes(feeSearch.toLowerCase());

      const matchesStatus =
        feeStatusFilter === 'ALL' ||
        (feeStatusFilter === 'ACTIVE' && f.active) ||
        (feeStatusFilter === 'INACTIVE' && !f.active);

      return matchesSearch && matchesStatus;
    });
  }, [feeSchedules, feeSearch, feeStatusFilter]);

  const activeFeesCount = useMemo(() => {
    return feeSchedules.filter((f) => f.active).length;
  }, [feeSchedules]);

  // Deactivate fee handler
  const handleConfirmDeactivateFee = async () => {
    if (!selectedFee) return;
    setActionLoading(true);
    try {
      await systemRulesApi.deactivateFee(selectedFee.feeScheduleId);
      handleShowSuccess(`Fee schedule "${selectedFee.feeCode}" has been deactivated.`);
      setIsDeactivateFeeOpen(false);
      setSelectedFee(null);
      loadFees();
    } catch (err) {
      const axErr = err as AxiosError<{ message?: string }>;
      setError(axErr.response?.data?.message || 'Failed to deactivate fee schedule.');
    } finally {
      setActionLoading(false);
    }
  };

  // Activate fee handler
  const handleConfirmActivateFee = async () => {
    if (!selectedFee) return;
    setActionLoading(true);
    try {
      await systemRulesApi.activateFee(selectedFee.feeScheduleId);
      handleShowSuccess(`Fee schedule "${selectedFee.feeCode}" has been activated.`);
      setIsActivateFeeOpen(false);
      setSelectedFee(null);
      loadFees();
    } catch (err) {
      const axErr = err as AxiosError<{ message?: string }>;
      setError(axErr.response?.data?.message || 'Failed to activate fee schedule.');
    } finally {
      setActionLoading(false);
    }
  };

  // Parameter table columns
  const parameterColumns = [
    {
      key: 'parameterKey',
      header: 'Parameter Key & Scope',
      render: (row: SystemParameterResponse) => (
        <div>
          <span className="font-mono text-xs font-bold text-[#1E1B4B] block">
            {row.parameterKey}
          </span>
          <span className="text-[11px] text-zinc-500 block truncate max-w-[320px] font-medium mt-0.5">
            {row.description || 'No description provided.'}
          </span>
        </div>
      ),
    },
    {
      key: 'parameterValue',
      header: 'Configured Value',
      render: (row: SystemParameterResponse) => (
        <span className="rounded-xl bg-purple-900/5 border border-purple-900/10 px-3 py-1 text-xs font-mono font-bold text-[#1E1B4B]">
          {row.parameterValue}
        </span>
      ),
    },
    {
      key: 'updatedAt',
      header: 'Last Updated',
      render: (row: SystemParameterResponse) => (
        <div className="text-xs text-zinc-500 font-medium">
          <p>{formatDateTime(row.updatedAt)}</p>
          {row.updatedByType && (
            <p className="text-zinc-400 text-[10px]">by {row.updatedByType}</p>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right' as const,
      render: (row: SystemParameterResponse) => (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => {
              setSelectedParam(row);
              setIsEditParamOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-full border border-purple-950/15 bg-white/80 px-3.5 py-1 text-xs font-bold text-[#1E1B4B] shadow-xs hover:bg-[#1E1B4B] hover:text-white transition-all"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span>Edit</span>
          </button>
        </div>
      ),
    },
  ];

  // Fee table columns
  const feeColumns = [
    {
      key: 'feeCode',
      header: 'Fee Code / Operation',
      render: (row: FeeScheduleResponse) => (
        <div>
          <span className="font-mono text-xs font-bold text-[#1E1B4B] block">
            {row.feeCode}
          </span>
          <span className="text-[11px] text-zinc-500 font-medium block mt-0.5">
            {row.transactionType.replace(/_/g, ' ')}
          </span>
        </div>
      ),
    },
    {
      key: 'feeValue',
      header: 'Fee Rate / Formula',
      render: (row: FeeScheduleResponse) => (
        <div>
          <span className="font-bold text-[#1E1B4B] text-xs font-mono">
            {row.feeType === 'PERCENTAGE'
              ? `${row.feeValue}%`
              : `${row.feeValue.toFixed(2)} ${row.currency}`}
          </span>
          <span className="status-pill-purple text-[10px] ml-1.5 uppercase">
            {row.feeType}
          </span>
          {(row.minimumFee != null || row.maximumFee != null) && (
            <p className="text-[10px] text-zinc-400 mt-0.5 font-mono">
              {row.minimumFee != null ? `Min: ${row.minimumFee}` : ''}
              {row.minimumFee != null && row.maximumFee != null ? ' · ' : ''}
              {row.maximumFee != null ? `Max: ${row.maximumFee}` : ''}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'activePeriod',
      header: 'Active Schedule',
      render: (row: FeeScheduleResponse) => (
        <div className="text-xs text-zinc-500 font-medium">
          <p>From: {new Date(row.activeFrom).toLocaleDateString()}</p>
          <p className="text-zinc-400 text-[10px]">
            Until: {row.activeUntil ? new Date(row.activeUntil).toLocaleDateString() : 'Indefinite'}
          </p>
        </div>
      ),
    },
    {
      key: 'active',
      header: 'Status',
      align: 'center' as const,
      render: (row: FeeScheduleResponse) => (
        <span
          className={
            row.active
              ? 'status-pill-emerald'
              : 'status-pill-amber'
          }
        >
          {row.active ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right' as const,
      render: (row: FeeScheduleResponse) => (
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setSelectedFee(row);
              setIsEditFeeOpen(true);
            }}
            className="inline-flex items-center gap-1 rounded-full border border-purple-950/15 bg-white/80 px-3 py-1 text-xs font-bold text-[#1E1B4B] shadow-xs hover:bg-[#1E1B4B] hover:text-white transition-all"
          >
            Edit
          </button>

          {row.active ? (
            <button
              onClick={() => {
                setSelectedFee(row);
                setIsDeactivateFeeOpen(true);
              }}
              className="rounded-full px-3 py-1 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors"
            >
              Deactivate
            </button>
          ) : (
            <button
              onClick={() => {
                setSelectedFee(row);
                setIsActivateFeeOpen(true);
              }}
              className="rounded-full px-3 py-1 text-xs font-bold text-emerald-600 hover:bg-emerald-50 transition-colors"
            >
              Activate
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <AdminLayout pageTitle="System Rules">
      <div className="max-w-[1440px] mx-auto space-y-6">

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
          <div>
            <h2 className="text-2xl sm:text-[28px] font-black text-[#1E1B4B] tracking-tight">
              System Rules & Fee Matrix
            </h2>
            <p className="mt-0.5 text-xs sm:text-sm text-zinc-500 font-medium">
              Ekaraj Bank Core Controls: Operating parameters, liquidity reserve thresholds, and dynamic fee schedules
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (activeTab === 'parameters') loadParameters();
                else loadFees();
              }}
              disabled={activeTab === 'parameters' ? isLoadingParams : isLoadingFees}
              className="flex items-center gap-2 rounded-full border border-purple-950/15 bg-white/80 px-4 py-2 text-xs font-bold text-[#1E1B4B] hover:bg-white shadow-xs transition-colors disabled:opacity-50"
            >
              <svg
                className={[
                  'h-4 w-4',
                  (activeTab === 'parameters' ? isLoadingParams : isLoadingFees) ? 'animate-spin' : '',
                ].join(' ')}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Refresh</span>
            </button>

            {activeTab === 'parameters' ? (
              <button
                type="button"
                onClick={() => setIsCreateParamOpen(true)}
                className="btn-liquid-gold px-5 py-2 text-xs flex items-center gap-2"
              >
                <svg className="h-4 w-4 text-[#1E1B4B]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                <span>New Parameter</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsCreateFeeOpen(true)}
                className="btn-liquid-gold px-5 py-2 text-xs flex items-center gap-2"
              >
                <svg className="h-4 w-4 text-[#1E1B4B]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                <span>New Fee Schedule</span>
              </button>
            )}
          </div>
        </div>

        {/* 3 Summary KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)]">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              System Parameters
            </span>
            <div className="flex items-baseline justify-between mt-3">
              <span className="text-2xl sm:text-[28px] font-bold text-slate-900 font-mono tabular-nums">
                {parameters.length}
              </span>
              <span className="status-pill-emerald text-[11px]">
                Enforced Core
              </span>
            </div>
          </div>

          <div className="glass-panel p-6">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
              Active Fee Schedules
            </span>
            <div className="flex items-baseline justify-between mt-3">
              <span className="text-2xl sm:text-[28px] font-black text-[#1E1B4B] font-mono tabular-nums">
                {activeFeesCount}
              </span>
              <span className="status-pill-amber text-[11px]">
                Active Tariffs
              </span>
            </div>
          </div>

          <div className="glass-panel p-6">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
              Security Protocol
            </span>
            <div className="flex items-baseline justify-between mt-3">
              <span className="text-xl sm:text-2xl font-black text-[#1E1B4B]">
                Pessimistic Locks
              </span>
              <span className="status-pill-purple text-[11px]">
                Double Spending Guard
              </span>
            </div>
          </div>
        </div>

        {/* Success & Error notifications */}
        {successMessage && (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-50/80 backdrop-blur-md px-5 py-3 text-xs font-semibold text-emerald-800 flex items-center justify-between">
            <span>{successMessage}</span>
            <button onClick={() => setSuccessMessage(null)} className="text-emerald-700 hover:text-emerald-950 font-bold">
              ✕
            </button>
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-500/30 bg-red-50/80 backdrop-blur-md px-5 py-4 text-xs font-semibold text-red-700 flex items-start justify-between">
            <div>
              <p className="font-bold">Configuration Error</p>
              <p className="mt-0.5">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-red-700 hover:text-red-950 font-bold">
              ✕
            </button>
          </div>
        )}

        {/* Tab Switcher (No Emojis, No Black background - Clean Light Theme) */}
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-lg bg-slate-100 p-1 border border-slate-200/60 shadow-xs">
            <button
              type="button"
              onClick={() => setActiveTab('parameters')}
              className={[
                'px-4 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-2 cursor-pointer',
                activeTab === 'parameters'
                  ? 'bg-white text-sky-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900',
              ].join(' ')}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" />
              </svg>
              <span>System Parameters ({parameters.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('fees')}
              className={[
                'px-4 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-2 cursor-pointer',
                activeTab === 'fees'
                  ? 'bg-white text-sky-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900',
              ].join(' ')}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
              </svg>
              <span>Fee Schedules ({feeSchedules.length})</span>
            </button>
          </div>
        </div>

        {/* TAB 1: SYSTEM PARAMETERS */}
        {activeTab === 'parameters' && (
          <div className="glass-panel p-6 space-y-5">
            {/* Search Card */}
            <div className="pb-4 border-b border-purple-950/10">
              <div className="relative max-w-md">
                <input
                  type="text"
                  placeholder="Search parameter key, value, or description..."
                  value={paramSearch}
                  onChange={(e) => setParamSearch(e.target.value)}
                  className="w-full rounded-full border border-purple-950/15 bg-white/70 py-2 pl-10 pr-4 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-400/25 focus:border-amber-500"
                />
                <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-zinc-400">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                {paramSearch && (
                  <button
                    onClick={() => setParamSearch('')}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-zinc-400 hover:text-zinc-600"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            <div>
              <DataTable
                columns={parameterColumns}
                data={filteredParameters}
                isLoading={isLoadingParams}
                emptyMessage={
                  paramSearch
                    ? 'No system parameters match your search.'
                    : 'No system parameters configured.'
                }
                keyExtractor={(row: SystemParameterResponse) => String(row.parameterId || row.parameterKey)}
              />
            </div>
          </div>
        )}

        {/* TAB 2: FEE SCHEDULES */}
        {activeTab === 'fees' && (
          <div className="glass-panel p-6 space-y-5">
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-purple-950/10">
              <div className="relative flex-1 max-w-md">
                <input
                  type="text"
                  placeholder="Search fee code, transaction type, currency..."
                  value={feeSearch}
                  onChange={(e) => setFeeSearch(e.target.value)}
                  className="w-full rounded-full border border-purple-950/15 bg-white/70 py-2 pl-10 pr-4 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-400/25 focus:border-amber-500"
                />
                <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-zinc-400">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                {feeSearch && (
                  <button
                    onClick={() => setFeeSearch('')}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-zinc-400 hover:text-zinc-600"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase text-[#1E1B4B]">
                  Status:
                </span>
                <select
                  value={feeStatusFilter}
                  onChange={(e) => setFeeStatusFilter(e.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE')}
                  className="rounded-full border border-purple-950/15 bg-white/80 px-4 py-2 text-xs font-semibold text-[#1E1B4B] focus:outline-none focus:ring-2 focus:ring-amber-400/25"
                >
                  <option value="ALL">All Fee Schedules ({feeSchedules.length})</option>
                  <option value="ACTIVE">
                    Active ({feeSchedules.filter((f) => f.active).length})
                  </option>
                  <option value="INACTIVE">
                    Inactive ({feeSchedules.filter((f) => !f.active).length})
                  </option>
                </select>
              </div>
            </div>

            <div>
              <DataTable
                columns={feeColumns}
                data={filteredFees}
                isLoading={isLoadingFees}
                emptyMessage={
                  feeSearch || feeStatusFilter !== 'ALL'
                    ? 'No fee schedules match your search or filter.'
                    : 'No fee schedules configured in the system.'
                }
                keyExtractor={(row: FeeScheduleResponse) => String(row.feeScheduleId)}
              />
            </div>
          </div>
        )}

        {/* Modals */}
        <ParameterCreateModal
          isOpen={isCreateParamOpen}
          onClose={() => setIsCreateParamOpen(false)}
          onSuccess={() => {
            handleShowSuccess('System parameter created successfully.');
            loadParameters();
          }}
        />

        <ParameterEditModal
          isOpen={isEditParamOpen}
          onClose={() => setIsEditParamOpen(false)}
          parameter={selectedParam}
          onSuccess={() => {
            handleShowSuccess('System parameter updated successfully.');
            loadParameters();
          }}
        />

        <FeeScheduleCreateModal
          isOpen={isCreateFeeOpen}
          onClose={() => setIsCreateFeeOpen(false)}
          onSuccess={() => {
            handleShowSuccess('Fee schedule created successfully.');
            loadFees();
          }}
        />

        <FeeScheduleEditModal
          isOpen={isEditFeeOpen}
          onClose={() => setIsEditFeeOpen(false)}
          feeSchedule={selectedFee}
          onSuccess={() => {
            handleShowSuccess('Fee schedule updated successfully.');
            loadFees();
          }}
        />

        <ConfirmModal
          isOpen={isDeactivateFeeOpen}
          onClose={() => setIsDeactivateFeeOpen(false)}
          onConfirm={handleConfirmDeactivateFee}
          title="Deactivate Fee Schedule"
          message={`Are you sure you want to deactivate fee schedule "${selectedFee?.feeCode}"? Transactions will no longer apply this fee rule.`}
          confirmText="Deactivate"
          variant="danger"
          isLoading={actionLoading}
        />

        <ConfirmModal
          isOpen={isActivateFeeOpen}
          onClose={() => setIsActivateFeeOpen(false)}
          onConfirm={handleConfirmActivateFee}
          title="Activate Fee Schedule"
          message={`Are you sure you want to activate fee schedule "${selectedFee?.feeCode}"? It will become active according to its configured schedule.`}
          confirmText="Activate"
          variant="primary"
          isLoading={actionLoading}
        />
      </div>
    </AdminLayout>
  );
}
