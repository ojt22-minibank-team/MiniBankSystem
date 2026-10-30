import { useState, useEffect, type FormEvent } from 'react';
import Modal from '../../../components/common/Modal';
import Button from '../../../components/common/Button';
import { staffApi } from '../../../services/apiClient';
import type { StaffResponse, StaffRoleOption } from '../../../types/api.types';
import type { AxiosError } from 'axios';
import { useAuth } from '../../auth/hooks/useAuth';

interface StaffRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff: StaffResponse | null;
  onSuccess: () => void;
}

interface DisplayRole {
  id: number;
  code: string;
  label: string;
  description: string;
}

const FALLBACK_ROLES: DisplayRole[] = [
  { id: 1, code: 'ADMIN', label: 'Administrator', description: 'Full access to all system configurations, staff management, and oversight.' },
  { id: 2, code: 'TELLER', label: 'Teller', description: 'Handles day-to-day transactions, customer onboarding, and account services.' },
  { id: 4, code: 'AUDITOR', label: 'Auditor', description: 'Read-only audit inspection, compliance tracking, and report generation.' },
];

export default function StaffRoleModal({
  isOpen,
  onClose,
  staff,
  onSuccess,
}: StaffRoleModalProps) {
  const { user } = useAuth();
  const [roles, setRoles] = useState<DisplayRole[]>(FALLBACK_ROLES);
  const [selectedRoleId, setSelectedRoleId] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Fetch roles dynamically from backend to match exact database IDs
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    staffApi
      .getRoles()
      .then((res) => {
        if (!isMounted) return;
        const permitted = (res.data || [])
          .filter((r: StaffRoleOption) => {
            const code = (r.roleCode || '').toUpperCase();
            return ['ADMIN', 'TELLER', 'AUDITOR'].includes(code);
          })
          .map((r: StaffRoleOption) => ({
            id: r.roleId,
            code: r.roleCode.toUpperCase(),
            label: r.roleName || r.roleCode,
            description:
              r.description ||
              (r.roleCode === 'ADMIN'
                ? 'Full access to all system configurations, staff management, and oversight.'
                : r.roleCode === 'TELLER'
                ? 'Handles day-to-day transactions, customer onboarding, and account services.'
                : 'Read-only audit inspection, compliance tracking, and report generation.'),
          }));

        if (permitted.length > 0) {
          setRoles(permitted);
        }
      })
      .catch(() => {
        setRoles(FALLBACK_ROLES);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Set default selection when modal opens or staff changes
  useEffect(() => {
    if (staff) {
      setApiError(null);
      const currentCode = (staff.roleCode || '').toUpperCase();
      if (currentCode === 'TELLER' || currentCode === 'AUDITOR') {
        const adminRole = roles.find((r) => r.code === 'ADMIN');
        if (adminRole) {
          setSelectedRoleId(adminRole.id);
          return;
        }
      }
      const differentRole = roles.find((r) => r.id !== staff.roleId);
      if (differentRole) {
        setSelectedRoleId(differentRole.id);
      }
    }
  }, [staff, roles]);

  if (!staff) return null;

  const currentUsername = user?.username?.trim().toLowerCase();
  const targetUsername = staff.username?.trim().toLowerCase();
  const isSelf = !!currentUsername && !!targetUsername && currentUsername === targetUsername;

  const roleCode = (staff.roleCode || (staff.staffNo.includes('TLR') ? 'TELLER' : staff.staffNo.includes('AUD') ? 'AUDITOR' : staff.staffNo.includes('ADM') ? 'ADMIN' : 'STAFF')).toUpperCase();
  const isTargetAdmin = roleCode === 'ADMIN';

  // Role change restrictions:
  // Administrators cannot change their own role or other administrators' roles.
  const isRoleChangeBlocked = isTargetAdmin || isSelf;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!staff) return;

    if (isSelf) {
      setApiError('Administrators cannot change their own role.');
      return;
    }
    if (isTargetAdmin) {
      setApiError('Administrators cannot change the role of other administrators.');
      return;
    }

    if (staff.roleId && selectedRoleId === staff.roleId) {
      setApiError(`Staff already has the ${staff.roleName || 'selected'} role.`);
      return;
    }

    setIsLoading(true);
    setApiError(null);

    try {
      await staffApi.changeRole(staff.staffId, { roleId: selectedRoleId });
      onSuccess();
      onClose();
    } catch (err) {
      const error = err as AxiosError<{ message?: string }>;
      if (error.response?.data?.message) {
        setApiError(error.response.data.message);
      } else {
        setApiError('Failed to change staff role.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Change Staff Role"
      size="md"
      footer={
        <>
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="md"
            isLoading={isLoading}
            disabled={isRoleChangeBlocked}
            onClick={handleSubmit}
          >
            Update Role
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {apiError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {apiError}
          </div>
        )}

        {isRoleChangeBlocked && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            <strong>Restricted:</strong> {isSelf ? 'Administrators cannot change their own role.' : 'Administrators cannot change the role of other administrators.'}
          </div>
        )}

        {/* Staff Target Header */}
        <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-600 flex items-center justify-between">
          <div>
            <p className="font-semibold text-gray-800">{staff.fullName || staff.username}</p>
            <p className="font-mono text-gray-500">{staff.staffNo}</p>
          </div>
          <div className="text-right">
            <span className="text-gray-400 block text-[10px] uppercase tracking-wider font-semibold">Current Role</span>
            <span className="font-semibold text-purple-700">{staff.roleName || staff.roleCode || 'Staff'}</span>
          </div>
        </div>

        {/* Role Options */}
        <div className="space-y-2 pt-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600">
            Select New Role
          </label>
          <div className="space-y-2">
            {roles.map((r) => {
              const isCurrent = (staff.roleId && r.id === staff.roleId) || (staff.roleCode && r.code.toUpperCase() === staff.roleCode.toUpperCase());
              return (
                <label
                  key={r.id}
                  className={[
                    'flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors',
                    selectedRoleId === r.id
                      ? 'border-blue-500 bg-blue-50/40 ring-1 ring-blue-500'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50',
                    isCurrent || isRoleChangeBlocked ? 'opacity-60 cursor-not-allowed' : '',
                  ].join(' ')}
                >
                  <input
                    type="radio"
                    name="roleSelection"
                    value={r.id}
                    checked={selectedRoleId === r.id}
                    disabled={isLoading || isRoleChangeBlocked}
                    onChange={() => setSelectedRoleId(r.id)}
                    className="mt-0.5 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900">{r.label}</span>
                      {isCurrent && (
                        <span className="rounded bg-gray-200 px-1.5 py-0.2 text-[10px] font-medium text-gray-700">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-gray-500">{r.description}</p>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      </form>
    </Modal>
  );
}
