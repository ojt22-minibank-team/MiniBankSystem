import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Building2,
  CheckCircle2,
  ShieldCheck,
  Copy,
  Check,
} from 'lucide-react';
import { customerService } from '../services/customerService';
import type { PersonalCustomerCreateDTO, CompanyCustomerCreateDTO } from '../types/customer.types';
import { useToast } from '../context/ToastContext';
import { Modal } from '../components/common/Modal';

export const CustomerRegistrationView: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<'PERSONAL' | 'COMPANY'>('PERSONAL');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Personal Form Fields
  const [personalForm, setPersonalForm] = useState<PersonalCustomerCreateDTO>({
    fullName: '',
    nrc: '',
    phone: '',
    email: '',
    dateOfBirth: '1998-05-15',
    gender: 'MALE',
    address: '',
    occupation: 'Software Engineer',
  });

  // Company Form Fields
  const [companyForm, setCompanyForm] = useState<CompanyCustomerCreateDTO>({
    companyName: '',
    registrationNumber: '',
    taxId: '',
    officialEmail: '',
    phone: '',
    businessAddress: '',
    establishedDate: '2020-01-01',
    businessType: 'Private Limited Company (Co., Ltd.)',
  });

  // Client-side Validation Errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Company Success Modal State
  const [companySuccessModal, setCompanySuccessModal] = useState<{
    isOpen: boolean;
    customerCode: string;
    companyName: string;
    temporaryPassword?: string;
  }>({
    isOpen: false,
    customerCode: '',
    companyName: '',
  });

  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Validate Personal Form
  const validatePersonal = (): boolean => {
    const errs: Record<string, string> = {};
    if (!personalForm.fullName.trim()) errs.fullName = 'Full Name is required.';
    if (!personalForm.nrc.trim()) errs.nrc = 'National NRC Number is required.';
    if (!personalForm.phone.trim()) errs.phone = 'Contact Phone number is required.';
    if (!personalForm.email.trim()) {
      errs.email = 'Email address is required.';
    } else if (!/\S+@\S+\.\S+/.test(personalForm.email)) {
      errs.email = 'Please provide a valid email address.';
    }
    if (!personalForm.dateOfBirth) errs.dateOfBirth = 'Date of Birth is required.';
    if (!personalForm.address.trim()) errs.address = 'Residential Address is required.';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Validate Company Form
  const validateCompany = (): boolean => {
    const errs: Record<string, string> = {};
    if (!companyForm.companyName.trim()) errs.companyName = 'Company / Enterprise name is required.';
    if (!companyForm.registrationNumber.trim()) errs.registrationNumber = 'Company Registration number is required.';
    if (!companyForm.taxId.trim()) errs.taxId = 'Tax Identification Number (TIN) is required.';
    if (!companyForm.officialEmail.trim()) {
      errs.officialEmail = 'Official company email is required.';
    } else if (!/\S+@\S+\.\S+/.test(companyForm.officialEmail)) {
      errs.officialEmail = 'Please provide a valid official email.';
    }
    if (!companyForm.phone.trim()) errs.phone = 'Company contact phone is required.';
    if (!companyForm.businessAddress.trim()) errs.businessAddress = 'Registered business address is required.';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // 1. Submit Personal Customer
  const handlePersonalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePersonal()) return;

    try {
      setSubmitting(true);
      const res = await customerService.createPersonalCustomer(personalForm);
      const generatedCode = res.customerCode;

      toast.success(
        'Personal Customer Registered!',
        `Customer code ${generatedCode} assigned. Navigating to retail account opening...`
      );

      // CRUCIAL BEHAVIOR: Automatically navigate to /accounts/new?customerCode={customerCode}
      setTimeout(() => {
        navigate(`/accounts/new?customerCode=${encodeURIComponent(generatedCode)}`);
      }, 700);
    } catch (err: any) {
      toast.error(
        'Registration Failed',
        err.response?.data?.message || err.response?.data?.error || err.message
      );
    } finally {
      setSubmitting(false);
    }
  };

  // 2. Submit Company Customer
  const handleCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateCompany()) return;

    try {
      setSubmitting(true);
      const res = await customerService.createCompanyCustomer(companyForm);
      const generatedCode = res.customerCode;

      toast.success(
        'Company Registered Successfully!',
        `Corporate customer code: ${generatedCode}`
      );

      setCompanySuccessModal({
        isOpen: true,
        customerCode: generatedCode,
        companyName: companyForm.companyName,
        temporaryPassword: res.temporaryPassword,
      });
    } catch (err: any) {
      toast.error(
        'Company Registration Failed',
        err.response?.data?.message || err.response?.data?.error || err.message
      );
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="pb-2 border-b border-slate-200">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          New Customer Registration
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Enrol individual customers or corporate entities into Core Banking CIF.
        </p>
      </div>

      {/* Modern Tab Switcher */}
      <div className="flex bg-slate-200/70 p-1.5 rounded-2xl max-w-md">
        <button
          type="button"
          onClick={() => {
            setActiveTab('PERSONAL');
            setErrors({});
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'PERSONAL'
              ? 'bg-[#0B192C] text-white shadow-md'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <User className="w-4 h-4" />
          <span>Personal Customer</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('COMPANY');
            setErrors({});
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'COMPANY'
              ? 'bg-[#0B192C] text-white shadow-md'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Corporate Entity</span>
        </button>
      </div>

      {/* Card Form Wrapper */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 md:p-8">
        {/* ================= TAB 1: PERSONAL CUSTOMER ================= */}
        {activeTab === 'PERSONAL' && (
          <form onSubmit={handlePersonalSubmit} className="space-y-6">
            <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/60 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="text-xs text-blue-900">
                <span className="font-bold">Automated Retail Flow:</span> Upon successful registration, the system will immediately generate a customer code and redirect you to the Retail Account Opening screen with the customer code pre-populated.
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Full Name */}
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-bold text-slate-700">
                  Full Customer Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. U Kyaw Min"
                  value={personalForm.fullName}
                  onChange={(e) => setPersonalForm({ ...personalForm, fullName: e.target.value })}
                  className={`w-full px-3.5 py-2.5 text-xs rounded-xl border ${
                    errors.fullName ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600`}
                />
                {errors.fullName && <p className="text-[11px] text-rose-600 font-medium">{errors.fullName}</p>}
              </div>

              {/* NRC */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">
                  NRC / National ID <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 12/DAGAMA(N)012345"
                  value={personalForm.nrc}
                  onChange={(e) => setPersonalForm({ ...personalForm, nrc: e.target.value })}
                  className={`w-full px-3.5 py-2.5 text-xs rounded-xl border ${
                    errors.nrc ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600`}
                />
                {errors.nrc && <p className="text-[11px] text-rose-600 font-medium">{errors.nrc}</p>}
              </div>

              {/* Phone */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">
                  Phone Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 09450012345"
                  value={personalForm.phone}
                  onChange={(e) => setPersonalForm({ ...personalForm, phone: e.target.value })}
                  className={`w-full px-3.5 py-2.5 text-xs rounded-xl border ${
                    errors.phone ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600`}
                />
                {errors.phone && <p className="text-[11px] text-rose-600 font-medium">{errors.phone}</p>}
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  placeholder="e.g. kyawmin@gmail.com"
                  value={personalForm.email}
                  onChange={(e) => setPersonalForm({ ...personalForm, email: e.target.value })}
                  className={`w-full px-3.5 py-2.5 text-xs rounded-xl border ${
                    errors.email ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600`}
                />
                {errors.email && <p className="text-[11px] text-rose-600 font-medium">{errors.email}</p>}
              </div>

              {/* Date of Birth */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">
                  Date of Birth <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={personalForm.dateOfBirth}
                  onChange={(e) => setPersonalForm({ ...personalForm, dateOfBirth: e.target.value })}
                  className={`w-full px-3.5 py-2.5 text-xs rounded-xl border ${
                    errors.dateOfBirth ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600`}
                />
                {errors.dateOfBirth && <p className="text-[11px] text-rose-600 font-medium">{errors.dateOfBirth}</p>}
              </div>

              {/* Gender */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Gender</label>
                <select
                  value={personalForm.gender}
                  onChange={(e) => setPersonalForm({ ...personalForm, gender: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              {/* Occupation */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Occupation / Business</label>
                <input
                  type="text"
                  placeholder="e.g. Civil Engineer, Merchant"
                  value={personalForm.occupation}
                  onChange={(e) => setPersonalForm({ ...personalForm, occupation: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>

              {/* Address */}
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-bold text-slate-700">
                  Residential Address <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. No. 45, Pyay Road, Dagon Township, Yangon"
                  value={personalForm.address}
                  onChange={(e) => setPersonalForm({ ...personalForm, address: e.target.value })}
                  className={`w-full px-3.5 py-2.5 text-xs rounded-xl border ${
                    errors.address ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600`}
                />
                {errors.address && <p className="text-[11px] text-rose-600 font-medium">{errors.address}</p>}
              </div>
            </div>

            {/* Submit Action */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => navigate('/customers')}
                className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 rounded-xl shadow-md shadow-blue-900/20 transition-all cursor-pointer"
              >
                {submitting ? 'Registering Customer...' : 'Register & Open Account →'}
              </button>
            </div>
          </form>
        )}

        {/* ================= TAB 2: COMPANY CUSTOMER ================= */}
        {activeTab === 'COMPANY' && (
          <form onSubmit={handleCompanySubmit} className="space-y-6">
            <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-200/60 flex items-start gap-3">
              <Building2 className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
              <div className="text-xs text-indigo-900">
                <span className="font-bold">Corporate Entity Registration:</span> Creates a verified corporate customer record. Generated customer code can later be linked with CEO & Accountant roles in the Corporate Joint Account module.
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Company Name */}
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-bold text-slate-700">
                  Company Official Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Golden Myanmar Logistics Co., Ltd."
                  value={companyForm.companyName}
                  onChange={(e) => setCompanyForm({ ...companyForm, companyName: e.target.value })}
                  className={`w-full px-3.5 py-2.5 text-xs rounded-xl border ${
                    errors.companyName ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600`}
                />
                {errors.companyName && <p className="text-[11px] text-rose-600 font-medium">{errors.companyName}</p>}
              </div>

              {/* Registration Number */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">
                  Company Reg Number (DICA) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 100987654"
                  value={companyForm.registrationNumber}
                  onChange={(e) => setCompanyForm({ ...companyForm, registrationNumber: e.target.value })}
                  className={`w-full px-3.5 py-2.5 text-xs rounded-xl border ${
                    errors.registrationNumber ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600`}
                />
                {errors.registrationNumber && <p className="text-[11px] text-rose-600 font-medium">{errors.registrationNumber}</p>}
              </div>

              {/* Tax ID */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">
                  Tax Identification Number (TIN) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. TIN-88291039"
                  value={companyForm.taxId}
                  onChange={(e) => setCompanyForm({ ...companyForm, taxId: e.target.value })}
                  className={`w-full px-3.5 py-2.5 text-xs rounded-xl border ${
                    errors.taxId ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600`}
                />
                {errors.taxId && <p className="text-[11px] text-rose-600 font-medium">{errors.taxId}</p>}
              </div>

              {/* Official Email */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">
                  Official Corporate Email <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  placeholder="e.g. info@goldenlogistics.com"
                  value={companyForm.officialEmail}
                  onChange={(e) => setCompanyForm({ ...companyForm, officialEmail: e.target.value })}
                  className={`w-full px-3.5 py-2.5 text-xs rounded-xl border ${
                    errors.officialEmail ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600`}
                />
                {errors.officialEmail && <p className="text-[11px] text-rose-600 font-medium">{errors.officialEmail}</p>}
              </div>

              {/* Phone */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">
                  Company Phone Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 012345678"
                  value={companyForm.phone}
                  onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
                  className={`w-full px-3.5 py-2.5 text-xs rounded-xl border ${
                    errors.phone ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600`}
                />
                {errors.phone && <p className="text-[11px] text-rose-600 font-medium">{errors.phone}</p>}
              </div>

              {/* Established Date */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Established Date</label>
                <input
                  type="date"
                  value={companyForm.establishedDate}
                  onChange={(e) => setCompanyForm({ ...companyForm, establishedDate: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>

              {/* Business Type */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Business Type / Industry</label>
                <input
                  type="text"
                  placeholder="e.g. Import/Export, Manufacturing"
                  value={companyForm.businessType}
                  onChange={(e) => setCompanyForm({ ...companyForm, businessType: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>

              {/* Business Address */}
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-bold text-slate-700">
                  Registered Business Address <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Tower B, Suite 1204, Sule Square, Kyauktada, Yangon"
                  value={companyForm.businessAddress}
                  onChange={(e) => setCompanyForm({ ...companyForm, businessAddress: e.target.value })}
                  className={`w-full px-3.5 py-2.5 text-xs rounded-xl border ${
                    errors.businessAddress ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600`}
                />
                {errors.businessAddress && <p className="text-[11px] text-rose-600 font-medium">{errors.businessAddress}</p>}
              </div>
            </div>

            {/* Submit Action */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => navigate('/customers')}
                className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 rounded-xl shadow-md shadow-indigo-900/20 transition-all cursor-pointer"
              >
                {submitting ? 'Registering Corporate Entity...' : 'Register Corporate Entity'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Corporate Registration Success Modal */}
      <Modal
        isOpen={companySuccessModal.isOpen}
        onClose={() => setCompanySuccessModal({ ...companySuccessModal, isOpen: false })}
        title="Corporate Customer Created!"
        subtitle="Entity CIF successfully recorded in Core Banking"
        maxWidth="md"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <button
              type="button"
              onClick={() => {
                setCompanySuccessModal({ ...companySuccessModal, isOpen: false });
                navigate('/customers');
              }}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl"
            >
              Go to Customer List
            </button>
            <button
              type="button"
              onClick={() => {
                setCompanySuccessModal({ ...companySuccessModal, isOpen: false });
                navigate(`/accounts/corporate/new?companyCustomerCode=${encodeURIComponent(companySuccessModal.customerCode)}`);
              }}
              className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs"
            >
              Create Corporate Joint Account →
            </button>
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
            <div>
              <div className="font-bold text-emerald-950 text-sm">
                {companySuccessModal.companyName}
              </div>
              <div className="text-emerald-700 text-xs">
                Corporate CIF Registered & Ready for Joint Banking
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-slate-500 font-semibold uppercase text-[10px]">
              Assigned Corporate Customer Code
            </span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-base font-mono font-black text-blue-700 tracking-wider">
                {companySuccessModal.customerCode}
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard(companySuccessModal.customerCode)}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedCode ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {companySuccessModal.temporaryPassword && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
              <span className="font-bold">Initial Credentials:</span> A temporary login key was generated: <span className="font-mono font-bold">{companySuccessModal.temporaryPassword}</span>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default CustomerRegistrationView;
