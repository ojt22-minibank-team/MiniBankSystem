import { useState, type FormEvent } from 'react';
import Modal from '../../../components/common/Modal';
import Input from '../../../components/common/Input';
import Button from '../../../components/common/Button';
import { systemRulesApi } from '../../../services/apiClient';
import type {
  FeeScheduleCreateRequest,
  TransactionType,
  FeeType,
} from '../../../types/api.types';
import type { AxiosError } from 'axios';

interface FeeScheduleCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const TRANSACTION_TYPES: { value: TransactionType; label: string }[] = [
  { value: 'INTERNAL_TRANSFER', label: 'Internal Transfer (P2P)' },
  { value: 'OTC_DEPOSIT', label: 'Over-The-Counter Deposit' },
  { value: 'OTC_WITHDRAWAL', label: 'Over-The-Counter Withdrawal' },
  { value: 'EXTERNAL_PAYMENT', label: 'External Payment / Gateway' },
  { value: 'LEDGER_ADJUSTMENT', label: 'Ledger Adjustment' },
  { value: 'REFUND', label: 'Refund Transaction' },
];

export default function FeeScheduleCreateModal({
  isOpen,
  onClose,
  onSuccess,
}: FeeScheduleCreateModalProps) {
  const [formData, setFormData] = useState<{
    feeCode: string;
    transactionType: TransactionType;
    feeType: FeeType;
    feeValue: string;
    minimumFee: string;
    maximumFee: string;
    currency: string;
    activeFrom: string;
    activeUntil: string;
  }>({
    feeCode: '',
    transactionType: 'INTERNAL_TRANSFER',
    feeType: 'FLAT',
    feeValue: '',
    minimumFee: '',
    maximumFee: '',
    currency: 'USD',
    activeFrom: new Date().toISOString().slice(0, 16),
    activeUntil: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const resetForm = () => {
    setFormData({
      feeCode: '',
      transactionType: 'INTERNAL_TRANSFER',
      feeType: 'FLAT',
      feeValue: '',
      minimumFee: '',
      maximumFee: '',
      currency: 'USD',
      activeFrom: new Date().toISOString().slice(0, 16),
      activeUntil: '',
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
    if (!formData.feeCode.trim()) {
      errs.feeCode = 'Fee code is required.';
    } else if (formData.feeCode.trim().length > 32) {
      errs.feeCode = 'Fee code must not exceed 32 characters.';
    }

    if (!formData.feeValue) {
      errs.feeValue = 'Fee value is required.';
    } else if (isNaN(Number(formData.feeValue)) || Number(formData.feeValue) < 0) {
      errs.feeValue = 'Fee value must be a non-negative number.';
    }

    if (formData.minimumFee && (isNaN(Number(formData.minimumFee)) || Number(formData.minimumFee) < 0)) {
      errs.minimumFee = 'Minimum fee must be non-negative.';
    }

    if (formData.maximumFee && (isNaN(Number(formData.maximumFee)) || Number(formData.maximumFee) < 0)) {
      errs.maximumFee = 'Maximum fee must be non-negative.';
    }

    if (
      formData.minimumFee &&
      formData.maximumFee &&
      Number(formData.minimumFee) > Number(formData.maximumFee)
    ) {
      errs.maximumFee = 'Maximum fee cannot be less than minimum fee.';
    }

    if (!formData.currency.trim()) {
      errs.currency = 'Currency is required.';
    } else if (formData.currency.trim().length !== 3) {
      errs.currency = 'Currency must be 3 characters (e.g. USD).';
    }

    if (!formData.activeFrom) {
      errs.activeFrom = 'Active from date is required.';
    }

    if (formData.activeUntil && formData.activeFrom) {
      if (new Date(formData.activeUntil) < new Date(formData.activeFrom)) {
        errs.activeUntil = 'Active until date cannot be earlier than active from date.';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setApiError(null);

    const payload: FeeScheduleCreateRequest = {
      feeCode: formData.feeCode.trim().toUpperCase(),
      transactionType: formData.transactionType,
      feeType: formData.feeType,
      feeValue: Number(formData.feeValue),
      minimumFee: formData.minimumFee ? Number(formData.minimumFee) : null,
      maximumFee: formData.maximumFee ? Number(formData.maximumFee) : null,
      currency: formData.currency.trim().toUpperCase(),
      activeFrom: new Date(formData.activeFrom).toISOString(),
      activeUntil: formData.activeUntil ? new Date(formData.activeUntil).toISOString() : null,
    };

    try {
      await systemRulesApi.createFee(payload);
      resetForm();
      onSuccess();
      onClose();
    } catch (err) {
      const error = err as AxiosError<{ message?: string }>;
      if (error.response?.data?.message) {
        setApiError(error.response.data.message);
      } else {
        setApiError('Failed to create fee schedule.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create Fee Schedule"
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
            Create Fee Schedule
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Fee Code"
            placeholder="e.g. FEE_P2P_STD"
            value={formData.feeCode}
            onChange={(e) => {
              setFormData({ ...formData, feeCode: e.target.value.toUpperCase() });
              if (errors.feeCode) setErrors({ ...errors, feeCode: '' });
            }}
            error={errors.feeCode}
            disabled={isLoading}
            required
          />

          <Input
            label="Currency"
            placeholder="e.g. USD"
            value={formData.currency}
            onChange={(e) => {
              setFormData({ ...formData, currency: e.target.value.toUpperCase() });
              if (errors.currency) setErrors({ ...errors, currency: '' });
            }}
            error={errors.currency}
            maxLength={3}
            disabled={isLoading}
            required
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="transaction-type" className="text-sm font-medium text-gray-700">
              Transaction Type
            </label>
            <select
              id="transaction-type"
              value={formData.transactionType}
              onChange={(e) => setFormData({ ...formData, transactionType: e.target.value as TransactionType })}
              disabled={isLoading}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {TRANSACTION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="fee-type" className="text-sm font-medium text-gray-700">
              Fee Type Calculation
            </label>
            <select
              id="fee-type"
              value={formData.feeType}
              onChange={(e) => setFormData({ ...formData, feeType: e.target.value as FeeType })}
              disabled={isLoading}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="FLAT">FLAT (Fixed Amount)</option>
              <option value="PERCENTAGE">PERCENTAGE (Rate %)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Input
            label={formData.feeType === 'PERCENTAGE' ? 'Fee Rate (%)' : 'Fee Amount'}
            type="number"
            step="0.01"
            placeholder={formData.feeType === 'PERCENTAGE' ? 'e.g. 1.5' : 'e.g. 2.00'}
            value={formData.feeValue}
            onChange={(e) => {
              setFormData({ ...formData, feeValue: e.target.value });
              if (errors.feeValue) setErrors({ ...errors, feeValue: '' });
            }}
            error={errors.feeValue}
            disabled={isLoading}
            required
          />

          <Input
            label="Minimum Fee (Optional)"
            type="number"
            step="0.01"
            placeholder="0.00"
            value={formData.minimumFee}
            onChange={(e) => {
              setFormData({ ...formData, minimumFee: e.target.value });
              if (errors.minimumFee) setErrors({ ...errors, minimumFee: '' });
            }}
            error={errors.minimumFee}
            disabled={isLoading}
          />

          <Input
            label="Maximum Fee (Optional)"
            type="number"
            step="0.01"
            placeholder="50.00"
            value={formData.maximumFee}
            onChange={(e) => {
              setFormData({ ...formData, maximumFee: e.target.value });
              if (errors.maximumFee) setErrors({ ...errors, maximumFee: '' });
            }}
            error={errors.maximumFee}
            disabled={isLoading}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Active From"
            type="datetime-local"
            value={formData.activeFrom}
            onChange={(e) => {
              setFormData({ ...formData, activeFrom: e.target.value });
              if (errors.activeFrom) setErrors({ ...errors, activeFrom: '' });
            }}
            error={errors.activeFrom}
            disabled={isLoading}
            required
          />

          <Input
            label="Active Until (Optional)"
            type="datetime-local"
            value={formData.activeUntil}
            onChange={(e) => {
              setFormData({ ...formData, activeUntil: e.target.value });
              if (errors.activeUntil) setErrors({ ...errors, activeUntil: '' });
            }}
            error={errors.activeUntil}
            disabled={isLoading}
          />
        </div>
      </form>
    </Modal>
  );
}
