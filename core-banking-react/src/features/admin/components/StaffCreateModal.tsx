import { useState, useEffect, type FormEvent } from 'react';
import Modal from '../../../components/common/Modal';
import Input from '../../../components/common/Input';
import Button from '../../../components/common/Button';
import { staffApi } from '../../../services/apiClient';
import type { StaffCreateRequest, StaffRoleOption } from '../../../types/api.types';
import type { AxiosError } from 'axios';

interface StaffCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface DisplayRole {
  id: number;
  code: string;
  name: string;
  description: string;
}

const FALLBACK_ROLES: DisplayRole[] = [
  { id: 2, code: 'TELLER', name: 'Teller', description: 'Customer onboarding, accounts management, and counter transfers' },
  { id: 4, code: 'AUDITOR', name: 'Auditor', description: 'Read-only compliance, reporting, and audit log inspection' },
];

export default function StaffCreateModal({
  isOpen,
  onClose,
  onSuccess,
}: StaffCreateModalProps) {
  const [availableRoles, setAvailableRoles] = useState<DisplayRole[]>(FALLBACK_ROLES);
  const [formData, setFormData] = useState<StaffCreateRequest>({
    username: '',
    fullName: '',
    email: '',
    phone: '',
    roleId: 2, // Default: TELLER
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Fetch roles from backend to get accurate role IDs and ensure only TELLER and AUDITOR are permitted
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
            return code === 'TELLER' || code === 'AUDITOR';
          })
          .map((r: StaffRoleOption) => ({
            id: r.roleId,
            code: r.roleCode.toUpperCase(),
            name: r.roleName || (r.roleCode === 'TELLER' ? 'Teller' : 'Auditor'),
            description:
              r.description ||
              (r.roleCode === 'TELLER'
                ? 'Customer onboarding, accounts management, and counter transfers'
                : 'Read-only compliance, reporting, and audit log inspection'),
          }));

        if (permitted.length > 0) {
          setAvailableRoles(permitted);
          // Ensure selected roleId matches one of the permitted roles
          setFormData((prev) => ({
            ...prev,
            roleId: permitted[0].id,
          }));
        }
      })
      .catch(() => {
        // Fallback to defaults if roles endpoint is unavailable
        setAvailableRoles(FALLBACK_ROLES);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  const resetForm = () => {
    setFormData({
      username: '',
      fullName: '',
      email: '',
      phone: '',
      roleId: availableRoles[0]?.id || 2,
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
      // Staff No is auto-generated on backend upon creation
      await staffApi.create({
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
        setApiError('A staff member with this username or email already exists.');
      } else {
        setApiError('Failed to create staff account. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const selectedRole = availableRoles.find((r) => r.id === formData.roleId);

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
          {/* Auto-generated Staff Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Staff Number / ID
            </label>
            <div className="mt-1 flex items-center justify-between rounded-lg border border-dashed border-blue-300 bg-blue-50/60 px-3 py-2">
              <span className="font-mono text-xs font-semibold text-blue-800">
                {selectedRole?.code === 'AUDITOR' ? 'STF-AUD-XXXX' : 'STF-TLR-XXXX'}
              </span>
              <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                Auto-generated
              </span>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Staff No. is automatically generated based on the selected role.
            </p>
          </div>

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

        {/* Role Selection: Restricted to Teller and Auditor only */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700">
              Initial System Role <span className="text-red-500">*</span>
            </label>
            <span className="text-xs text-gray-400">
              New staff can only be created as Teller or Auditor
            </span>
          </div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {availableRoles.map((r) => (
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
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-mono font-medium text-gray-600">
                    {r.code}
                  </span>
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
