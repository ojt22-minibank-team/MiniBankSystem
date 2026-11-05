import { useState, type FormEvent, useEffect, type KeyboardEvent } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../../lib/redux';
import { forceLogout } from '../authSlice';
import { authApi } from '../../../services/apiClient';
import ekarajCrown from '../../../assets/ekaraj-crown-transparent.png';
import ekarajHeroCard from '../../../assets/ekaraj-showcase-full.png';
import type { AxiosError } from 'axios';

export default function SignupPage() {
  const dispatch = useDispatch<AppDispatch>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Mode: 'customer' or 'staff'
  const initialTab = searchParams.get('token') || searchParams.get('tab') === 'token' ? 'staff' : 'customer';
  const [activeTab, setActiveTab] = useState<'customer' | 'staff'>(initialTab);

  // Customer registration state
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [customerPassword, setCustomerPassword] = useState('');
  const [customerConfirmPassword, setCustomerConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [customerSuccess, setCustomerSuccess] = useState(false);

  // Staff token setup state
  const [token, setToken] = useState(() => searchParams.get('token') || '');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffConfirmPassword, setStaffConfirmPassword] = useState('');
  const [staffSuccess, setStaffSuccess] = useState(false);

  // Common UI states
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockActive, setCapsLockActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Auto redirect after staff setup success
  useEffect(() => {
    if (staffSuccess) {
      const timer = setTimeout(() => {
        navigate('/login', { replace: true });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [staffSuccess, navigate]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.getModifierState) {
      setCapsLockActive(e.getModifierState('CapsLock'));
    }
  };

  const validateCustomer = (): boolean => {
    const errors: Record<string, string> = {};
    if (!fullName.trim()) errors.fullName = 'Full Name is required.';
    if (!phone.trim()) {
      errors.phone = 'Phone number is required.';
    } else if (!/^[0-9+()-\s]{7,20}$/.test(phone.trim())) {
      errors.phone = 'Please enter a valid phone number.';
    }
    if (!customerPassword) {
      errors.customerPassword = 'Password is required.';
    } else if (customerPassword.length < 8) {
      errors.customerPassword = 'Password must be at least 8 characters.';
    }
    if (!customerConfirmPassword) {
      errors.customerConfirmPassword = 'Confirmation password is required.';
    } else if (customerPassword !== customerConfirmPassword) {
      errors.customerConfirmPassword = 'Passwords do not match.';
    }
    if (!agreeTerms) {
      errors.agreeTerms = 'You must agree to the Terms of Service to continue.';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateStaff = (): boolean => {
    const errors: Record<string, string> = {};
    if (!token.trim()) errors.token = 'Invitation or Setup Token is required.';
    if (!staffPassword) {
      errors.staffPassword = 'Password is required.';
    } else if (staffPassword.length < 8 || staffPassword.length > 72) {
      errors.staffPassword = 'Password must be between 8 and 72 characters.';
    }
    if (!staffConfirmPassword) {
      errors.staffConfirmPassword = 'Confirmation password is required.';
    } else if (staffPassword !== staffConfirmPassword) {
      errors.staffConfirmPassword = 'Passwords do not match.';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCustomerSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateCustomer()) return;

    setIsLoading(true);
    setApiError(null);

    // Simulate / execute registration flow
    setTimeout(() => {
      setIsLoading(false);
      setCustomerSuccess(true);
    }, 1000);
  };

  const handleStaffSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateStaff()) return;

    setIsLoading(true);
    setApiError(null);

    try {
      await authApi.completePasswordSetup({
        token: token.trim(),
        newPassword: staffPassword,
        confirmPassword: staffConfirmPassword,
      });

      dispatch(forceLogout());
      setStaffSuccess(true);
    } catch (err) {
      const error = err as AxiosError<{ message?: string }>;
      setApiError(
        error.response?.data?.message ||
          'Failed to complete password setup. The token may be expired or already used.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-x-hidden bg-[#eef3f6] p-4 sm:p-6 lg:p-8 select-none">
      {/* Subtle ambient glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-32 h-[500px] w-[500px] rounded-full bg-blue-100/40 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-[500px] w-[500px] rounded-full bg-amber-100/30 blur-3xl" />
      </div>

      {/* Main Card Container */}
      <div className="relative z-10 w-full max-w-[980px] rounded-[32px] bg-white shadow-[0_20px_60px_-15px_rgba(15,23,42,0.08),0_0_0_1px_rgba(226,232,240,0.85)] overflow-hidden grid grid-cols-1 lg:grid-cols-12">
        
        {/* LEFT COLUMN: Clean Form Panel (7 cols on lg) */}
        <div className="lg:col-span-7 flex flex-col justify-between p-7 sm:p-10 lg:p-12">
          <div>
            {/* Brand Logo Header: Crown + EKARAJ BANK + ဧကရာဇ် ဘဏ် */}
            <div className="flex items-center gap-3 mb-6">
              <img
                src={ekarajCrown}
                alt="EKARAJ BANK"
                className="h-10 w-auto object-contain select-none drop-shadow-[0_2px_6px_rgba(26,58,110,0.2)]"
              />
              <div className="flex flex-col justify-center">
                <span className="text-[17px] font-black tracking-wider text-[#102a54] leading-tight">
                  EKARAJ BANK
                </span>
                <span className="text-[12px] font-semibold text-[#1e293b] leading-tight mt-0.5">
                  ဧကရာဇ် ဘဏ်
                </span>
              </div>
            </div>

            {/* Title & Subtitle */}
            <div className="mb-5">
              <h1 className="text-2xl sm:text-[28px] font-bold text-slate-900 tracking-tight">
                Create an Account
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-slate-500 font-normal">
                Join Ekaraj Bank digital banking and secure your financial future.
              </p>
            </div>

            {/* Mode Tabs: Customer vs Staff Activation */}
            <div className="mb-6 flex rounded-xl bg-slate-100 p-1 border border-slate-200/80">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('customer');
                  setApiError(null);
                  setFieldErrors({});
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  activeTab === 'customer'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Customer Sign Up
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('staff');
                  setApiError(null);
                  setFieldErrors({});
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  activeTab === 'staff'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Staff Activation
              </button>
            </div>

            {/* Error Alert */}
            {apiError && (
              <div
                role="alert"
                className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50/95 p-3.5 transition-all shadow-sm"
              >
                <svg className="h-5 w-5 text-red-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-red-800">Registration Issue</p>
                  <p className="text-xs text-red-600 mt-0.5">{apiError}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setApiError(null)}
                  className="shrink-0 text-red-400 hover:text-red-600 focus:outline-none"
                >
                  ✕
                </button>
              </div>
            )}

            {/* TAB 1: CUSTOMER REGISTRATION */}
            {activeTab === 'customer' && !customerSuccess && (
              <form onSubmit={handleCustomerSubmit} noValidate className="space-y-3.5">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                      <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => {
                        setFullName(e.target.value);
                        if (fieldErrors.fullName) setFieldErrors((err) => ({ ...err, fullName: '' }));
                      }}
                      placeholder="Enter your full name"
                      className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#c5a028] focus:ring-2 focus:ring-[#c5a028]/20 transition-all"
                    />
                  </div>
                  {fieldErrors.fullName && (
                    <p className="mt-1 text-xs text-red-600">{fieldErrors.fullName}</p>
                  )}
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phone Number
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                      <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                      </svg>
                    </div>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        if (fieldErrors.phone) setFieldErrors((err) => ({ ...err, phone: '' }));
                      }}
                      placeholder="e.g. 09123456789"
                      className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#c5a028] focus:ring-2 focus:ring-[#c5a028]/20 transition-all"
                    />
                  </div>
                  {fieldErrors.phone && (
                    <p className="mt-1 text-xs text-red-600">{fieldErrors.phone}</p>
                  )}
                </div>

                {/* Password & Confirm Password in 2 columns */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Password
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={customerPassword}
                      onChange={(e) => {
                        setCustomerPassword(e.target.value);
                        if (fieldErrors.customerPassword) setFieldErrors((err) => ({ ...err, customerPassword: '' }));
                      }}
                      onKeyDown={handleKeyDown}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-slate-300 bg-white py-2.5 px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#c5a028] focus:ring-2 focus:ring-[#c5a028]/20 transition-all"
                    />
                    {fieldErrors.customerPassword && (
                      <p className="mt-1 text-xs text-red-600">{fieldErrors.customerPassword}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Confirm Password
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={customerConfirmPassword}
                      onChange={(e) => {
                        setCustomerConfirmPassword(e.target.value);
                        if (fieldErrors.customerConfirmPassword) setFieldErrors((err) => ({ ...err, customerConfirmPassword: '' }));
                      }}
                      onKeyDown={handleKeyDown}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-slate-300 bg-white py-2.5 px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#c5a028] focus:ring-2 focus:ring-[#c5a028]/20 transition-all"
                    />
                    {fieldErrors.customerConfirmPassword && (
                      <p className="mt-1 text-xs text-red-600">{fieldErrors.customerConfirmPassword}</p>
                    )}
                  </div>
                </div>

                {/* Show password checkbox */}
                <div className="flex items-center justify-between pt-0.5">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-600">
                    <input
                      type="checkbox"
                      checked={showPassword}
                      onChange={(e) => setShowPassword(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-[#caa13b] focus:ring-[#caa13b]/30 accent-[#caa13b]"
                    />
                    <span>Show passwords</span>
                  </label>
                  {capsLockActive && (
                    <span className="text-xs text-amber-700 font-medium">Caps Lock is ON</span>
                  )}
                </div>

                {/* Terms agreement */}
                <label className="flex items-start gap-2 pt-1 cursor-pointer select-none text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => {
                      setAgreeTerms(e.target.checked);
                      if (fieldErrors.agreeTerms) setFieldErrors((err) => ({ ...err, agreeTerms: '' }));
                    }}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#caa13b] focus:ring-[#caa13b]/30 accent-[#caa13b]"
                  />
                  <span>
                    I accept the{' '}
                    <span className="font-semibold text-slate-900 hover:underline">Terms of Banking</span>{' '}
                    and Privacy Policy.
                  </span>
                </label>
                {fieldErrors.agreeTerms && (
                  <p className="text-xs text-red-600">{fieldErrors.agreeTerms}</p>
                )}

                {/* Shimmering Gradient Sign Up Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    style={{
                      background: 'linear-gradient(90deg, #dfba61 0%, #caa13b 45%, #24467d 82%, #17366b 100%)',
                    }}
                    className="w-full py-3 px-4 rounded-xl font-bold text-slate-900 shadow-md shadow-blue-950/15 hover:brightness-105 active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed text-sm tracking-wide"
                  >
                    {isLoading ? (
                      <span>Creating Account...</span>
                    ) : (
                      <span>Create Account</span>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* CUSTOMER SUCCESS STATE */}
            {activeTab === 'customer' && customerSuccess && (
              <div className="py-8 text-center space-y-4 animate-in fade-in duration-300">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900">Registration Submitted!</h3>
                <p className="text-xs sm:text-sm text-slate-600 max-w-sm mx-auto">
                  Welcome to Ekaraj Bank, <span className="font-semibold text-slate-900">{fullName}</span>! Your customer profile has been created successfully.
                </p>
                <div className="pt-3">
                  <Link
                    to="/login"
                    style={{
                      background: 'linear-gradient(90deg, #dfba61 0%, #caa13b 45%, #24467d 82%, #17366b 100%)',
                    }}
                    className="inline-block py-2.5 px-6 rounded-xl font-bold text-slate-900 shadow-md shadow-blue-950/15 hover:brightness-105 transition-all text-sm"
                  >
                    Proceed to Sign In →
                  </Link>
                </div>
              </div>
            )}

            {/* TAB 2: STAFF TOKEN SETUP */}
            {activeTab === 'staff' && !staffSuccess && (
              <form onSubmit={handleStaffSubmit} noValidate className="space-y-3.5">
                {/* Invitation / Setup Token */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Setup / Invitation Token
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                      <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      value={token}
                      onChange={(e) => {
                        setToken(e.target.value);
                        if (fieldErrors.token) setFieldErrors((err) => ({ ...err, token: '' }));
                      }}
                      placeholder="Paste your setup token"
                      className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#c5a028] focus:ring-2 focus:ring-[#c5a028]/20 transition-all font-mono text-xs"
                    />
                  </div>
                  {fieldErrors.token && (
                    <p className="mt-1 text-xs text-red-600">{fieldErrors.token}</p>
                  )}
                </div>

                {/* Password & Confirm */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      New Password
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={staffPassword}
                      onChange={(e) => {
                        setStaffPassword(e.target.value);
                        if (fieldErrors.staffPassword) setFieldErrors((err) => ({ ...err, staffPassword: '' }));
                      }}
                      onKeyDown={handleKeyDown}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-slate-300 bg-white py-2.5 px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#c5a028] focus:ring-2 focus:ring-[#c5a028]/20 transition-all"
                    />
                    {fieldErrors.staffPassword && (
                      <p className="mt-1 text-xs text-red-600">{fieldErrors.staffPassword}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Confirm Password
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={staffConfirmPassword}
                      onChange={(e) => {
                        setStaffConfirmPassword(e.target.value);
                        if (fieldErrors.staffConfirmPassword) setFieldErrors((err) => ({ ...err, staffConfirmPassword: '' }));
                      }}
                      onKeyDown={handleKeyDown}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-slate-300 bg-white py-2.5 px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#c5a028] focus:ring-2 focus:ring-[#c5a028]/20 transition-all"
                    />
                    {fieldErrors.staffConfirmPassword && (
                      <p className="mt-1 text-xs text-red-600">{fieldErrors.staffConfirmPassword}</p>
                    )}
                  </div>
                </div>

                {/* Show password checkbox */}
                <div className="flex items-center justify-between pt-0.5">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-600">
                    <input
                      type="checkbox"
                      checked={showPassword}
                      onChange={(e) => setShowPassword(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-[#caa13b] focus:ring-[#caa13b]/30 accent-[#caa13b]"
                    />
                    <span>Show passwords</span>
                  </label>
                </div>

                {/* Submit button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    style={{
                      background: 'linear-gradient(90deg, #dfba61 0%, #caa13b 45%, #24467d 82%, #17366b 100%)',
                    }}
                    className="w-full py-3 px-4 rounded-xl font-bold text-slate-900 shadow-md shadow-blue-950/15 hover:brightness-105 active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed text-sm tracking-wide"
                  >
                    {isLoading ? (
                      <span>Activating Account...</span>
                    ) : (
                      <span>Activate Staff Account</span>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* STAFF SUCCESS STATE */}
            {activeTab === 'staff' && staffSuccess && (
              <div className="py-8 text-center space-y-4 animate-in fade-in duration-300">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900">Staff Account Activated!</h3>
                <p className="text-xs sm:text-sm text-slate-600 max-w-sm mx-auto">
                  Your staff credentials are now ready. Redirecting you to Sign In in 3 seconds...
                </p>
                <div className="pt-3">
                  <Link
                    to="/login"
                    style={{
                      background: 'linear-gradient(90deg, #dfba61 0%, #caa13b 45%, #24467d 82%, #17366b 100%)',
                    }}
                    className="inline-block py-2.5 px-6 rounded-xl font-bold text-slate-900 shadow-md shadow-blue-950/15 hover:brightness-105 transition-all text-sm"
                  >
                    Sign In Now →
                  </Link>
                </div>
              </div>
            )}

            {/* Already have an account? Sign In */}
            <p className="pt-4 text-center text-xs text-slate-600">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-bold text-slate-900 hover:underline transition-colors"
              >
                Sign In
              </Link>
            </p>
          </div>

          {/* Secure Footer Note (Exact mockup match) */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="text-slate-600 font-medium">
              အကောင့်ရှိပြီးပါက Sign In သို့သွားပါ
            </span>
            <span className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
              <svg className="h-3.5 w-3.5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 2a4 4 0 00-4 4v2H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-1V6a4 4 0 00-4-4zm2 6V6a2 2 0 10-4 0v2h4zm-2 5a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" />
              </svg>
              TLS 1.3 · 256-bit Encrypted Security
            </span>
          </div>
        </div>

        {/* RIGHT COLUMN: Showcase Hero Card (5 cols on lg) */}
        <div className="hidden lg:col-span-5 lg:flex relative p-6 sm:p-8 items-center justify-center bg-slate-50/50">
          <div className="relative w-full h-full max-h-[510px] rounded-[28px] overflow-hidden shadow-[0_16px_40px_-10px_rgba(26,58,110,0.18)] border border-[#dfba61]/70 ring-1 ring-[#dfba61]/30">
            <img
              src={ekarajHeroCard}
              alt="Welcome to Ekaraj Bank"
              className="w-full h-full object-cover object-center select-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
