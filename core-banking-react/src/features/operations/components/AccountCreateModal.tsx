import { useState, type FormEvent } from 'react';
import Modal from '../../../components/common/Modal';
import Input from '../../../components/common/Input';
import Button from '../../../components/common/Button';
import { accountsApi } from '../../../services/apiClient';
import type { AccountCreateDTO, CorporateAccountCreateDTO } from '../../../types/api.types';
import type { AxiosError } from 'axios';

interface AccountCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (accountNumber: string) => void;
}

export default function AccountCreateModal({
  isOpen,
  onClose,
  onSuccess,
}: AccountCreateModalProps) {
  const [accountCategory, setAccountCategory] = useState<'RETAIL' | 'CORPORATE'>('RETAIL');

  // Retail Account Fields
  const [customerCode, setCustomerCode] = useState('');
  const [retailAccountType, setRetailAccountType] = useState<'SAVINGS' | 'CURRENT'>('SAVINGS');
  const [retailCurrency, setRetailCurrency] = useState('MMK');
  const [retailInitialDeposit, setRetailInitialDeposit] = useState<number | ''>(0);

  // Corporate Account Fields
  const [companyCustomerCode, setCompanyCustomerCode] = useState('');
  const [corporateAccountType, setCorporateAccountType] = useState<'CURRENT' | 'SAVINGS'>('CURRENT');
  const [corporateCurrency, setCorporateCurrency] = useState('MMK');
  const [corporateInitialDeposit, setCorporateInitialDeposit] = useState<number | ''>(0);

  // CEO Details (Approver)
  const [ceoCustomerCode, setCeoCustomerCode] = useState('');
  const [ceoFullName, setCeoFullName] = useState('');
  const [ceoEmail, setCeoEmail] = useState('');
  const [ceoPhone, setCeoPhone] = useState('');

  // Maker Details (Initiator)
  const [makerCustomerCode, setMakerCustomerCode] = useState('');
  const [makerFullName, setMakerFullName] = useState('');
  const [makerEmail, setMakerEmail] = useState('');
  const [makerPhone, setMakerPhone] = useState('');

  // UI State
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [createdAccountNumber, setCreatedAccountNumber] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const resetForm = () => {
    setAccountCategory('RETAIL');
    setCustomerCode('');
    setRetailAccountType('SAVINGS');
    setRetailCurrency('MMK');
    setRetailInitialDeposit(0);

    setCompanyCustomerCode('');
    setCorporateAccountType('CURRENT');
    setCorporateCurrency('MMK');
    setCorporateInitialDeposit(0);

    setCeoCustomerCode('');
    setCeoFullName('');
    setCeoEmail('');
    setCeoPhone('');

    setMakerCustomerCode('');
    setMakerFullName('');
    setMakerEmail('');
    setMakerPhone('');

    setErrors({});
    setApiError(null);
    setCreatedAccountNumber(null);
    setCopied(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (accountCategory === 'RETAIL') {
      if (!customerCode.trim()) {
        errs.customerCode = 'Customer code is required.';
      }
    } else {
      if (!companyCustomerCode.trim()) {
        errs.companyCustomerCode = 'Company customer code is required.';
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

    try {
      if (accountCategory === 'RETAIL') {
        const payload: AccountCreateDTO = {
          customerCode: customerCode.trim(),
          accountType: retailAccountType,
          currency: retailCurrency,
          initialDeposit: Number(retailInitialDeposit) || 0,
        };
        const res = await accountsApi.create(payload);
        setCreatedAccountNumber(res.data.accountNumber);
        onSuccess(res.data.accountNumber);
      } else {
        const payload: CorporateAccountCreateDTO = {
          companyCustomerCode: companyCustomerCode.trim(),
          accountType: corporateAccountType,
          ceoCustomerCode: ceoCustomerCode.trim() || undefined,
          ceoFullName: ceoFullName.trim() || undefined,
          ceoEmail: ceoEmail.trim() || undefined,
          ceoPhone: ceoPhone.trim() || undefined,
          makerCustomerCode: makerCustomerCode.trim() || undefined,
          makerFullName: makerFullName.trim() || undefined,
          makerEmail: makerEmail.trim() || undefined,
          makerPhone: makerPhone.trim() || undefined,
          currency: corporateCurrency,
          initialDeposit: Number(corporateInitialDeposit) || 0,
        };
        const res = await accountsApi.createCorporate(payload);
        setCreatedAccountNumber(res.data.accountNumber);
        onSuccess(res.data.accountNumber);
      }
    } catch (err) {
      const axErr = err as AxiosError<{ message?: string }>;
      const msg = axErr.response?.data?.message || (typeof axErr.response?.data === 'string' ? axErr.response.data : '');
      setApiError(msg || 'Failed to open account. Please verify the customer code is correct and belongs to a COMPANY customer.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={createdAccountNumber ? 'Account Successfully Opened' : 'Open New Bank Account'}
      size="xl"
    >
      {createdAccountNumber ? (
        <div className="space-y-6">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-emerald-500 p-2 text-white">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-emerald-950">
                  {accountCategory === 'RETAIL' ? 'Retail Account Created' : 'Corporate Account Created (Dual Approval)'}
                </h3>
                <p className="text-xs text-emerald-700">
                  Account is now ACTIVE and ready for deposit and transfer operations.
                </p>
              </div>
            </div>
          </div>

          <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-gray-50/50 p-4 space-y-3">
            <div className="flex items-center justify-between pt-2">
              <span className="text-sm font-medium text-gray-500">Account Number</span>
              <div className="flex items-center gap-2">
                <code className="rounded bg-white px-3 py-1.5 text-base font-bold text-blue-700 border border-gray-200">
                  {createdAccountNumber}
                </code>
                <button
                  type="button"
                  onClick={() => handleCopy(createdAccountNumber)}
                  className="rounded border border-gray-300 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3">
              <span className="text-sm font-medium text-gray-500">Category & Product</span>
              <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
                {accountCategory} • {accountCategory === 'RETAIL' ? retailAccountType : corporateAccountType}
              </span>
            </div>

            {accountCategory === 'CORPORATE' ? (
              <div className="pt-3 text-xs text-gray-600 space-y-1">
                <p className="font-semibold text-gray-800">Dual Authorization Configured:</p>
                <p>• <strong>Approver:</strong> Authorizer / Signatory (can_view = 1, can_approve = 1)</p>
                <p>• <strong>MAKER:</strong> Initiator (can_view = 1, can_initiate = 1)</p>
                <p>• <strong>Required Approvals:</strong> 2 signatures</p>
              </div>
            ) : (
              <div className="pt-3 text-xs text-gray-600">
                <p>• <strong>Required Approvals:</strong> 1 signature</p>
                <p>• <strong>Daily Limit:</strong> 50,000,000 MMK</p>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="primary" onClick={handleClose}>
              Done & View Account
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

          {/* Account Category Switcher */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">
              Select Account Category (2 Types)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAccountCategory('RETAIL')}
                className={[
                  'flex items-center justify-center gap-2 rounded-xl border p-3.5 text-sm font-semibold transition-all',
                  accountCategory === 'RETAIL'
                    ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm'
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50',
                ].join(' ')}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                1. Retail Account (Personal)
              </button>
              <button
                type="button"
                onClick={() => setAccountCategory('CORPORATE')}
                className={[
                  'flex items-center justify-center gap-2 rounded-xl border p-3.5 text-sm font-semibold transition-all',
                  accountCategory === 'CORPORATE'
                    ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm'
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50',
                ].join(' ')}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                2. Corporate Account (Approver + Maker)
              </button>
            </div>
          </div>

          {/* Form 1: Retail Account */}
          {accountCategory === 'RETAIL' && (
            <div className="space-y-4 rounded-xl border border-gray-100 bg-gray-50/50 p-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Customer Code *</label>
                <Input
                  placeholder="e.g. CUST-20261017-1049"
                  value={customerCode}
                  onChange={(e) => setCustomerCode(e.target.value)}
                  error={errors.customerCode}
                />
                <p className="mt-1 text-xs text-gray-500">
                  The primary retail customer who will own this account.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Account Product Type</label>
                  <select
                    value={retailAccountType}
                    onChange={(e) => setRetailAccountType(e.target.value as any)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                  >
                    <option value="SAVINGS">SAVINGS (Prefix: 100...)</option>
                    <option value="CURRENT">CURRENT (Prefix: 200...)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Currency</label>
                  <select
                    value={retailCurrency}
                    onChange={(e) => setRetailCurrency(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                  >
                    <option value="MMK">MMK (Myanmar Kyat)</option>
                    <option value="USD">USD (US Dollar)</option>
                  </select>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-gray-700">Initial Deposit</label>
                    <span className="text-[10px] text-gray-500 font-medium">Quick Fill:</span>
                  </div>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={retailInitialDeposit}
                    onChange={(e) => setRetailInitialDeposit(e.target.value === '' ? '' : Number(e.target.value))}
                  />
                  <div className="flex gap-1.5 mt-1.5">
                    {[10000, 50000, 100000, 500000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setRetailInitialDeposit(amt)}
                        className="text-[10px] bg-white border border-gray-200 hover:border-blue-400 hover:bg-blue-50 text-gray-700 hover:text-blue-700 px-2 py-0.5 rounded transition-all shadow-2xs cursor-pointer"
                      >
                        +{amt.toLocaleString()}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Form 2: Corporate Account */}
          {accountCategory === 'CORPORATE' && (
            <div className="space-y-4 rounded-xl border border-gray-100 bg-gray-50/50 p-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Company Customer Code *</label>
                <Input
                  placeholder="e.g. CUST-20261017-9922 (Company Type)"
                  value={companyCustomerCode}
                  onChange={(e) => setCompanyCustomerCode(e.target.value)}
                  error={errors.companyCustomerCode}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Account Product Type</label>
                  <select
                    value={corporateAccountType}
                    onChange={(e) => setCorporateAccountType(e.target.value as any)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                  >
                    <option value="CURRENT">CURRENT (Prefix: 200...)</option>
                    <option value="SAVINGS">SAVINGS (Prefix: 100...)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Currency</label>
                  <select
                    value={corporateCurrency}
                    onChange={(e) => setCorporateCurrency(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                  >
                    <option value="MMK">MMK (Myanmar Kyat)</option>
                    <option value="USD">USD (US Dollar)</option>
                  </select>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-gray-700">Initial Deposit</label>
                    <span className="text-[10px] text-gray-500 font-medium">Quick Fill:</span>
                  </div>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={corporateInitialDeposit}
                    onChange={(e) => setCorporateInitialDeposit(e.target.value === '' ? '' : Number(e.target.value))}
                  />
                  <div className="flex gap-1.5 mt-1.5">
                    {[50000, 100000, 500000, 1000000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setCorporateInitialDeposit(amt)}
                        className="text-[10px] bg-white border border-gray-200 hover:border-blue-400 hover:bg-blue-50 text-gray-700 hover:text-blue-700 px-2 py-0.5 rounded transition-all shadow-2xs cursor-pointer"
                      >
                        +{amt.toLocaleString()}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* CEO Configuration */}
              <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900">
                      1. Primary Approver (Authorizer / Checker) <span className="font-normal text-gray-500 lowercase">(optional)</span>
                    </h4>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Auto-generated from company profile if left blank.
                    </p>
                  </div>
                  <span className="text-[11px] font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                    can_view = 1, can_approve = 1
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Approver Customer Code</label>
                    <Input
                      placeholder="e.g. CUST-2026... (Existing customer)"
                      value={ceoCustomerCode}
                      onChange={(e) => setCeoCustomerCode(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Approver Full Name (or Override)</label>
                    <Input
                      placeholder="e.g. U Thant Zin (Approver / MD)"
                      value={ceoFullName}
                      onChange={(e) => setCeoFullName(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Approver Email</label>
                    <Input
                      type="email"
                      placeholder="approver@company.com"
                      value={ceoEmail}
                      onChange={(e) => setCeoEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Approver Phone</label>
                    <Input
                      placeholder="+95 911111111"
                      value={ceoPhone}
                      onChange={(e) => setCeoPhone(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Maker Configuration */}
              <div className="rounded-lg border border-purple-200 bg-purple-50/50 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-purple-900">
                      2. Maker Signatory (Initiator / Accountant) <span className="font-normal text-gray-500 lowercase">(optional)</span>
                    </h4>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Auto-generated from company profile if left blank.
                    </p>
                  </div>
                  <span className="text-[11px] font-semibold text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
                    can_view = 1, can_initiate = 1
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Maker Customer Code</label>
                    <Input
                      placeholder="e.g. CUST-2026... (Existing customer)"
                      value={makerCustomerCode}
                      onChange={(e) => setMakerCustomerCode(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Maker Full Name (or Override)</label>
                    <Input
                      placeholder="e.g. Daw Khin Khin (Accountant)"
                      value={makerFullName}
                      onChange={(e) => setMakerFullName(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Maker Email</label>
                    <Input
                      type="email"
                      placeholder="accountant@company.com"
                      value={makerEmail}
                      onChange={(e) => setMakerEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Maker Phone</label>
                    <Input
                      placeholder="+95 922222222"
                      value={makerPhone}
                      onChange={(e) => setMakerPhone(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Modal Footer */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button type="button" variant="ghost" onClick={handleClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isLoading}>
              Open Account
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
