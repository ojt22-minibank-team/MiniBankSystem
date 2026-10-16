import { useState, type FormEvent } from 'react';
import Modal from '../../../components/common/Modal';
import Button from '../../../components/common/Button';
import { staffApi } from '../../../services/apiClient';
import type { StaffResponse } from '../../../types/api.types';
import type { AxiosError } from 'axios';

interface StaffRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff: StaffResponse | null;
  onSuccess: () => void;
}

const ROLES = [
  { id: 1, code: 'ADMIN', label: 'Administrator', description: 'Full access to all system configurations, staff management, and oversight.' },
  { id: 2, code: 'TELLER', label: 'Teller', description: 'Handles day-to-day transactions, customer onboarding, and account services.' },
  { id: 3, code: 'AUDITOR', label: 'Auditor', description: 'Read-only audit inspection, compliance tracking, and report generation.' },
];

export default function StaffRoleModal({
  isOpen,
  onClose,
  staff,
  onSuccess,
}: StaffRoleModalProps) {
  const [selectedRoleId, setSelectedRoleId] = useState<number>(2);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!staff) return;

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

  if (!staff) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Change Role: ${staff.fullName || staff.username}`}
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

        <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 text-xs text-blue-800">
          <p className="font-semibold">Role Authorization Notice</p>
          <p className="mt-0.5">
            Changing a staff member's role will immediately adjust their backend permissions and accessible API endpoints.
          </p>
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Select New Role
          </label>
          <div className="space-y-2">
            {ROLES.map((role) => (
              <label
                key={role.id}
                className={[
                  'flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors',
                  selectedRoleId === role.id
                    ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500'
                    : 'border-gray-200 hover:bg-gray-50',
                ].join(' ')}
              >
                <input
                  type="radio"
                  name="staffRole"
                  value={role.id}
                  checked={selectedRoleId === role.id}
                  onChange={() => setSelectedRoleId(role.id)}
                  className="mt-0.5 text-blue-600 focus:ring-blue-500"
                  disabled={isLoading}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">{role.label}</span>
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-mono font-medium text-gray-600">
                      {role.code}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{role.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
      </form>
    </Modal>
  );
}
