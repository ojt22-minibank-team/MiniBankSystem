import { useState, type FormEvent } from 'react';
import Modal from '../../../components/common/Modal';
import Input from '../../../components/common/Input';
import Button from '../../../components/common/Button';
import { staffProfileApi } from '../../../services/apiClient';
import type { AxiosError } from 'axios';

interface StaffChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export default function StaffChangePasswordModal({
  isOpen,
  onClose,
  onSuccess,
}: StaffChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const resetForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setErrors({});
    setApiError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!currentPassword) {
      errs.currentPassword = 'Current password is required.';
    }
    if (!newPassword) {
      errs.newPassword = 'New password is required.';
    } else if (newPassword.length < 8) {
      errs.newPassword = 'New password must be at least 8 characters long.';
    }
    if (!confirmPassword) {
      errs.confirmPassword = 'Confirmation password is required.';
    } else if (newPassword !== confirmPassword) {
      errs.confirmPassword = 'Passwords do not match.';
    } else if (currentPassword && currentPassword === newPassword) {
      errs.newPassword = 'New password cannot be the same as current password.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setApiError(null);

    try {
      const res = await staffProfileApi.changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });
      handleClose();
      onSuccess(res.data.message || 'Password changed successfully.');
    } catch (err) {
      const error = err as AxiosError<{ message?: string }>;
      setApiError(error.response?.data?.message || 'Failed to change password. Please verify current password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Change Account Password"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {apiError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            {apiError}
          </div>
        )}

        <div className="rounded-xl bg-purple-50/70 border border-purple-100 p-3 text-xs text-purple-900">
          <p className="font-semibold">Security Requirement</p>
          <p className="mt-0.5 text-purple-700">
            New password must be at least 8 characters. Changing your password updates your credentials immediately.
          </p>
        </div>

        <div>
          <Input
            label="Current Password"
            type="password"
            value={currentPassword}
            onChange={(e) => {
              setCurrentPassword(e.target.value);
              if (errors.currentPassword) setErrors({ ...errors, currentPassword: '' });
            }}
            placeholder="Enter your current password"
            error={errors.currentPassword}
            required
          />
        </div>

        <div>
          <Input
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value);
              if (errors.newPassword) setErrors({ ...errors, newPassword: '' });
            }}
            placeholder="Enter minimum 8 characters"
            error={errors.newPassword}
            required
          />
        </div>

        <div>
          <Input
            label="Confirm New Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: '' });
            }}
            placeholder="Re-enter new password"
            error={errors.confirmPassword}
            required
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
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
            type="submit"
            variant="primary"
            size="md"
            isLoading={isLoading}
          >
            Update Password
          </Button>
        </div>
      </form>
    </Modal>
  );
}
