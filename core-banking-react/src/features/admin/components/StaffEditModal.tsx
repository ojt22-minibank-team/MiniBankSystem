import { useState, useEffect, type FormEvent } from 'react';
import Modal from '../../../components/common/Modal';
import Input from '../../../components/common/Input';
import Button from '../../../components/common/Button';
import { staffApi } from '../../../services/apiClient';
import type { StaffResponse, StaffUpdateRequest } from '../../../types/api.types';
import type { AxiosError } from 'axios';
import { useAuth } from '../../auth/hooks/useAuth';

interface StaffEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff: StaffResponse | null;
  onSuccess: () => void;
}

export default function StaffEditModal({
  isOpen,
  onClose,
  staff,
  onSuccess,
}: StaffEditModalProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState<StaffUpdateRequest>({
    fullName: '',
    email: '',
    phone: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (staff) {
      setFormData({
        fullName: staff.fullName || '',
        email: staff.email || '',
        phone: staff.phone || '',
      });
      setErrors({});
      setApiError(null);
    }
  }, [staff]);

  if (!staff) return null;

  const currentUsername = user?.username?.trim().toLowerCase();
  const targetUsername = staff.username?.trim().toLowerCase();
  const isSelf = !!currentUsername && !!targetUsername && currentUsername === targetUsername;

  const roleCode = (staff.roleCode || (staff.staffNo.includes('TLR') ? 'TELLER' : staff.staffNo.includes('AUD') ? 'AUDITOR' : staff.staffNo.includes('ADM') ? 'ADMIN' : 'STAFF')).toUpperCase();
  const isTargetAdmin = roleCode === 'ADMIN';
  const isOtherAdmin = isTargetAdmin && !isSelf;

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!formData.fullName.trim()) errs.fullName = 'Full name is required.';

    // Email validation
    const emailVal = formData.email.trim();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailVal) {
      errs.email = 'Email is required.';
    } else if (!emailRegex.test(emailVal)) {
      errs.email = 'Please enter a valid email address (e.g. user@domain.com).';
    }

    // Phone validation (must be at least 11 digits)
    const rawPhone = formData.phone.trim();
    if (!rawPhone) {
      errs.phone = 'Phone number is required.';
    } else {
      const cleanPhone = rawPhone.replace(/[\s-]/g, '');
      const normalized = cleanPhone.startsWith('+959')
        ? '09' + cleanPhone.slice(4)
        : cleanPhone.startsWith('959')
        ? '09' + cleanPhone.slice(3)
        : cleanPhone;

      const digitsOnly = normalized.replace(/\D/g, '');
      if (digitsOnly.length < 11) {
        errs.phone = 'Phone number must be at least 11 digits (e.g. 09xxxxxxxxx).';
      } else if (!/^09\d{9}$/.test(normalized)) {
        errs.phone = 'Please enter a valid 11-digit Myanmar phone number starting with 09 (e.g. 09xxxxxxxxx).';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isOtherAdmin) {
      setApiError('Administrators cannot edit the information of other administrators.');
      return;
    }
    if (!validate()) return;

    setIsLoading(true);
    setApiError(null);

    try {
      await staffApi.update(staff.staffId, {
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
      });

      onSuccess();
      onClose();
    } catch (err) {
      const error = err as AxiosError<{ message?: string }>;
      if (error.response?.data?.message) {
        setApiError(error.response.data.message);
      } else {
        setApiError('Failed to update staff information.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Staff: ${staff.username}`}
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
            disabled={isOtherAdmin}
            onClick={handleSubmit}
          >
            Save Changes
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

        {isOtherAdmin && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            <strong>Restricted:</strong> Administrators cannot edit the profile information of other administrators.
          </div>
        )}

        <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-500 flex justify-between">
          <span>Username: <strong className="text-gray-700">{staff.username}</strong></span>
          <span>Staff No: <strong className="text-gray-700">{staff.staffNo}</strong></span>
        </div>

        <Input
          label="Full Name"
          value={formData.fullName}
          onChange={(e) => {
            setFormData({ ...formData, fullName: e.target.value });
            if (errors.fullName) setErrors({ ...errors, fullName: '' });
          }}
          error={errors.fullName}
          disabled={isLoading || isOtherAdmin}
          required
        />

        <Input
          label="Email Address"
          type="email"
          value={formData.email}
          onChange={(e) => {
            setFormData({ ...formData, email: e.target.value });
            if (errors.email) setErrors({ ...errors, email: '' });
          }}
          error={errors.email}
          disabled={isLoading || isOtherAdmin}
          required
        />

        <Input
          label="Phone Number"
          type="tel"
          placeholder="e.g. 09123456789"
          value={formData.phone}
          onChange={(e) => {
            setFormData({ ...formData, phone: e.target.value });
            if (errors.phone) setErrors({ ...errors, phone: '' });
          }}
          error={errors.phone}
          disabled={isLoading || isOtherAdmin}
          required
        />
      </form>
    </Modal>
  );
}
