import { useState } from 'react';
import Modal from '../../../components/common/Modal';
import Button from '../../../components/common/Button';
import { staffApi } from '../../../services/apiClient';
import type { StaffResponse } from '../../../types/api.types';
import type { AxiosError } from 'axios';
import { useAuth } from '../../auth/hooks/useAuth';

interface StaffResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff: StaffResponse | null;
  onSuccess: () => void;
}

export default function StaffResetPasswordModal({
  isOpen,
  onClose,
  staff,
  onSuccess,
}: StaffResetPasswordModalProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const handleClose = () => {
    setApiError(null);
    onClose();
  };

  if (!staff) return null;

  const currentUsername = user?.username?.trim().toLowerCase();
  const targetUsername = staff.username?.trim().toLowerCase();
  const isSelf = !!currentUsername && !!targetUsername && currentUsername === targetUsername;

  const roleCode = (staff.roleCode || (staff.staffNo.includes('TLR') ? 'TELLER' : staff.staffNo.includes('AUD') ? 'AUDITOR' : staff.staffNo.includes('ADM') ? 'ADMIN' : 'STAFF')).toUpperCase();
  const isTargetAdmin = roleCode === 'ADMIN';
  const isOtherAdmin = isTargetAdmin && !isSelf;

  const handleConfirm = async () => {
    if (!staff) return;

    if (isOtherAdmin) {
      setApiError('Administrators cannot reset the password of other administrators.');
      return;
    }

    setIsLoading(true);
    setApiError(null);

    try {
      await staffApi.resetPassword(staff.staffId);
      handleClose();
      onSuccess();
    } catch (err) {
      const error = err as AxiosError<{ message?: string }>;
      if (error.response?.data?.message) {
        setApiError(error.response.data.message);
      } else {
        setApiError('Failed to trigger password reset link. The staff account might be deactivated.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Issue Password Reset Link"
      size="md"
      footer={
        <>
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            size="md"
            isLoading={isLoading}
            disabled={isOtherAdmin}
            onClick={handleConfirm}
          >
            Send Setup Link
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {apiError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {apiError}
          </div>
        )}

        {isOtherAdmin && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            <strong>Restricted:</strong> Administrators cannot reset credentials for other administrators.
          </div>
        )}

        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          <svg className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="font-semibold">Security Credential Action</p>
            <p className="mt-0.5">
              This action will flag the staff account with <span className="font-semibold">Must Change Password</span> and generate a secure password setup link.
            </p>
          </div>
        </div>

        <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
          <p><span className="text-gray-400">Target Staff:</span> <span className="font-semibold text-gray-800">{staff.username}</span> ({staff.fullName})</p>
          <p className="mt-1"><span className="text-gray-400">Email Destination:</span> <span className="font-mono text-gray-700">{staff.email}</span></p>
        </div>
      </div>
    </Modal>
  );
}
