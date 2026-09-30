import { useState, type FormEvent } from 'react';
import Modal from '../../../components/common/Modal';
import Input from '../../../components/common/Input';
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
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{ newPassword?: string; confirmPassword?: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const handleClose = () => {
    setNewPassword('');
    setConfirmPassword('');
    setErrors({});
    setApiError(null);
    onClose();
  };

  const validate = (): boolean => {
    const errs: { newPassword?: string; confirmPassword?: string } = {};
    if (!newPassword) {
      errs.newPassword = 'New password is required.';
    } else if (newPassword.length < 6) {
      errs.newPassword = 'Password must be at least 6 characters.';
    }

    if (!confirmPassword) {
      errs.confirmPassword = 'Confirmation password is required.';
    } else if (newPassword !== confirmPassword) {
      errs.confirmPassword = 'Passwords do not match.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!staff || !validate()) return;

    setIsLoading(true);
    setApiError(null);

    try {
      await staffApi.resetPassword(staff.staffId, { newPassword });
      handleClose();
      onSuccess();
    } catch (err) {
      const error = err as AxiosError<{ message?: string }>;
      if (error.response?.data?.message) {
        setApiError(error.response.data.message);
      } else {
        setApiError('Failed to reset password. Staff may be deactivated.');
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
      title={`Reset Password for ${staff.fullName || staff.username}`}
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
            onClick={handleSubmit}
          >
            Reset Password
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

        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
          <p className="font-semibold">Security Action</p>
          <p className="mt-0.5">
            Resetting the password will invalidate all existing sessions and force the staff member to change their password on next login.
          </p>
        </div>

        <Input
          label="New Password"
          type="password"
          placeholder="Enter new temporary password"
          value={newPassword}
          onChange={(e) => {
            setNewPassword(e.target.value);
            if (errors.newPassword) setErrors({ ...errors, newPassword: '' });
          }}
          error={errors.newPassword}
          showPasswordToggle
          disabled={isLoading}
          required
        />

        <Input
          label="Confirm New Password"
          type="password"
          placeholder="Re-enter new password"
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: '' });
          }}
          error={errors.confirmPassword}
          showPasswordToggle
          disabled={isLoading}
          required
        />
      </form>
    </Modal>
  );
}
