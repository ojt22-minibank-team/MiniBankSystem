import { useEffect, useState, useMemo } from 'react';
import AdminLayout from '../../../components/layout/AdminLayout';
import Button from '../../../components/common/Button';
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
      header: 'Parameter Key',
      render: (row: SystemParameterResponse) => (
        <div>
          <span className="font-mono text-xs font-bold text-gray-900 block">
            {row.parameterKey}
          </span>
          <span className="text-xs text-gray-500 block truncate max-w-[280px]">
            {row.description || 'No description provided.'}
          </span>
        </div>
      ),
    },
    {
      key: 'parameterValue',
      header: 'Configured Value',
      render: (row: SystemParameterResponse) => (
        <span className="rounded bg-slate-100 border border-slate-200 px-2.5 py-1 text-xs font-mono font-semibold text-slate-800">
          {row.parameterValue}
        </span>
      ),
    },
    {
      key: 'updatedAt',
      header: 'Last Updated',
      render: (row: SystemParameterResponse) => (
        <div className="text-xs text-gray-500">
          <p>{formatDateTime(row.updatedAt)}</p>
          {row.updatedByType && (
            <p className="text-gray-400">by {row.updatedByType}</p>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (row: SystemParameterResponse) => (
        <div className="flex justify-end">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setSelectedParam(row);
              setIsEditOpenParam(true);
            }}
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </Button>
        </div>
      ),
    },
  ];

  const setIsEditOpenParam = (open: boolean) => {
    setIsEditParamOpen(open);
  };

  // Fee table columns
  const feeColumns = [
    {
      key: 'feeCode',
      header: 'Fee Code / Type',
      render: (row: FeeScheduleResponse) => (
        <div>
          <span className="font-mono text-xs font-bold text-gray-900 block">
            {row.feeCode}
          </span>
          <span className="text-xs text-gray-500 block">
            {row.transactionType.replace(/_/g, ' ')}
          </span>
        </div>
      ),
    },
    {
      key: 'feeValue',
      header: 'Fee Rate / Value',
      render: (row: FeeScheduleResponse) => (
        <div>
          <span className="font-semibold text-gray-900 text-sm">
            {row.feeType === 'PERCENTAGE'
              ? `${row.feeValue}%`
              : `${row.feeValue.toFixed(2)} ${row.currency}`}
          </span>
          <span className="rounded bg-blue-50 text-blue-700 px-1.5 py-0.5 text-[10px] font-semibold ml-1.5 uppercase">
            {row.feeType}
          </span>
          {(row.minimumFee != null || row.maximumFee != null) && (
            <p className="text-[11px] text-gray-400 mt-0.5">
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
        <div className="text-xs text-gray-500">
          <p>From: {new Date(row.activeFrom).toLocaleDateString()}</p>
          <p className="text-gray-400">
            Until: {row.activeUntil ? new Date(row.activeUntil).toLocaleDateString() : 'Indefinite'}
          </p>
        </div>
      ),
    },
    {
      key: 'active',
      header: 'Status',
      render: (row: FeeScheduleResponse) => (
        <span
          className={[
            'rounded-full px-2.5 py-0.5 text-xs font-semibold',
            row.active
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-500',
          ].join(' ')}
        >
          {row.active ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (row: FeeScheduleResponse) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setSelectedFee(row);
              setIsEditFeeOpen(true);
            }}
          >
            Edit
          </Button>

          {row.active ? (
            <button
              onClick={() => {
                setSelectedFee(row);
                setIsDeactivateFeeOpen(true);
              }}
              className="rounded px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              Deactivate
            </button>
          ) : (
            <button
              onClick={() => {
                setSelectedFee(row);
                setIsActivateFeeOpen(true);
              }}
              className="rounded px-2.5 py-1 text-xs font-medium text-green-600 hover:bg-green-50 transition-colors"
            >
              Activate
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <AdminLayout pageTitle="System Rules Configuration">
      {/* Page Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">System Rules & Configuration</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            Configure core banking operational thresholds, security timeouts, and transaction fee schedules.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (activeTab === 'parameters') loadParameters();
              else loadFees();
            }}
            disabled={activeTab === 'parameters' ? isLoadingParams : isLoadingFees}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
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
            Refresh
          </button>

          {activeTab === 'parameters' ? (
            <Button
              variant="primary"
              size="md"
              onClick={() => setIsCreateParamOpen(true)}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              New Parameter
            </Button>
          ) : (
            <Button
              variant="primary"
              size="md"
              onClick={() => setIsCreateFeeOpen(true)}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              New Fee Schedule
            </Button>
          )}
        </div>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800 flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-green-600 hover:text-green-800">
            ✕
          </button>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-start gap-3">
          <svg className="h-5 w-5 text-red-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <div className="flex-1">
            <p className="font-semibold">Configuration Error</p>
            <p className="mt-0.5">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
            ✕
          </button>
        </div>
      )}

      {/* Tab Selector */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('parameters')}
            className={[
              'py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2',
              activeTab === 'parameters'
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
            ].join(' ')}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            System Parameters ({parameters.length})
          </button>

          <button
            onClick={() => setActiveTab('fees')}
            className={[
              'py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2',
              activeTab === 'fees'
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
            ].join(' ')}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Fee Schedules ({feeSchedules.length})
          </button>
        </nav>
      </div>

      {/* TAB 1: SYSTEM PARAMETERS */}
      {activeTab === 'parameters' && (
        <div className="space-y-6">
          {/* Search Card */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="relative max-w-md">
              <input
                type="text"
                placeholder="Search parameter key, value, or description..."
                value={paramSearch}
                onChange={(e) => setParamSearch(e.target.value)}
                className="w-full rounded-lg border border-gray-300 pl-10 pr-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              {paramSearch && (
                <button
                  onClick={() => setParamSearch('')}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Parameters Table Card */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-slate-50/50">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Showing {filteredParameters.length} of {parameters.length} system parameters
              </p>
            </div>

            <div className="p-4">
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
        </div>
      )}

      {/* TAB 2: FEE SCHEDULES */}
      {activeTab === 'fees' && (
        <div className="space-y-6">
          {/* Search and Filters Card */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              {/* Search Box */}
              <div className="relative flex-1 max-w-md">
                <input
                  type="text"
                  placeholder="Search fee code, transaction type, currency..."
                  value={feeSearch}
                  onChange={(e) => setFeeSearch(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 pl-10 pr-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                {feeSearch && (
                  <button
                    onClick={() => setFeeSearch('')}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <label htmlFor="fee-status-filter" className="text-xs font-semibold uppercase text-gray-500">
                  Status:
                </label>
                <select
                  id="fee-status-filter"
                  value={feeStatusFilter}
                  onChange={(e) => setFeeStatusFilter(e.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE')}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          </div>

          {/* Fee Schedules Table Card */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-slate-50/50">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Showing {filteredFees.length} of {feeSchedules.length} fee schedule configurations
              </p>
            </div>

            <div className="p-4">
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
    </AdminLayout>
  );
}
