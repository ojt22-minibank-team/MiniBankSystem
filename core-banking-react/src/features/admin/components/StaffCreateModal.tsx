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
  { id: 1, name: 'ADMIN', description: 'Full system administration, security and rules oversight' },
  { id: 2, name: 'TELLER', description: 'Customer onboarding, accounts management, and transfers' },
  { id: 3, name: 'AUDITOR', description: 'Read-only compliance, reporting, and audit log inspection' },
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
        roleId: Number(formData.roleId),
      });

      resetForm();
      onSuccess();
      onClose();
    } catch (err) {
      const error = err as AxiosError<{ message?: string }>;
      if (error.response?.data?.message) {
        setApiError(error.response.data.message);
      } else if (error.response?.status === 409) {
        setApiError('A staff member with this username, staff number, or email already exists.');
      } else {
        setApiError('Failed to create staff account. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create New Staff Member"
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
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {apiError}
          </div>
        )}

        {/* Security / Password Notice */}
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-800">
          <p className="font-semibold">Automated Credential Setup</p>
          <p className="mt-0.5">
            Upon creation, the Core Banking backend will generate an invitation setup link and send it to the staff member's email address. They will set their initial password securely via the setup link.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Staff Number / ID"
            placeholder="e.g. STF-00124"
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
            placeholder="e.g. john.doe"
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
            placeholder="e.g. jdoe@corebank.internal"
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
            placeholder="e.g. +1 555-0199"
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

        {/* Role Selection */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Initial System Role <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            {AVAILABLE_ROLES.map((r) => (
              <label
                key={r.id}
                className={[
                  'flex flex-col rounded-lg border p-3 cursor-pointer transition-colors',
                  formData.roleId === r.id
                    ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500'
                    : 'border-gray-200 hover:bg-gray-50',
                ].join(' ')}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="roleId"
                    value={r.id}
                    checked={formData.roleId === r.id}
                    onChange={() => setFormData({ ...formData, roleId: r.id })}
                    className="text-blue-600 focus:ring-blue-500"
                    disabled={isLoading}
                  />
                  <span className="text-sm font-semibold text-gray-900">{r.name}</span>
                </div>
                <p className="mt-1 text-xs text-gray-500 leading-normal">{r.description}</p>
              </label>
            ))}
          </div>
          {errors.roleId && (
            <p className="text-xs text-red-500 mt-1">{errors.roleId}</p>
          )}
        </div>
      </form>
    </Modal>
  );
}
