import { useState, useEffect, type FormEvent } from 'react';
import Modal from '../../../components/common/Modal';
import Button from '../../../components/common/Button';
import Input from '../../../components/common/Input';
import { customersApi } from '../../../services/apiClient';
import type {
  CustomerResponse,
  CustomerDetailResponse,
  CustomerUpdateDTO,
} from '../../../types/api.types';
import type { AxiosError } from 'axios';

export interface CustomerEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: CustomerResponse | CustomerDetailResponse | null;
  onSuccess?: () => void;
}

export default function CustomerEditModal({
  isOpen,
  onClose,
  customer,
  onSuccess,
}: CustomerEditModalProps) {
  // --- Form Editable State ---
  const [phone, setPhone] = useState('');
  const [occupation, setOccupation] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');

  // --- Protected Fields State ---
  const [customerCode, setCustomerCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [nrc, setNrc] = useState('');

  // --- Status & Feedback State ---
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toastMessage, setToastMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Maximum allowed date for DOB (yesterday to enforce strictly in the past)
  const todayStr = new Date().toISOString().split('T')[0];



  const isCompany = (customer?.customerType || '').toUpperCase() === 'COMPANY';

  // Populate data when modal opens or customer changes
  useEffect(() => {
    if (!isOpen || !customer) {
      setPhone('');
      setOccupation('');
      setDateOfBirth('');
      setCustomerCode('');
      setFullName('');
      setNrc('');
      setErrors({});
      setToastMessage(null);
      return;
    }

    setCustomerCode(customer.customerCode || '');
    setFullName(customer.fullName || '');
    setPhone(customer.phone || '');

    // Check if full detail fields (NRC, occupation, DOB) are present on the passed object
    const detail = customer as CustomerDetailResponse;
    if (detail.nrc !== undefined || detail.occupation !== undefined || detail.dateOfBirth !== undefined) {
      setNrc(detail.registrationNumber || detail.taxId || detail.nrc || 'N/A');
      setOccupation(detail.occupation || '');
      setDateOfBirth(detail.dateOfBirth || '');
    } else {
      // If only shallow CustomerResponse is passed, fetch complete profile details asynchronously
      setIsLoadingDetails(true);
      customersApi
        .getByCode(customer.customerCode)
        .then((res) => {
          const data = res.data;
          setNrc(data.registrationNumber || data.taxId || data.nrc || 'N/A');
          setOccupation(data.occupation || '');
          setDateOfBirth(data.dateOfBirth || '');
          if (data.phone) setPhone(data.phone);
          if (data.fullName) setFullName(data.fullName);
        })
        .catch((err) => {
          console.warn('Could not fetch full customer profile detail:', err);
          setNrc('N/A');
        })
        .finally(() => {
          setIsLoadingDetails(false);
        });
    }
  }, [isOpen, customer]);

  const clearError = (field: string) => {
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // --- Strict Validation ---
  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    // 1. Phone number validation (5 to 20 digits, optional leading +)
    const phoneRegex = /^\+?[0-9]{5,20}$/;
    const trimmedPhone = phone.trim();
    if (!trimmedPhone) {
      errs.phone = 'Phone number is required.';
    } else if (!phoneRegex.test(trimmedPhone)) {
      errs.phone = 'Phone number must be between 5 and 20 digits (e.g. +95912345678 or 0912345678).';
    }

    // 2. Occupation validation (max 100 chars)
    if (occupation.length > 100) {
      errs.occupation = 'Occupation must not exceed 100 characters.';
    }

    // 3. Date of Birth validation (strictly in the past)
    if (dateOfBirth) {
      const selectedDate = new Date(dateOfBirth);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (isNaN(selectedDate.getTime())) {
        errs.dateOfBirth = 'Please enter a valid date of birth.';
      } else if (selectedDate >= today) {
        errs.dateOfBirth = 'Date of birth must be a date in the past.';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // --- Form Submission ---
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setToastMessage(null);

    if (!validate()) {
      return;
    }

    if (!customerCode) {
      setToastMessage({ type: 'error', text: 'Missing customer reference identifier.' });
      return;
    }

    setIsSubmitting(true);

    try {
      
      const payload: CustomerUpdateDTO = {
        phone: phone.trim(),
        occupation: (!isCompany && occupation.trim()) ? occupation.trim() : undefined,
        dateOfBirth: (!isCompany && dateOfBirth) ? dateOfBirth : undefined,
      };

      // Execute PUT request via apiClient with fallback bearer token header injection
      await customersApi.update(customerCode, payload);

      setToastMessage({
        type: 'success',
        text: `Customer profile ${customerCode} updated successfully.`,
      });

      // Notify parent component to refresh list
      if (onSuccess) {
        onSuccess();
      }

      // Close modal gracefully after brief user acknowledgment
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: unknown) {
      const axiosErr = err as AxiosError<{ message?: string; errors?: Record<string, string> }>;
      const serverMessage =
        axiosErr.response?.data?.message ||
        (axiosErr.response?.status === 403
          ? 'Permission denied: Staff TELLER or ADMIN role required.'
          : axiosErr.response?.status === 404
          ? 'Customer record not found.'
          : 'Failed to update customer profile. Please try again.');

      setToastMessage({ type: 'error', text: serverMessage });

      // If backend returned field validation errors
      if (axiosErr.response?.data?.errors) {
        setErrors((prev) => ({
          ...prev,
          ...axiosErr.response!.data!.errors,
        }));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Update Customer Profile: ${customerCode || 'Loading...'}`}
      size="lg"
      footer={
        <div className="flex w-full items-center justify-between">
          <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
            Core Banking KYC & PII Governance
          </p>
          <div className="flex items-center gap-3 ml-auto">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="customer-edit-form"
              variant="primary"
              isLoading={isSubmitting}
              disabled={isLoadingDetails}
            >
              Save Changes
            </Button>
          </div>
        </div>
      }
    >
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div
          role="alert"
          className={`mb-5 flex items-center gap-2.5 rounded-xl p-3.5 text-xs font-medium transition-all ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <svg className="h-4 w-4 shrink-0 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="h-4 w-4 shrink-0 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Loading overlay if fetching deep details */}
      {isLoadingDetails ? (
        <div className="flex flex-col items-center justify-center py-10 gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-sky-500/20 border-t-sky-600" />
          <span className="text-xs text-slate-500 font-medium">Loading customer profile...</span>
        </div>
      ) : (
        <form id="customer-edit-form" onSubmit={handleSubmit} className="space-y-6">
          {/* Section: Protected Immutable Fields */}
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-md bg-slate-200 text-slate-600">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </span>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Protected System Identifiers (Read-Only)
                </h3>
              </div>
              <span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                KYC Locked
              </span>
            </div>

            <p className="text-[11px] text-slate-500">
              In compliance with banking regulations, Customer ID, Legal Name, and NRC / Registration numbers are immutable and can only be altered via supervisory re-KYC workflows.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
              {/* Customer Code */}
              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                  Customer Code
                </label>
                <div className="px-3 py-2 rounded-xl bg-slate-200/60 border border-slate-300/80 text-xs font-mono font-bold text-slate-700 select-all cursor-not-allowed">
                  {customerCode || '—'}
                </div>
              </div>

              {/* Full Legal Name */}
              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                  Full Legal Name
                </label>
                <div className="px-3 py-2 rounded-xl bg-slate-200/60 border border-slate-300/80 text-xs font-bold text-slate-700 truncate cursor-not-allowed" title={fullName}>
                  {fullName || '—'}
                </div>
              </div>

              {/* NRC / Registration */}
              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                  {isCompany ? 'Registration / Tax ID' : 'NRC / Reg Number'}
                </label>
                <div className="px-3 py-2 rounded-xl bg-slate-200/60 border border-slate-300/80 text-xs font-mono font-semibold text-slate-700 truncate cursor-not-allowed" title={nrc}>
                  {nrc || '—'}
                </div>
              </div>
            </div>
          </div>

          {/* Section: Editable Profile Fields */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-sky-100 text-sky-600">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </span>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Editable Profile Information
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Phone Number */}
              <div className="sm:col-span-2">
                <Input
                  label="Phone Number *"
                  id="edit-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    clearError('phone');
                  }}
                  placeholder="+95912345678 or 0912345678"
                  error={errors.phone}
                  required
                  leadingIcon={
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  }
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  Standard format with 5 to 20 numeric digits (optional country code).
                </p>
              </div>

              {!isCompany ? (
                <>
                  {/* Occupation */}
                  <div>
                    <Input
                      label="Occupation"
                      id="edit-occupation"
                      type="text"
                      value={occupation}
                      onChange={(e) => {
                        setOccupation(e.target.value);
                        clearError('occupation');
                      }}
                      placeholder="e.g. Software Engineer, Merchant"
                      error={errors.occupation}
                      maxLength={100}
                      leadingIcon={
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      }
                    />
                    <p className="mt-1 text-[11px] text-slate-400">
                      Maximum 100 characters.
                    </p>
                  </div>

                  {/* Date of Birth */}
                  <div>
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="edit-dob" className="text-xs font-semibold text-slate-700 tracking-wide">
                        Date of Birth
                      </label>
                      <div className="relative flex items-center">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <input
                          id="edit-dob"
                          type="date"
                          max={todayStr}
                          value={dateOfBirth}
                          onChange={(e) => {
                            setDateOfBirth(e.target.value);
                            clearError('dateOfBirth');
                          }}
                          className={`w-full rounded-xl border pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-sky-100 focus:border-sky-500 transition-all duration-150 shadow-xs ${
                            errors.dateOfBirth
                              ? 'border-rose-400 bg-rose-50/30 focus:ring-rose-100 focus:border-rose-500'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        />
                      </div>
                      {errors.dateOfBirth ? (
                        <p className="text-xs text-rose-600 font-medium">{errors.dateOfBirth}</p>
                      ) : (
                        <p className="text-[11px] text-slate-400">
                          Must be a valid past date.
                        </p>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="sm:col-span-2 rounded-xl bg-amber-50/70 border border-amber-200/80 p-3 text-xs text-amber-800">
                  <span className="font-semibold">Corporate Profile Notice:</span> Registration number, tax ID, and corporate legal structure are governed under corporate account compliance. Phone number remains editable for operational contact.
                </div>
              )}
            </div>
          </div>
        </form>
      )}
    </Modal>
  );
}
