import { useState, useEffect, type FormEvent } from 'react';
import Modal from '../../../components/common/Modal';
import Input from '../../../components/common/Input';
import Button from '../../../components/common/Button';
import { systemRulesApi } from '../../../services/apiClient';
import type { SystemParameterResponse, SystemParameterUpdateRequest } from '../../../types/api.types';
import type { AxiosError } from 'axios';

interface ParameterEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  parameter: SystemParameterResponse | null;
  onSuccess: () => void;
}

export default function ParameterEditModal({
  isOpen,
  onClose,
  parameter,
  onSuccess,
}: ParameterEditModalProps) {
  const [formData, setFormData] = useState<SystemParameterUpdateRequest>({
    parameterValue: '',
    description: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (parameter) {
      setFormData({
        parameterValue: parameter.parameterValue || '',
        description: parameter.description || '',
      });
      setErrors({});
      setApiError(null);
    }
  }, [parameter]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
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
    if (!parameter || !validate()) return;

    setIsLoading(true);
    setApiError(null);

    try {
      await systemRulesApi.updateParameter(parameter.parameterKey, {
        parameterValue: formData.parameterValue.trim(),
        description: formData.description?.trim() || undefined,
      });

      onSuccess();
      onClose();
    } catch (err) {
      const error = err as AxiosError<{ message?: string }>;
      if (error.response?.data?.message) {
        setApiError(error.response.data.message);
      } else {
        setApiError('Failed to update system parameter.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!parameter) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit System Parameter"
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
            Save Parameter
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

        <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs">
          <span className="text-gray-500 font-medium block">Parameter Key:</span>
          <span className="font-mono font-bold text-gray-800 text-sm">{parameter.parameterKey}</span>
        </div>

        <Input
          label="Parameter Value"
          placeholder="New parameter value"
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
          <label htmlFor="edit-param-desc" className="text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            id="edit-param-desc"
            placeholder="Description of this parameter..."
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
