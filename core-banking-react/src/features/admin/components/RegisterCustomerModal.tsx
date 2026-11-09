import { useState, type FormEvent } from 'react';
import Modal from '../../../components/common/Modal';
import Input from '../../../components/common/Input';
import Button from '../../../components/common/Button';
import { customersApi } from '../../../services/apiClient';
import type { CustomerCreateDTO, CustomerCreateResponse } from '../../../types/api.types';
import type { AxiosError } from 'axios';
import { NRC_STATES, NRC_TOWNSHIPS, NRC_CITIZEN_TYPES } from '../../../constants/nrcData';

export interface RegisterCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const GMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
const PHONE_REGEX = /^09\d{9}$/;

export default function RegisterCustomerModal({
  isOpen,
  onClose,
  onSuccess,
}: RegisterCustomerModalProps) {

  const [customerType, setCustomerType] = useState<'PERSONAL' | 'COMPANY'>('PERSONAL');

  // Personal Fields
  const [fullName, setFullName] = useState('');
  const [nrcState, setNrcState] = useState('12');
  const [nrcTownship, setNrcTownship] = useState('DAGANA');
  const [nrcCitizenType, setNrcCitizenType] = useState('(N)');
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

  const handleNrcStateChange = (stateCode: string) => {
    setNrcState(stateCode);
    const townships = NRC_TOWNSHIPS[stateCode] || [];
    setNrcTownship(townships[0] || '');
    clearError('nrc');
  };

  const resetForm = () => {
    setCustomerType('PERSONAL');
    setFullName('');
    setNrcState('12');
    setNrcTownship('DAGANA');
    setNrcCitizenType('(N)');
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

  const handleEmailChange = (val: string) => {
    setEmail(val);
    const trimmed = val.trim();
    if (errors.email) {
      if (!trimmed) {
        setErrors((prev) => ({ ...prev, email: 'Email is required' }));
      } else if (!GMAIL_REGEX.test(trimmed)) {
        setErrors((prev) => ({ ...prev, email: 'Email must be a valid @gmail.com address' }));
      } else {
        clearError('email');
      }
    }
  };

  const handlePhoneChange = (val: string) => {
    setPhone(val);
    const cleaned = val.trim().replace(/[\s-]/g, '');
    if (errors.phone) {
      if (customerType === 'PERSONAL') {
        if (!cleaned) {
          setErrors((prev) => ({ ...prev, phone: 'Phone number is required' }));
        } else if (!PHONE_REGEX.test(cleaned)) {
          setErrors((prev) => ({ ...prev, phone: 'Phone number must be exactly 11 digits starting with 09' }));
        } else {
          clearError('phone');
        }
      } else {
        if (!cleaned) {
          setErrors((prev) => ({ ...prev, phone: 'Phone number is required' }));
        } else if (cleaned.length < 8) {
          setErrors((prev) => ({ ...prev, phone: 'Please enter a valid phone number' }));
        } else {
          clearError('phone');
        }
      }
    }
  };

  const handleDateOfBirthChange = (val: string) => {
    setDateOfBirth(val);
    if (errors.dateOfBirth) {
      if (!val) {
        setErrors((prev) => ({ ...prev, dateOfBirth: 'Date of birth is required.' }));
      } else if (new Date(val) >= new Date()) {
        setErrors((prev) => ({ ...prev, dateOfBirth: 'Date of birth must be in the past.' }));
      } else {
        clearError('dateOfBirth');
      }
    }
  };

  const handleAddressChange = (val: string) => {
    setAddress(val);
    if (errors.address) {
      if (customerType === 'PERSONAL' && !val.trim()) {
        setErrors((prev) => ({ ...prev, address: 'Address is required' }));
      } else {
        clearError('address');
      }
    }
  };

  const handleOccupationChange = (val: string) => {
    setOccupation(val);
    if (errors.occupation) {
      if (customerType === 'PERSONAL' && !val.trim()) {
        setErrors((prev) => ({ ...prev, occupation: 'Occupation is mandatory for personal customers.' }));
      } else {
        clearError('occupation');
      }
    }
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (customerType === 'PERSONAL') {
      // 1. Full Name
      if (!fullName.trim()) {
        errs.fullName = 'Full name is required';
      }

      // 2. NRC (Cascading Myanmar NRC Validation)
      const combinedNrc = `${nrcState}/${nrcTownship}${nrcCitizenType}${nrcNumber.trim()}`;
      const nrcRegex = /^(1[0-4]|[1-9])\/[A-Z0-9a-z]+\([NPE]\)[0-9]{6}$/;
      if (!nrcTownship) {
        errs.nrc = 'Township is required';
      } else if (!nrcNumber.trim()) {
        errs.nrc = 'NRC 6-digit number is required';
      } else if (!/^\d{6}$/.test(nrcNumber.trim())) {
        errs.nrc = 'NRC number must be exactly 6 digits';
      } else if (!nrcRegex.test(combinedNrc)) {
        errs.nrc = 'Invalid Myanmar NRC format (e.g., 12/DAGANA(N)123456)';
      }

      // 3. Email: Required, strictly ends with @gmail.com
      const trimmedPersonalEmail = email.trim();
      if (!trimmedPersonalEmail) {
        errs.email = 'Email is required';
      } else if (!GMAIL_REGEX.test(trimmedPersonalEmail)) {
        errs.email = 'Email must be a valid @gmail.com address';
      }

      // 4. Phone: Required, exactly 11 digits starting with 09
      const personalPhoneDigits = phone.trim().replace(/[\s-]/g, '');
      if (!personalPhoneDigits) {
        errs.phone = 'Phone number is required';
      } else if (!PHONE_REGEX.test(personalPhoneDigits)) {
        errs.phone = 'Phone number must be exactly 11 digits starting with 09';
      }

      // 5. Date of Birth: Required, valid past date
      if (!dateOfBirth) {
        errs.dateOfBirth = 'Date of birth is required.';
      } else if (new Date(dateOfBirth) >= new Date()) {
        errs.dateOfBirth = 'Date of birth must be in the past.';
      }

      // 6. Address: Required, non-blank string
      if (!address.trim()) {
        errs.address = 'Address is required';
      }

      // 7. Occupation: Required specifically for PERSONAL customers, non-blank string
      if (!occupation.trim()) {
        errs.occupation = 'Occupation is mandatory for personal customers.';
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

      const trimmedOfficialEmail = email.trim();
      if (!trimmedOfficialEmail) {
        errs.email = 'Official email is required';
      } else if (!GMAIL_REGEX.test(trimmedOfficialEmail)) {
        errs.email = 'Email must be a valid @gmail.com address';
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

    const combinedNrc = `${nrcState}/${nrcTownship}${nrcCitizenType}${nrcNumber.trim()}`;
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
      const axErr = err as AxiosError<{ message?: string; code?: string }>;
      const responseData = axErr.response?.data;
      const errorMsg = responseData?.message || 'Failed to register customer. Please try again.';
      const errorCode = responseData?.code;

      if (
        errorCode === 'INVALID_EMAIL' ||
        (errorCode === 'VALIDATION_ERROR' && errorMsg.toLowerCase().includes('email')) ||
        errorMsg.toLowerCase().includes('mail server') ||
        errorMsg.toLowerCase().includes('reachable') ||
        errorMsg.toLowerCase().includes('@gmail.com') ||
        (errorMsg.toLowerCase().includes('already exists') && errorMsg.toLowerCase().includes('email'))
      ) {
        setApiError(errorMsg);
        setErrors((prev) => ({
          ...prev,
          email: errorMsg,
        }));
      } else {
        setApiError(errorMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwitchCategory = (type: 'PERSONAL' | 'COMPANY') => {
    setCustomerType(type);
    if (type === 'COMPANY') {
      setDateOfBirth('');
      clearError('dateOfBirth');
    }
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

            {/* Temporary Password Banking Security Notice */}
            <div className="pt-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-500">Temporary Password</span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200/80 px-2.5 py-1 text-xs font-semibold text-amber-800">
                  <svg className="h-3.5 w-3.5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Confidential • Sent via Registered Email
                </span>
              </div>
              <div className="mt-2.5 rounded-lg bg-blue-50/80 border border-blue-200/70 p-3 text-xs leading-relaxed text-blue-800 flex items-start gap-2">
                <svg className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p>
                  <span className="font-semibold text-blue-900">Security & Privacy Note: </span>
                  For data privacy and banking security regulations, temporary credentials are never disclosed to staff members and are dispatched directly to the customer's registered email address.
                </p>
              </div>
            </div>
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

              {/* Dynamic Cascading Myanmar NRC Selector */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  NRC Number (National Registration Card) <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-12 gap-2">
                  {/* 1. State Code dropdown */}
                  <div className="col-span-3 sm:col-span-3">
                    <select
                      value={nrcState}
                      onChange={(e) => handleNrcStateChange(e.target.value)}
                      className={`w-full rounded-xl border px-2.5 py-2.5 text-xs sm:text-sm font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-sky-100 transition-all cursor-pointer ${
                        errors.nrc
                          ? 'border-red-500 focus:border-red-500 bg-red-50/20'
                          : 'border-slate-200 hover:border-slate-300 focus:border-sky-500'
                      }`}
                      title="State/Region Code"
                    >
                      {NRC_STATES.map((state) => (
                        <option key={state.code} value={state.code}>
                          {state.label} ({state.name})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 2. Dynamic Township dropdown */}
                  <div className="col-span-4 sm:col-span-3">
                    <select
                      value={nrcTownship}
                      onChange={(e) => {
                        setNrcTownship(e.target.value);
                        clearError('nrc');
                      }}
                      className={`w-full rounded-xl border px-2.5 py-2.5 text-xs sm:text-sm font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-sky-100 transition-all cursor-pointer ${
                        errors.nrc
                          ? 'border-red-500 focus:border-red-500 bg-red-50/20'
                          : 'border-slate-200 hover:border-slate-300 focus:border-sky-500'
                      }`}
                      title="Township Code"
                    >
                      {(NRC_TOWNSHIPS[nrcState] || []).map((twp) => (
                        <option key={twp} value={twp}>
                          {twp}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 3. Citizen Type dropdown */}
                  <div className="col-span-2 sm:col-span-2">
                    <select
                      value={nrcCitizenType}
                      onChange={(e) => {
                        setNrcCitizenType(e.target.value);
                        clearError('nrc');
                      }}
                      className={`w-full rounded-xl border px-2.5 py-2.5 text-xs sm:text-sm font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-sky-100 transition-all cursor-pointer ${
                        errors.nrc
                          ? 'border-red-500 focus:border-red-500 bg-red-50/20'
                          : 'border-slate-200 hover:border-slate-300 focus:border-sky-500'
                      }`}
                      title="Citizen Type"
                    >
                      {NRC_CITIZEN_TYPES.map((type) => (
                        <option key={type.code} value={type.code}>
                          {type.code}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 4. 6-digit numeric input field */}
                  <div className="col-span-3 sm:col-span-4">
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="123456"
                      value={nrcNumber}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, '').slice(0, 6);
                        setNrcNumber(digits);
                        clearError('nrc');
                      }}
                      className={`w-full rounded-xl border px-3 py-2.5 text-xs sm:text-sm text-slate-900 placeholder-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-sky-100 transition-all font-mono tracking-wider ${
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
                  <div className="mt-1 flex items-center justify-between text-[11px] text-gray-500">
                    <span>Standard format: <code>State/Township(Type)Number</code></span>
                    {nrcNumber && (
                      <span className="font-semibold text-blue-700">
                        NRC: {nrcState}/{nrcTownship}{nrcCitizenType}{nrcNumber}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                {/* Date of Birth: Mandatory for PERSONAL */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Date of Birth <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => handleDateOfBirthChange(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className={errors.dateOfBirth ? '!border-red-500 !bg-red-50/20 focus:!border-red-500' : ''}
                  />
                  {errors.dateOfBirth && (
                    <p role="alert" className="mt-1 text-xs text-red-500 font-medium">
                      {errors.dateOfBirth}
                    </p>
                  )}
                </div>
              </div>

              {/* Occupation: Mandatory for PERSONAL */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Occupation <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="e.g. Software Engineer / Merchant"
                  value={occupation}
                  onChange={(e) => handleOccupationChange(e.target.value)}
                  className={errors.occupation ? '!border-red-500 !bg-red-50/20 focus:!border-red-500' : ''}
                />
                {errors.occupation && (
                  <p role="alert" className="mt-1 text-xs text-red-500 font-medium">
                    {errors.occupation}
                  </p>
                )}
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
                  placeholder={customerType === 'PERSONAL' ? 'customer@gmail.com' : 'company@gmail.com'}
                  value={email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  className={errors.email ? '!border-red-500 !bg-red-50/20 focus:!border-red-500' : ''}
                />
                {errors.email ? (
                  <p role="alert" className="mt-1 text-xs text-red-500 font-medium">
                    {errors.email}
                  </p>
                ) : (
                  <p className="mt-1 text-[11px] text-gray-500">
                    Must be an active, reachable @gmail.com address.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Phone Number <span className="text-red-500">*</span>
                  {customerType === 'PERSONAL' && (
                    <span className="text-[11px] text-gray-500 font-normal ml-1">(11 digits starting with 09)</span>
                  )}
                </label>
                <Input
                  placeholder="09123456789"
                  value={phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
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
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Residential / Office Address {customerType === 'PERSONAL' && <span className="text-red-500">*</span>}
              </label>
              <Input
                placeholder="No. 123, Bogyoke Road, Yangon"
                value={address}
                onChange={(e) => handleAddressChange(e.target.value)}
                className={errors.address ? '!border-red-500 !bg-red-50/20 focus:!border-red-500' : ''}
              />
              {errors.address && (
                <p role="alert" className="mt-1 text-xs text-red-500 font-medium">
                  {errors.address}
                </p>
              )}
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

export { RegisterCustomerModal, RegisterCustomerModal as CustomerCreateModal };
