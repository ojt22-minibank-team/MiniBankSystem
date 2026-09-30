import { useState, type FormEvent } from 'react';
import Modal from '../../../components/common/Modal';
import Input from '../../../components/common/Input';
import Button from '../../../components/common/Button';
import { staffApi } from '../../../services/apiClient';
import type { StaffCreateRequest } from '../../../types/api.types';
import type { AxiosError } from 'axios';

interface StaffCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AVAILABLE_ROLES = [
  { id: 1, name: 'ADMIN', description: 'Full system administration and oversight' },
  { id: 2, name: 'TELLER', description: 'Customer service, deposits, and withdrawals' },
  { id: 3, name: 'AUDITOR', description: 'Compliance, reporting, and audit log inspection' },
];

export default function StaffCreateModal({
  isOpen,
  onClose,
  onSuccess,
}: StaffCreateModalProps) {
  const [formData, setFormData] = useState<StaffCreateRequest>({
    staffNo: '',
    username: '',
    fullName: '',
    email: '',
    phone: '',
    password: '',
    roleId: 2, // Default: TELLER
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const resetForm = () => {
    setFormData({
      staffNo: '',
      username: '',
      fullName: '',
      email: '',
      phone: '',
      password: '',
      roleId: 2,
    });
    setErrors({});
    setApiError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!formData.staffNo.trim()) errs.staffNo = 'Staff number is required.';
    if (!formData.username.trim()) errs.username = 'Username is required.';
    if (!formData.fullName.trim()) errs.fullName = 'Full name is required.';
    if (!formData.email.trim()) {
      errs.email = 'Email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errs.email = 'Please enter a valid email address.';
    }
    if (!formData.phone.trim()) errs.phone = 'Phone number is required.';
    if (!formData.password) {
      errs.password = 'Initial password is required.';
    } else if (formData.password.length < 6) {
      errs.password = 'Password must be at least 6 characters.';
    }
    if (!formData.roleId) errs.roleId = 'Role selection is required.';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setApiError(null);

    try {
      await staffApi.create({
        staffNo: formData.staffNo.trim(),
        username: formData.username.trim(),
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        password: formData.password,
        roleId: Number(formData.roleId),
      });

      resetForm();
      onSuccess();
      onClose();
    } catch (err) {
      const error = err as AxiosError<{ message?: string }>;
      if (error.response?.data?.message) {
        setApiError(error.response.data.message);
      } else if (error.response?.status === 403) {
        setApiError('Access denied. Administrator privileges required.');
      } else {
        setApiError('Failed to create staff account. Please check the inputs.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create New Staff Account"
      size="lg"
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
            variant="primary"
            size="md"
            isLoading={isLoading}
            onClick={handleSubmit}
          >
            Create Staff
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {apiError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 flex items-start gap-2">
            <svg className="h-5 w-5 text-red-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span>{apiError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Staff No."
            placeholder="e.g. STF-0010"
            value={formData.staffNo}
            onChange={(e) => {
              setFormData({ ...formData, staffNo: e.target.value });
              if (errors.staffNo) setErrors({ ...errors, staffNo: '' });
            }}
            error={errors.staffNo}
            disabled={isLoading}
            required
          />

          <Input
            label="Username"
            placeholder="e.g. jdoe"
            value={formData.username}
            onChange={(e) => {
              setFormData({ ...formData, username: e.target.value });
              if (errors.username) setErrors({ ...errors, username: '' });
            }}
            error={errors.username}
            disabled={isLoading}
            required
          />
        </div>

        <Input
          label="Full Name"
          placeholder="e.g. John Doe"
          value={formData.fullName}
          onChange={(e) => {
            setFormData({ ...formData, fullName: e.target.value });
            if (errors.fullName) setErrors({ ...errors, fullName: '' });
          }}
          error={errors.fullName}
          disabled={isLoading}
          required
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Email Address"
            type="email"
            placeholder="johndoe@bank.com"
            value={formData.email}
            onChange={(e) => {
              setFormData({ ...formData, email: e.target.value });
              if (errors.email) setErrors({ ...errors, email: '' });
            }}
            error={errors.email}
            disabled={isLoading}
            required
          />

          <Input
            label="Phone Number"
            type="tel"
            placeholder="0912345678"
            value={formData.phone}
            onChange={(e) => {
              setFormData({ ...formData, phone: e.target.value });
              if (errors.phone) setErrors({ ...errors, phone: '' });
            }}
            error={errors.phone}
            disabled={isLoading}
            required
          />
        </div>

        <Input
          label="Temporary Password"
          type="password"
          placeholder="Minimum 6 characters"
          value={formData.password}
          onChange={(e) => {
            setFormData({ ...formData, password: e.target.value });
            if (errors.password) setErrors({ ...errors, password: '' });
          }}
          error={errors.password}
          showPasswordToggle
          disabled={isLoading}
          required
        />

        <div className="flex flex-col gap-1">
          <label htmlFor="staff-role" className="text-sm font-medium text-gray-700">
            Initial Role
          </label>
          <select
            id="staff-role"
            value={formData.roleId}
            onChange={(e) => setFormData({ ...formData, roleId: Number(e.target.value) })}
            disabled={isLoading}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {AVAILABLE_ROLES.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name} — {role.description}
              </option>
            ))}
          </select>
          {errors.roleId && (
            <p className="text-xs text-red-600">{errors.roleId}</p>
          )}
        </div>
      </form>
    </Modal>
  );
}
