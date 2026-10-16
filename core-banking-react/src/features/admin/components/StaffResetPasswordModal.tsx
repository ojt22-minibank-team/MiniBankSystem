import { useState } from 'react';
import Modal from '../../../components/common/Modal';
import Button from '../../../components/common/Button';
import { staffApi } from '../../../services/apiClient';
import type { StaffResponse } from '../../../types/api.types';
import type { AxiosError } from 'axios';

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
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const handleClose = () => {
    setApiError(null);
    onClose();
  };

  const handleConfirm = async () => {
    if (!staff) return;

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

  if (!staff) return null;

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

        <p className="text-sm text-gray-600">
          Are you sure you want to send a password reset / initial setup link to{' '}
          <strong className="text-gray-900 font-semibold">{staff.fullName || staff.username}</strong> at{' '}
          <span className="font-mono text-blue-600">{staff.email}</span>?
        </p>

        <p className="text-xs text-gray-500">
          The staff member will receive an email containing a link to set their password.
        </p>
      </div>
    </Modal>
  );
}
