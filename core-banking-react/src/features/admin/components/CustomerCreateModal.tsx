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

export default function CustomerCreateModal({
  isOpen,
  onClose,
  onSuccess,
}: CustomerCreateModalProps) {
  const { isTeller } = useAuth();
  const [customerType, setCustomerType] = useState<'PERSONAL' | 'COMPANY'>('PERSONAL');

  // Personal Fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'OTHER'>('MALE');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [nrc, setNrc] = useState('');
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
    setFirstName('');
    setLastName('');
    setGender('MALE');
    setDateOfBirth('');
    setNrc('');
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

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!email.trim()) {
      errs.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = 'Please enter a valid email address.';
    }

    if (!phone.trim()) {
      errs.phone = 'Phone number is required.';
    }

    if (customerType === 'PERSONAL') {
      if (!firstName.trim()) errs.firstName = 'First name is required.';
      if (!lastName.trim()) errs.lastName = 'Last name is required.';
      if (!nrc.trim()) errs.nrc = 'NRC number is required.';
    } else {
      if (!companyName.trim()) errs.companyName = 'Company name is required.';
      if (!registrationNumber.trim()) errs.registrationNumber = 'Company registration number is required.';
      if (!taxId.trim()) errs.taxId = 'Tax ID is required.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setApiError(null);

    const payload: CustomerCreateDTO = {
      customerType,
      email: email.trim(),
      phone: phone.trim(),
      address: address.trim() || undefined,
      ...(customerType === 'PERSONAL'
        ? {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            gender,
            dateOfBirth: dateOfBirth || undefined,
            nrc: nrc.trim(),
            occupation: occupation.trim() || undefined,
          }
        : {
            companyName: companyName.trim(),
            registrationNumber: registrationNumber.trim(),
            taxId: taxId.trim(),
            businessType: businessType.trim() || undefined,
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
                  className="rounded border border-gray-300 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
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
                    className="rounded border border-amber-300 bg-white px-2.5 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-50"
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
        <form onSubmit={handleSubmit} className="space-y-5">
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
                onClick={() => setCustomerType('PERSONAL')}
                className={[
                  'flex items-center justify-center gap-2 rounded-xl border p-3.5 text-sm font-semibold transition-all',
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
                onClick={() => setCustomerType('COMPANY')}
                className={[
                  'flex items-center justify-center gap-2 rounded-xl border p-3.5 text-sm font-semibold transition-all',
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">First Name *</label>
                  <Input
                    placeholder="e.g. Aung"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    error={errors.firstName}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Last Name *</label>
                  <Input
                    placeholder="e.g. Myint"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    error={errors.lastName}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">NRC Number *</label>
                  <Input
                    placeholder="12/KAMAYA(N)012345"
                    value={nrc}
                    onChange={(e) => setNrc(e.target.value)}
                    error={errors.nrc}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as any)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
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
                <label className="block text-xs font-semibold text-gray-700 mb-1">Company Name *</label>
                <Input
                  placeholder="e.g. Golden Land Trading Co., Ltd."
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  error={errors.companyName}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Registration No. *</label>
                  <Input
                    placeholder="e.g. DICA-10928374"
                    value={registrationNumber}
                    onChange={(e) => setRegistrationNumber(e.target.value)}
                    error={errors.registrationNumber}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Tax ID *</label>
                  <Input
                    placeholder="e.g. TAX-998877"
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                    error={errors.taxId}
                  />
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
                <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address *</label>
                <Input
                  type="email"
                  placeholder="client@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  error={errors.email}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Phone Number *</label>
                <Input
                  placeholder="+95 9123456789"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  error={errors.phone}
                />
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
