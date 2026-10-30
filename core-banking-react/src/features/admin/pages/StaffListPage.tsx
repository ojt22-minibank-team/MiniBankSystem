import { useEffect, useState, useMemo } from 'react';
import AdminLayout from '../../../components/layout/AdminLayout';
import DataTable from '../../../components/common/DataTable';
import StaffCreateModal from '../components/StaffCreateModal';
import StaffEditModal from '../components/StaffEditModal';
import StaffRoleModal from '../components/StaffRoleModal';
import StaffResetPasswordModal from '../components/StaffResetPasswordModal';
import StaffDetailsModal from '../components/StaffDetailsModal';
import ConfirmModal from '../components/ConfirmModal';
import { staffApi } from '../../../services/apiClient';
import type { StaffResponse, StaffUserStatus } from '../../../types/api.types';
import type { AxiosError } from 'axios';
import { useAuth } from '../../auth/hooks/useAuth';

export default function StaffListPage() {
  const { user } = useAuth();
  const [staffList, setStaffList] = useState<StaffResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Search and Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffResponse | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isRoleOpen, setIsRoleOpen] = useState(false);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [isDeactivateConfirmOpen, setIsDeactivateConfirmOpen] = useState(false);
  const [deactivateLoading, setDeactivateLoading] = useState(false);

  // Dropdown menu state
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-dropdown-container]')) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  const loadStaff = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await staffApi.getAll();
      setStaffList(res.data);
    } catch (err) {
      const axErr = err as AxiosError<{ message?: string }>;
      if (axErr.response?.status === 403) {
        setError('Access denied. You do not have permission to view staff records.');
      } else {
        setError('Failed to load staff list. Please verify the backend service is running.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStaff();
  }, []);

  const handleShowSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => {
      setSuccessMessage(null);
    }, 4000);
  };

  const filteredStaff = useMemo(() => {
    return staffList.filter((item) => {
      const matchesSearch =
        !searchTerm.trim() ||
        item.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.fullName && item.fullName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.email && item.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.staffNo && item.staffNo.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.roleCode && item.roleCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.roleName && item.roleName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.phone && item.phone.includes(searchTerm));

      const matchesStatus =
        statusFilter === 'ALL' || item.status === (statusFilter as StaffUserStatus);

      return matchesSearch && matchesStatus;
    });
  }, [staffList, searchTerm, statusFilter]);

  // Summary counts
  const activeStaffCount = useMemo(() => {
    return staffList.filter((s) => s.status === 'ACTIVE').length;
  }, [staffList]);

  const tellerCount = useMemo(() => {
    return staffList.filter((s) => {
      const code = (s.roleCode || (s.staffNo?.includes('TLR') ? 'TELLER' : '')).toUpperCase();
      return code === 'TELLER';
    }).length;
  }, [staffList]);

  const adminAuditorCount = useMemo(() => {
    return staffList.filter((s) => {
      const code = (s.roleCode || (s.staffNo?.includes('ADM') ? 'ADMIN' : s.staffNo?.includes('AUD') ? 'AUDITOR' : '')).toUpperCase();
      return code === 'ADMIN' || code === 'AUDITOR';
    }).length;
  }, [staffList]);

  // Handle deactivation
  const handleConfirmDeactivate = async () => {
    if (!selectedStaff) return;

    const currentUsername = user?.username?.trim().toLowerCase();
    const targetUsername = selectedStaff.username?.trim().toLowerCase();
    const isSelf = !!currentUsername && !!targetUsername && currentUsername === targetUsername;
    const roleCode = (selectedStaff.roleCode || (selectedStaff.staffNo?.includes('TLR') ? 'TELLER' : selectedStaff.staffNo?.includes('AUD') ? 'AUDITOR' : selectedStaff.staffNo?.includes('ADM') ? 'ADMIN' : '')).toUpperCase();

    if (roleCode === 'ADMIN' || isSelf) {
      setError(isSelf ? 'Administrators cannot deactivate their own account.' : 'Administrators cannot deactivate other administrators.');
      setIsDeactivateConfirmOpen(false);
      return;
    }

    setDeactivateLoading(true);
    try {
      await staffApi.deactivate(selectedStaff.staffId);
      handleShowSuccess(`Staff account "${selectedStaff.username}" has been deactivated.`);
      setIsDeactivateConfirmOpen(false);
      setSelectedStaff(null);
      loadStaff();
    } catch (err) {
      const axErr = err as AxiosError<{ message?: string }>;
      setError(axErr.response?.data?.message || 'Failed to deactivate staff account.');
    } finally {
      setDeactivateLoading(false);
    }
  };

  const columns = [
    {
      key: 'staffNo',
      header: 'Staff No.',
      render: (row: StaffResponse) => (
        <span className="font-mono text-xs font-bold text-[#1E1B4B]">
          {row.staffNo}
        </span>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (row: StaffResponse) => {
        const code = (row.roleCode || (row.staffNo?.includes('TLR') ? 'TELLER' : row.staffNo?.includes('AUD') ? 'AUDITOR' : row.staffNo?.includes('ADM') ? 'ADMIN' : 'STAFF')).toUpperCase();
        return (
          <span
            className={
              code === 'ADMIN'
                ? 'status-pill-purple'
                : code === 'TELLER'
                ? 'status-pill-amber'
                : 'status-pill-emerald'
            }
          >
            {row.roleName || code}
          </span>
        );
      },
    },
    {
      key: 'username',
      header: 'Staff Identity',
      render: (row: StaffResponse) => (
        <div>
          <button
            onClick={() => {
              setSelectedStaff(row);
              setIsDetailsOpen(true);
            }}
            className="font-bold text-[#1E1B4B] hover:text-amber-600 hover:underline text-left block"
          >
            {row.username}
          </button>
          <span className="text-xs text-zinc-400 block truncate max-w-[160px] font-medium">
            {row.fullName || '—'}
          </span>
        </div>
      ),
    },
    {
      key: 'email',
      header: 'Contact Info',
      render: (row: StaffResponse) => (
        <div className="text-xs">
          <p className="text-zinc-700 font-medium truncate max-w-[180px]">{row.email || '—'}</p>
          <p className="text-zinc-400 font-mono text-[11px]">{row.phone || '—'}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center' as const,
      render: (row: StaffResponse) => (
        <span
          className={
            row.status === 'ACTIVE'
              ? 'status-pill-emerald'
              : 'status-pill-crimson'
          }
        >
          {row.status}
        </span>
      ),
    },
    {
      key: 'mustChangePassword',
      header: 'Password Reset',
      align: 'center' as const,
      render: (row: StaffResponse) =>
        row.mustChangePassword ? (
          <span className="status-pill-amber text-[10px]">
            REQUIRED
          </span>
        ) : (
          <span className="text-xs text-zinc-400 font-medium">Standard</span>
        ),
    },
    {
      key: 'lastLoginAt',
      header: 'Last Active',
      render: (row: StaffResponse) => (
        <span className="text-xs text-zinc-500 font-medium">
          {row.lastLoginAt ? new Date(row.lastLoginAt).toLocaleString() : 'Never'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right' as const,
      render: (row: StaffResponse) => {
        const currentUsername = user?.username?.trim().toLowerCase();
        const rowUsername = row.username?.trim().toLowerCase();
        const isSelf = !!currentUsername && !!rowUsername && currentUsername === rowUsername;

        const roleCode = (row.roleCode || (row.staffNo?.includes('TLR') ? 'TELLER' : row.staffNo?.includes('AUD') ? 'AUDITOR' : row.staffNo?.includes('ADM') ? 'ADMIN' : '')).toUpperCase();
        const isRowAdmin = roleCode === 'ADMIN';
        const isOtherAdmin = isRowAdmin && !isSelf;

        const isDeactivated = row.status === 'DEACTIVATED';

        const canEdit = !isOtherAdmin && !isDeactivated;
        const canChangeRole = !isRowAdmin && !isSelf && !isDeactivated;
        const canResetPassword = !isOtherAdmin && !isDeactivated;
        const canDeactivate = !isRowAdmin && !isSelf && !isDeactivated;

        const isOpen = openDropdownId === row.staffId;
        const rowIndex = filteredStaff.findIndex((s) => s.staffId === row.staffId);
        const isNearBottom = filteredStaff.length > 2 && rowIndex >= filteredStaff.length - 2;

        return (
          <div className="relative inline-block text-left" data-dropdown-container>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpenDropdownId(isOpen ? null : row.staffId);
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-purple-950/15 bg-white/80 px-3.5 py-1.5 text-xs font-bold text-[#1E1B4B] shadow-xs hover:bg-[#1E1B4B] hover:text-white transition-all"
              aria-expanded={isOpen}
            >
              <span>Actions</span>
              <svg
                className={`h-3.5 w-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isOpen && (
              <div
                className={`absolute right-0 z-50 w-48 rounded-2xl bg-white/95 backdrop-blur-xl border border-white/90 shadow-[0_15px_40px_-5px_rgba(30,27,75,0.25)] p-1 divide-y divide-purple-950/5 ${
                  isNearBottom ? 'bottom-full mb-1 origin-bottom-right' : 'top-full mt-1 origin-top-right'
                }`}
              >
                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => {
                      setOpenDropdownId(null);
                      setSelectedStaff(row);
                      setIsDetailsOpen(true);
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-purple-50 transition-colors"
                  >
                    <svg className="h-4 w-4 text-purple-700 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <span>View Details</span>
                  </button>

                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => {
                        setOpenDropdownId(null);
                        setSelectedStaff(row);
                        setIsEditOpen(true);
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold text-[#1E1B4B] hover:bg-purple-50 transition-colors"
                    >
                      <svg className="h-4 w-4 text-[#1E1B4B] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      <span>Edit Information</span>
                    </button>
                  )}

                  {canChangeRole && (
                    <button
                      type="button"
                      onClick={() => {
                        setOpenDropdownId(null);
                        setSelectedStaff(row);
                        setIsRoleOpen(true);
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold text-purple-700 hover:bg-purple-50 transition-colors"
                    >
                      <svg className="h-4 w-4 text-purple-700 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      <span>Change Role</span>
                    </button>
                  )}

                  {canResetPassword && (
                    <button
                      type="button"
                      onClick={() => {
                        setOpenDropdownId(null);
                        setSelectedStaff(row);
                        setIsResetPasswordOpen(true);
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50 transition-colors"
                    >
                      <svg className="h-4 w-4 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                      <span>Reset Password</span>
                    </button>
                  )}
                </div>

                {canDeactivate && (
                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => {
                        setOpenDropdownId(null);
                        setSelectedStaff(row);
                        setIsDeactivateConfirmOpen(true);
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <svg className="h-4 w-4 text-red-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                      <span>Deactivate</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <AdminLayout pageTitle="Staff Management">
      <div className="max-w-[1440px] mx-auto space-y-6">

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
          <div>
            <h2 className="text-2xl sm:text-[28px] font-black text-[#1E1B4B] tracking-tight">
              Staff & Access Administration
            </h2>
            <p className="mt-0.5 text-xs sm:text-sm text-zinc-500 font-medium">
              Ekaraj Bank RBAC Personnel Directory: Role credentials, branch desks, and security privileges
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadStaff}
              disabled={isLoading}
              className="flex items-center gap-2 rounded-full border border-purple-950/15 bg-white/80 px-4 py-2 text-xs font-bold text-[#1E1B4B] hover:bg-white shadow-xs transition-colors disabled:opacity-50"
            >
              <svg
                className={['h-4 w-4', isLoading ? 'animate-spin' : ''].join(' ')}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Refresh</span>
            </button>

            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="btn-liquid-gold px-5 py-2 text-xs flex items-center gap-2"
            >
              <svg className="h-4 w-4 text-[#1E1B4B]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span>Add Staff Member</span>
            </button>
          </div>
        </div>

        {/* 3 Summary KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)]">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Personnel
            </span>
            <div className="flex items-baseline justify-between mt-3">
              <span className="text-2xl sm:text-[28px] font-bold text-slate-900 font-mono tabular-nums">
                {staffList.length}
              </span>
              <span className="status-pill-emerald text-[11px]">
                {activeStaffCount} Active on Duty
              </span>
            </div>
          </div>

          <div className="glass-panel p-6">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
              Tellers & Cashiers
            </span>
            <div className="flex items-baseline justify-between mt-3">
              <span className="text-2xl sm:text-[28px] font-black text-[#1E1B4B] font-mono tabular-nums">
                {tellerCount}
              </span>
              <span className="status-pill-amber text-[11px]">
                Branch Desks
              </span>
            </div>
          </div>

          <div className="glass-panel p-6">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
              Admins & Auditors
            </span>
            <div className="flex items-baseline justify-between mt-3">
              <span className="text-2xl sm:text-[28px] font-black text-[#1E1B4B] font-mono tabular-nums">
                {adminAuditorCount}
              </span>
              <span className="status-pill-purple text-[11px]">
                High Privilege
              </span>
            </div>
          </div>
        </div>

        {/* Notifications */}
        {successMessage && (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-50/80 backdrop-blur-md px-5 py-3 text-xs font-semibold text-emerald-800 flex items-center justify-between">
            <span>{successMessage}</span>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-emerald-700 hover:text-emerald-950 font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-500/30 bg-red-50/80 backdrop-blur-md px-5 py-4 text-xs font-semibold text-red-700 flex items-start justify-between">
            <div>
              <p className="font-bold">Notice</p>
              <p className="mt-0.5">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-700 hover:text-red-950 font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Filters Card & Staff Table */}
        <div className="glass-panel p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-purple-950/10">
            {/* Search Box */}
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search by username, name, email, staff no, or role..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-full border border-purple-950/15 bg-white/70 py-2 pl-10 pr-4 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-400/25 focus:border-amber-500"
              />
              <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-zinc-400">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
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
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-full border border-purple-950/15 bg-white/80 px-4 py-2 text-xs font-semibold text-[#1E1B4B] focus:outline-none focus:ring-2 focus:ring-amber-400/25"
              >
                <option value="ALL">All Statuses ({staffList.length})</option>
                <option value="ACTIVE">
                  Active ({staffList.filter((s) => s.status === 'ACTIVE').length})
                </option>
                <option value="DEACTIVATED">
                  Deactivated ({staffList.filter((s) => s.status === 'DEACTIVATED').length})
                </option>
              </select>
            </div>
          </div>

          <div>
            <DataTable
              columns={columns}
              data={filteredStaff}
              isLoading={isLoading}
              emptyMessage={
                searchTerm || statusFilter !== 'ALL'
                  ? 'No staff members match the selected search/filter criteria.'
                  : 'No staff members registered in the system.'
              }
              keyExtractor={(row: StaffResponse) => row.staffId}
            />
          </div>
        </div>

        {/* Modals */}
        <StaffCreateModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onSuccess={() => {
            handleShowSuccess('Staff account created successfully.');
            loadStaff();
          }}
        />

        <StaffDetailsModal
          isOpen={isDetailsOpen}
          onClose={() => setIsDetailsOpen(false)}
          staff={selectedStaff}
          onEdit={(staff) => {
            setSelectedStaff(staff);
            setIsEditOpen(true);
          }}
          onChangeRole={(staff) => {
            setSelectedStaff(staff);
            setIsRoleOpen(true);
          }}
          onResetPassword={(staff) => {
            setSelectedStaff(staff);
            setIsResetPasswordOpen(true);
          }}
        />

        <StaffEditModal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          staff={selectedStaff}
          onSuccess={() => {
            handleShowSuccess('Staff information updated successfully.');
            loadStaff();
          }}
        />

        <StaffRoleModal
          isOpen={isRoleOpen}
          onClose={() => setIsRoleOpen(false)}
          staff={selectedStaff}
          onSuccess={() => {
            handleShowSuccess('Staff role and Staff No. updated successfully.');
            loadStaff();
          }}
        />

        <StaffResetPasswordModal
          isOpen={isResetPasswordOpen}
          onClose={() => setIsResetPasswordOpen(false)}
          staff={selectedStaff}
          onSuccess={() => {
            handleShowSuccess('Password setup link has been sent to staff email.');
            loadStaff();
          }}
        />

        <ConfirmModal
          isOpen={isDeactivateConfirmOpen}
          onClose={() => setIsDeactivateConfirmOpen(false)}
          onConfirm={handleConfirmDeactivate}
          title="Deactivate Staff Account"
          message={`Are you sure you want to deactivate staff account "${selectedStaff?.username}"? This will immediately revoke their active sessions and prevent future logins.`}
          confirmText="Deactivate Staff"
          variant="danger"
          isLoading={deactivateLoading}
        />
      </div>
    </AdminLayout>
  );
}
