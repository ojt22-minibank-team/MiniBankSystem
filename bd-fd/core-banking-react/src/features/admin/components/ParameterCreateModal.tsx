import { useState, type FormEvent } from 'react';
import Modal from '../../../components/common/Modal';
import Input from '../../../components/common/Input';
import Button from '../../../components/common/Button';
import { systemRulesApi } from '../../../services/apiClient';
import type { SystemParameterCreateRequest } from '../../../types/api.types';
import type { AxiosError } from 'axios';

interface ParameterCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ParameterCreateModal({
  isOpen,
  onClose,
  onSuccess,
}: ParameterCreateModalProps) {
  const [formData, setFormData] = useState<SystemParameterCreateRequest>({
    parameterKey: '',
    parameterValue: '',
    description: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const resetForm = () => {
    setFormData({
      parameterKey: '',
      parameterValue: '',
      description: '',
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
    if (!formData.parameterKey.trim()) {
      errs.parameterKey = 'Parameter key is required.';
    } else if (formData.parameterKey.trim().length > 64) {
      errs.parameterKey = 'Parameter key must not exceed 64 characters.';
    }

    if (!formData.parameterValue.trim()) {
      errs.parameterValue = 'Parameter value is required.';
    } else if (formData.parameterValue.trim().length > 255) {
      errs.parameterValue = 'Parameter value must not exceed 255 characters.';
    }

    if (formData.description && formData.description.length > 255) {
      errs.description = 'Description must not exceed 255 characters.';
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
      await systemRulesApi.createParameter({
        parameterKey: formData.parameterKey.trim(),
        parameterValue: formData.parameterValue.trim(),
        description: formData.description?.trim() || undefined,
      });

      resetForm();
      onSuccess();
      onClose();
    } catch (err) {
      const error = err as AxiosError<{ message?: string }>;
      if (error.response?.data?.message) {
        setApiError(error.response.data.message);
      } else {
        setApiError('Failed to create system parameter.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create System Parameter"
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
            variant="primary"
            size="md"
            isLoading={isLoading}
            onClick={handleSubmit}
          >
            Create Parameter
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

        <Input
          label="Parameter Key"
          placeholder="e.g. AUTH_MAX_FAILED_ATTEMPTS"
          value={formData.parameterKey}
          onChange={(e) => {
            setFormData({ ...formData, parameterKey: e.target.value });
            if (errors.parameterKey) setErrors({ ...errors, parameterKey: '' });
          }}
          error={errors.parameterKey}
          disabled={isLoading}
          required
        />

        <Input
          label="Parameter Value"
          placeholder="e.g. 5"
          value={formData.parameterValue}
          onChange={(e) => {
            setFormData({ ...formData, parameterValue: e.target.value });
            if (errors.parameterValue) setErrors({ ...errors, parameterValue: '' });
          }}
          error={errors.parameterValue}
          disabled={isLoading}
          required
        />

        <div className="flex flex-col gap-1">
          <label htmlFor="param-description" className="text-sm font-medium text-gray-700">
            Description (Optional)
          </label>
          <textarea
            id="param-description"
            placeholder="Explain the purpose of this parameter..."
            value={formData.description || ''}
            onChange={(e) => {
              setFormData({ ...formData, description: e.target.value });
              if (errors.description) setErrors({ ...errors, description: '' });
            }}
            rows={3}
            disabled={isLoading}
            className="w-full rounded-lg border border-gray-300 p-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.description && (
            <p className="text-xs text-red-600">{errors.description}</p>
          )}
        </div>
      </form>
    </Modal>
  );
}
