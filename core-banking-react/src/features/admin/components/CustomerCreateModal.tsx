import { useState, type FormEvent } from 'react';
import Modal from '../../../components/common/Modal';
import Input from '../../../components/common/Input';
import Button from '../../../components/common/Button';
import { customersApi } from '../../../services/apiClient';
import type { CustomerCreateDTO, CustomerCreateResponse } from '../../../types/api.types';
import type { AxiosError } from 'axios';
import { useAuth } from '../../auth/hooks/useAuth';

interface CustomerCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const NRC_PREFIXES = [
  '1/', '2/', '3/', '4/', '5/', '6/', '7/', '8/', '9/', '10/', '11/', '12/', '13/', '14/'
];

export default function CustomerCreateModal({
  isOpen,
  onClose,
  onSuccess,
}: CustomerCreateModalProps) {
  const { isTeller } = useAuth();
  const [customerType, setCustomerType] = useState<'PERSONAL' | 'COMPANY'>('PERSONAL');

  // Personal Fields
  const [fullName, setFullName] = useState('');
  const [nrcPrefix, setNrcPrefix] = useState('12/');
  const [nrcNumber, setNrcNumber] = useState('');
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'OTHER'>('MALE');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [occupation, setOccupation] = useState('');

  // Company Fields
  const [companyName, setCompanyName] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [taxId, setTaxId] = useState('');
  const [businessType, setBusinessType] = useState('');

  // Common Fields
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  // UI State
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [createdCustomer, setCreatedCustomer] = useState<CustomerCreateResponse | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const resetForm = () => {
    setCustomerType('PERSONAL');
    setFullName('');
    setNrcPrefix('12/');
    setNrcNumber('');
    setGender('MALE');
    setDateOfBirth('');
    setOccupation('');
    setCompanyName('');
    setRegistrationNumber('');
    setTaxId('');
    setBusinessType('');
    setEmail('');
    setPhone('');
    setAddress('');
    setErrors({});
    setApiError(null);
    setCreatedCustomer(null);
    setCopiedKey(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const clearError = (field: string) => {
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (customerType === 'PERSONAL') {
      // 1. Full Name
      if (!fullName.trim()) {
        errs.fullName = 'Full name is required';
      }

      // 2. NRC
      if (!nrcNumber.trim()) {
        errs.nrc = 'NRC is required';
      } else {
        const combinedNrc = `${nrcPrefix}${nrcNumber.trim().toUpperCase()}`;
        const nrcRegex = /^[0-9]{1,2}\/[A-Za-z]{3,10}\([A-Za-z]{1,5}\)\d{6}$/;
        if (!nrcRegex.test(combinedNrc)) {
          errs.nrc = 'Format must be e.g. 12/DAGANA(N)123456';
        }
      }

      // 3. Phone (must be exactly 11 digits)
      const personalPhoneDigits = phone.trim().replace(/[\s-]/g, '');
      if (!phone.trim()) {
        errs.phone = 'Phone number is required';
      } else if (!/^\d{11}$/.test(personalPhoneDigits)) {
        errs.phone = 'Phone must be exactly 11 digits';
      }

      // 4. Email
      if (!email.trim()) {
        errs.email = 'Email address is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        errs.email = 'Please enter a valid email address';
      }
    } else {
      // Corporate Validations: Company Name, Registration Number, Tax ID, Official Email, Phone
      if (!companyName.trim()) {
        errs.companyName = 'Company name is required';
      }

      if (!registrationNumber.trim()) {
        errs.registrationNumber = 'Registration number is required';
      }

      if (!taxId.trim()) {
        errs.taxId = 'Tax ID is required';
      }

      if (!email.trim()) {
        errs.email = 'Official email is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        errs.email = 'Please enter a valid email address';
      }

      if (!phone.trim()) {
        errs.phone = 'Phone number is required';
      } else if (phone.trim().replace(/[\s-]/g, '').length < 8) {
        errs.phone = 'Please enter a valid phone number';
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

    const combinedNrc = `${nrcPrefix}${nrcNumber.trim().toUpperCase()}`;
    const nameParts = fullName.trim().split(/\s+/);
    const derivedFirstName = nameParts[0] || '';
    const derivedLastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : derivedFirstName;

    const payload: CustomerCreateDTO & { fullName?: string; officialEmail?: string } = {
      customerType,
      email: email.trim(),
      phone: phone.trim(),
      address: address.trim() || undefined,
      ...(customerType === 'PERSONAL'
        ? {
            fullName: fullName.trim(),
            firstName: derivedFirstName,
            lastName: derivedLastName,
            gender,
            dateOfBirth: dateOfBirth || undefined,
            nrc: combinedNrc,
            occupation: occupation.trim() || undefined,
          }
        : {
            companyName: companyName.trim(),
            registrationNumber: registrationNumber.trim(),
            taxId: taxId.trim(),
            businessType: businessType.trim() || undefined,
            officialEmail: email.trim(),
          }),
    };

    try {
      const res = await customersApi.create(payload);
      setCreatedCustomer(res.data);
      onSuccess();
    } catch (err) {
      const axErr = err as AxiosError<{ message?: string }>;
      setApiError(axErr.response?.data?.message || 'Failed to register customer. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwitchCategory = (type: 'PERSONAL' | 'COMPANY') => {
    setCustomerType(type);
    setErrors({});
    setApiError(null);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={createdCustomer ? 'Customer Registered Successfully' : 'Register New Customer'}
      size="xl"
    >
      {createdCustomer ? (
        <div className="space-y-6">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-emerald-500 p-2 text-white">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-emerald-950">Customer Onboarded!</h3>
                <p className="text-xs text-emerald-700">
                  Registration credentials have been generated and sent via email.
                </p>
              </div>
            </div>
          </div>

          <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-gray-50/50 p-4 space-y-3">
            <div className="flex items-center justify-between pt-2">
              <span className="text-sm font-medium text-gray-500">Customer Code</span>
              <div className="flex items-center gap-2">
                <code className="rounded bg-white px-2.5 py-1 text-sm font-bold text-blue-700 border border-gray-200">
                  {createdCustomer.customerCode}
                </code>
                <button
                  type="button"
                  onClick={() => handleCopy(createdCustomer.customerCode, 'code')}
                  className="rounded border border-gray-300 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  {copiedKey === 'code' ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3">
              <span className="text-sm font-medium text-gray-500">Full Name</span>
              <span className="text-sm font-semibold text-gray-900">{createdCustomer.fullName}</span>
            </div>

            <div className="flex items-center justify-between pt-3">
              <span className="text-sm font-medium text-gray-500">Customer Type</span>
              <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
                {createdCustomer.customerType}
              </span>
            </div>

            <div className="flex items-center justify-between pt-3">
              <span className="text-sm font-medium text-gray-500">Registered Email</span>
              <span className="text-sm text-gray-700">{createdCustomer.email}</span>
            </div>

            {createdCustomer.temporaryPassword && !isTeller ? (
              <div className="flex items-center justify-between pt-3">
                <span className="text-sm font-medium text-amber-700">Temporary Password</span>
                <div className="flex items-center gap-2">
                  <code className="rounded bg-amber-50 px-2.5 py-1 text-sm font-mono font-bold text-amber-900 border border-amber-200">
                    {createdCustomer.temporaryPassword}
                  </code>
                  <button
                    type="button"
                    onClick={() => handleCopy(createdCustomer.temporaryPassword!, 'pass')}
                    className="rounded border border-amber-300 bg-white px-2.5 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-50 cursor-pointer"
                  >
                    {copiedKey === 'pass' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-700">
                <span className="font-semibold">Security Note:</span> Temporary credentials have been securely emailed directly to the customer. For security and privacy, passwords are not displayed to teller staff.
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="primary" onClick={handleClose}>
              Done & Return to Directory
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {apiError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {apiError}
            </div>
          )}

          {/* Customer Type Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">
              Select Customer Category
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleSwitchCategory('PERSONAL')}
                className={[
                  'flex items-center justify-center gap-2 rounded-xl border p-3.5 text-sm font-semibold transition-all cursor-pointer',
                  customerType === 'PERSONAL'
                    ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm'
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50',
                ].join(' ')}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Personal (Individual)
              </button>
              <button
                type="button"
                onClick={() => handleSwitchCategory('COMPANY')}
                className={[
                  'flex items-center justify-center gap-2 rounded-xl border p-3.5 text-sm font-semibold transition-all cursor-pointer',
                  customerType === 'COMPANY'
                    ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm'
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50',
                ].join(' ')}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                Company (Corporate)
              </button>
            </div>
          </div>

          {/* Form Fields: Personal */}
          {customerType === 'PERSONAL' && (
            <div className="space-y-4 rounded-xl border border-gray-100 bg-gray-50/50 p-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="e.g. Aung San Oo"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    clearError('fullName');
                  }}
                  className={errors.fullName ? '!border-red-500 !bg-red-50/20 focus:!border-red-500' : ''}
                />
                {errors.fullName && (
                  <p role="alert" className="mt-1 text-xs text-red-500 font-medium">
                    {errors.fullName}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* NRC Number with Combined Prefix Selector */}
                <div className="sm:col-span-1">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    NRC Number <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-1.5">
                    <div className="w-20 shrink-0">
                      <select
                        value={nrcPrefix}
                        onChange={(e) => {
                          setNrcPrefix(e.target.value);
                          clearError('nrc');
                        }}
                        className={`w-full rounded-xl border px-2.5 py-2.5 text-xs sm:text-sm font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-sky-100 transition-all cursor-pointer ${
                          errors.nrc
                            ? 'border-red-500 focus:border-red-500 bg-red-50/20'
                            : 'border-slate-200 hover:border-slate-300 focus:border-sky-500'
                        }`}
                        title="Myanmar State/Region Prefix"
                      >
                        {NRC_PREFIXES.map((prefix) => (
                          <option key={prefix} value={prefix}>
                            {prefix}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1 min-w-0">
                      <input
                        type="text"
                        placeholder="DAGANA(N)123456"
                        value={nrcNumber}
                        onChange={(e) => {
                          let val = e.target.value.toUpperCase().replace(/\s+/g, '');
                          const prefixMatch = val.match(/^([1-9]|1[0-4])\/(.*)$/);
                          if (prefixMatch) {
                            const matchedPrefix = `${prefixMatch[1]}/`;
                            if (NRC_PREFIXES.includes(matchedPrefix)) {
                              setNrcPrefix(matchedPrefix);
                              val = prefixMatch[2];
                            }
                          }
                          setNrcNumber(val);
                          clearError('nrc');
                        }}
                        className={`w-full rounded-xl border px-3 py-2.5 text-xs sm:text-sm text-slate-900 placeholder-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-sky-100 transition-all ${
                          errors.nrc
                            ? 'border-red-500 focus:border-red-500 bg-red-50/20'
                            : 'border-slate-200 hover:border-slate-300 focus:border-sky-500'
                        }`}
                      />
                    </div>
                  </div>
                  {errors.nrc ? (
                    <p role="alert" className="mt-1 text-xs text-red-500 font-medium">
                      {errors.nrc}
                    </p>
                  ) : (
                    <p className="mt-1 text-[11px] text-gray-500">e.g. 12/DAGANA(N)123456</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as 'MALE' | 'FEMALE' | 'OTHER')}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs sm:text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100 bg-white transition-all cursor-pointer"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Date of Birth</label>
                  <Input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Occupation</label>
                <Input
                  placeholder="e.g. Software Engineer / Merchant"
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Form Fields: Company */}
          {customerType === 'COMPANY' && (
            <div className="space-y-4 rounded-xl border border-gray-100 bg-gray-50/50 p-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Company Name <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="e.g. Golden Land Trading Co., Ltd."
                  value={companyName}
                  onChange={(e) => {
                    setCompanyName(e.target.value);
                    clearError('companyName');
                  }}
                  className={errors.companyName ? '!border-red-500 !bg-red-50/20 focus:!border-red-500' : ''}
                />
                {errors.companyName && (
                  <p role="alert" className="mt-1 text-xs text-red-500 font-medium">
                    {errors.companyName}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Registration No. <span className="text-red-500">*</span>
                  </label>
                  <Input
                    placeholder="e.g. DICA-10928374"
                    value={registrationNumber}
                    onChange={(e) => {
                      setRegistrationNumber(e.target.value);
                      clearError('registrationNumber');
                    }}
                    className={errors.registrationNumber ? '!border-red-500 !bg-red-50/20 focus:!border-red-500' : ''}
                  />
                  {errors.registrationNumber && (
                    <p role="alert" className="mt-1 text-xs text-red-500 font-medium">
                      {errors.registrationNumber}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Tax ID <span className="text-red-500">*</span>
                  </label>
                  <Input
                    placeholder="e.g. TAX-998877"
                    value={taxId}
                    onChange={(e) => {
                      setTaxId(e.target.value);
                      clearError('taxId');
                    }}
                    className={errors.taxId ? '!border-red-500 !bg-red-50/20 focus:!border-red-500' : ''}
                  />
                  {errors.taxId && (
                    <p role="alert" className="mt-1 text-xs text-red-500 font-medium">
                      {errors.taxId}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Business Type</label>
                  <Input
                    placeholder="e.g. Import / Export / IT Services"
                    value={businessType}
                    onChange={(e) => setBusinessType(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Common Contact Details */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-600">Contact & Address</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  {customerType === 'PERSONAL' ? 'Email Address' : 'Official Email'}{' '}
                  <span className="text-red-500">*</span>
                </label>
                <Input
                  type="email"
                  placeholder={customerType === 'PERSONAL' ? 'client@example.com' : 'official@company.com'}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    clearError('email');
                  }}
                  className={errors.email ? '!border-red-500 !bg-red-50/20 focus:!border-red-500' : ''}
                />
                {errors.email && (
                  <p role="alert" className="mt-1 text-xs text-red-500 font-medium">
                    {errors.email}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Phone Number <span className="text-red-500">*</span>
                  {customerType === 'PERSONAL' && (
                    <span className="text-[11px] text-gray-500 font-normal ml-1">(11 digits)</span>
                  )}
                </label>
                <Input
                  placeholder={customerType === 'PERSONAL' ? '09123456789' : '09123456789'}
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    clearError('phone');
                  }}
                  className={errors.phone ? '!border-red-500 !bg-red-50/20 focus:!border-red-500' : ''}
                />
                {errors.phone && (
                  <p role="alert" className="mt-1 text-xs text-red-500 font-medium">
                    {errors.phone}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Residential / Office Address</label>
              <Input
                placeholder="No. 123, Bogyoke Road, Yangon"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button type="button" variant="ghost" onClick={handleClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isLoading}>
              Register Customer
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
