import { useState, type FormEvent, useEffect, type KeyboardEvent } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../../lib/redux';
import { forceLogout, broadcastLogout } from '../authSlice';
import { authApi } from '../../../services/apiClient';
import { validatePasswordPolicy } from '../../../utils/validation';
import ekarajCrown from '../../../assets/ekaraj-crown-transparent.png';
import ekarajHeroCard from '../../../assets/ekaraj-showcase-full.png';
import type { AxiosError } from 'axios';

export default function SignupPage() {
  const dispatch = useDispatch<AppDispatch>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Staff token setup state
  const [token] = useState(() => searchParams.get('token') || '');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffConfirmPassword, setStaffConfirmPassword] = useState('');
  const [staffSuccess, setStaffSuccess] = useState(false);

  // Token validation state
  const [isValidatingToken, setIsValidatingToken] = useState(true);
  const [isTokenValid, setIsTokenValid] = useState(false);
  const [staffInfo, setStaffInfo] = useState<{ username?: string; email?: string }>({});

  // Common UI states
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [capsLockActive, setCapsLockActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Live password policy criteria checks
  const isLengthValid = staffPassword.length >= 6 && staffPassword.length <= 16;
  const isUpperValid = /[A-Z]/.test(staffPassword);
  const isSpecialValid = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(staffPassword);
  const isNoUsername =
    !staffInfo.username ||
    staffInfo.username.trim().length < 2 ||
    !staffPassword.toLowerCase().includes(staffInfo.username.trim().toLowerCase());
  const isNoGmail = !staffPassword.toLowerCase().includes('gmail');
  const isNoEmail =
    !staffInfo.email ||
    staffInfo.email.trim().length < 3 ||
    (!staffPassword.toLowerCase().includes(staffInfo.email.trim().toLowerCase()) &&
      !staffPassword.toLowerCase().includes(staffInfo.email.trim().split('@')[0].toLowerCase()));
  const isIdentityValid = isNoUsername && isNoGmail && isNoEmail;
  const isMatching =
    staffConfirmPassword.length > 0 && staffPassword === staffConfirmPassword;

  // Validate setup token immediately on page load
  useEffect(() => {
    let isMounted = true;
    const checkToken = async () => {
      if (!token.trim()) {
        if (isMounted) {
          setIsValidatingToken(false);
          setIsTokenValid(false);
          setApiError('Password setup token is missing. Please use the activation link sent to your email.');
        }
        return;
      }

      setIsValidatingToken(true);
      setApiError(null);
      try {
        const response = await authApi.validatePasswordSetupToken(token.trim());
        if (isMounted) {
          if (response.data.valid) {
            setIsTokenValid(true);
            setStaffInfo({
              username: response.data.username,
              email: response.data.email,
            });
          } else {
            setIsTokenValid(false);
            setApiError('This password setup link is invalid or expired.');
          }
        }
      } catch (err) {
        if (isMounted) {
          const error = err as AxiosError<{ message?: string }>;
          setIsTokenValid(false);
          setApiError(
            error.response?.data?.message ||
              'This password setup link is invalid, expired, or has already been used.'
          );
        }
      } finally {
        if (isMounted) {
          setIsValidatingToken(false);
        }
      }
    };

    checkToken();
    return () => {
      isMounted = false;
    };
  }, [token]);

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

  const validateStaff = (): boolean => {
    const errors: Record<string, string> = {};
    if (!token.trim() || !isTokenValid) {
      setApiError('Setup token is invalid or missing. Please use the link sent to your email.');
      return false;
    }
    const pwdError = validatePasswordPolicy(staffPassword, {
      username: staffInfo.username,
      email: staffInfo.email,
    });
    if (pwdError) {
      errors.staffPassword = pwdError;
    }
    if (!staffConfirmPassword) {
      errors.staffConfirmPassword = 'Confirmation password is required.';
    } else if (staffPassword !== staffConfirmPassword) {
      errors.staffConfirmPassword = 'Passwords do not match.';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
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

      broadcastLogout();
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
            <div className="mb-8">
              <h1 className="text-2xl sm:text-[28px] font-bold text-slate-900 tracking-tight">
                Staff Account Activation
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-slate-500 font-normal">
                Set up your new password to activate your core banking staff account.
              </p>
            </div>

            {/* Token Validating Loading State */}
            {isValidatingToken ? (
              <div className="py-12 text-center space-y-3">
                <div className="mx-auto h-9 w-9 animate-spin rounded-full border-3 border-[#caa13b] border-t-transparent" />
                <p className="text-sm font-semibold text-slate-700">Verifying activation link...</p>
                <p className="text-xs text-slate-400">Please wait while we validate your security setup token.</p>
              </div>
            ) : !isTokenValid ? (
              /* Invalid or Expired Token State */
              <div className="py-6 space-y-5 animate-in fade-in duration-300">
                <div className="rounded-2xl border border-red-200 bg-red-50/80 p-5 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <h3 className="text-base font-bold text-red-900">Invalid or Expired Link</h3>
                  <p className="mt-1.5 text-xs text-red-700 leading-relaxed max-w-sm mx-auto">
                    {apiError || 'This password setup link is invalid, expired, or has already been used. Please contact your administrator for a new link.'}
                  </p>
                </div>
                <div className="text-center pt-2">
                  <Link
                    to="/login"
                    className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                  >
                    ← Return to Sign In
                  </Link>
                </div>
              </div>
            ) : !staffSuccess ? (
              /* Valid Token: Setup Form */
              <div>
                {/* User Info Badge */}
                {staffInfo.username && (
                  <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50/60 p-3 text-xs text-blue-900 flex items-center justify-between">
                    <span className="font-semibold">Staff Username: <span className="text-blue-700">{staffInfo.username}</span></span>
                    {staffInfo.email && <span className="text-slate-500 text-[11px]">{staffInfo.email}</span>}
                  </div>
                )}

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
                      <p className="text-xs font-semibold text-red-800">Setup Issue</p>
                      <p className="text-xs text-red-600 mt-0.5">{apiError}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setApiError(null)}
                      className="shrink-0 text-red-400 hover:text-red-600 focus:outline-none cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                )}

                <form onSubmit={handleStaffSubmit} noValidate className="space-y-4">
                  {/* New Password Field */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label
                        htmlFor="staff-new-password"
                        className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
                      >
                        New Password
                      </label>
                      {capsLockActive && (
                        <span className="text-[10px] font-bold text-amber-600 animate-pulse">
                          CAPS LOCK IS ACTIVE
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        id="staff-new-password"
                        type={showNewPassword ? 'text' : 'password'}
                        value={staffPassword}
                        onChange={(e) => {
                          const val = e.target.value;
                          setStaffPassword(val);
                          if (fieldErrors.staffPassword) {
                            setFieldErrors((prev) => ({ ...prev, staffPassword: '' }));
                          }
                          if (staffConfirmPassword && fieldErrors.staffConfirmPassword && val === staffConfirmPassword) {
                            setFieldErrors((prev) => ({ ...prev, staffConfirmPassword: '' }));
                          }
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder="Enter secure password (6–16 characters)"
                        disabled={isLoading}
                        autoComplete="new-password"
                        className={`w-full rounded-xl border ${
                          fieldErrors.staffPassword
                            ? 'border-red-400 bg-red-50/30 text-red-900 focus:border-red-500 focus:ring-red-200'
                            : 'border-slate-200 bg-slate-50/70 text-slate-900 focus:border-[#dfba61] focus:ring-[#dfba61]/20'
                        } px-4 py-3 pr-11 text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-4 transition-all`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        disabled={isLoading}
                        className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                        aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                      >
                        {showNewPassword ? (
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        ) : (
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                    {fieldErrors.staffPassword && (
                      <p className="mt-1 text-[11px] font-semibold text-red-600">
                        {fieldErrors.staffPassword}
                      </p>
                    )}
                  </div>

                  {/* Confirm Password Field */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label
                        htmlFor="staff-confirm-password"
                        className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
                      >
                        Confirm Password
                      </label>
                    </div>
                    <div className="relative">
                      <input
                        id="staff-confirm-password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={staffConfirmPassword}
                        onChange={(e) => {
                          const val = e.target.value;
                          setStaffConfirmPassword(val);
                          if (fieldErrors.staffConfirmPassword) {
                            setFieldErrors((prev) => ({ ...prev, staffConfirmPassword: '' }));
                          }
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder="Re-enter your password to confirm"
                        disabled={isLoading}
                        autoComplete="new-password"
                        className={`w-full rounded-xl border ${
                          fieldErrors.staffConfirmPassword
                            ? 'border-red-400 bg-red-50/30 text-red-900 focus:border-red-500 focus:ring-red-200'
                            : 'border-slate-200 bg-slate-50/70 text-slate-900 focus:border-[#dfba61] focus:ring-[#dfba61]/20'
                        } px-4 py-3 pr-11 text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-4 transition-all`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        disabled={isLoading}
                        className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                        aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      >
                        {showConfirmPassword ? (
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        ) : (
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                    {fieldErrors.staffConfirmPassword && (
                      <p className="mt-1 text-[11px] font-semibold text-red-600">
                        {fieldErrors.staffConfirmPassword}
                      </p>
                    )}
                  </div>

                  {/* Real-time Password Security Criteria Checklist */}
                  <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-3.5 space-y-2">
                    <p className="font-semibold text-slate-700 text-[11px] uppercase tracking-wider">
                      Security Policy Criteria
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      <div className={`flex items-center gap-2 transition-colors ${isLengthValid ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
                        <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] shrink-0 ${isLengthValid ? 'bg-emerald-100 text-emerald-700 font-bold' : 'bg-slate-200 text-slate-400'}`}>
                          {isLengthValid ? '✓' : '•'}
                        </span>
                        <span>6–16 characters</span>
                      </div>
                      <div className={`flex items-center gap-2 transition-colors ${isUpperValid ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
                        <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] shrink-0 ${isUpperValid ? 'bg-emerald-100 text-emerald-700 font-bold' : 'bg-slate-200 text-slate-400'}`}>
                          {isUpperValid ? '✓' : '•'}
                        </span>
                        <span>1+ Uppercase (A-Z)</span>
                      </div>
                      <div className={`flex items-center gap-2 transition-colors ${isSpecialValid ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
                        <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] shrink-0 ${isSpecialValid ? 'bg-emerald-100 text-emerald-700 font-bold' : 'bg-slate-200 text-slate-400'}`}>
                          {isSpecialValid ? '✓' : '•'}
                        </span>
                        <span>1+ Special character</span>
                      </div>
                      <div className={`flex items-center gap-2 transition-colors ${isIdentityValid ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
                        <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] shrink-0 ${isIdentityValid ? 'bg-emerald-100 text-emerald-700 font-bold' : 'bg-slate-200 text-slate-400'}`}>
                          {isIdentityValid ? '✓' : '•'}
                        </span>
                        <span>No username or Gmail</span>
                      </div>
                    </div>
                    {staffConfirmPassword && (
                      <div className={`pt-2 border-t border-slate-200/60 flex items-center gap-2 text-[11px] transition-colors ${isMatching ? 'text-emerald-700 font-semibold' : 'text-red-600'}`}>
                        <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] shrink-0 ${isMatching ? 'bg-emerald-100 text-emerald-700 font-bold' : 'bg-red-100 text-red-600 font-bold'}`}>
                          {isMatching ? '✓' : '✕'}
                        </span>
                        <span>{isMatching ? 'Passwords match' : 'Passwords do not match'}</span>
                      </div>
                    )}
                  </div>

                  {/* Submit button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isLoading}
                      style={{
                        background: 'linear-gradient(90deg, #dfba61 0%, #caa13b 45%, #24467d 82%, #17366b 100%)',
                      }}
                      className="w-full py-3.5 px-4 rounded-xl font-bold text-slate-900 shadow-md shadow-blue-950/15 hover:brightness-105 active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed text-sm tracking-wide"
                    >
                      {isLoading ? (
                        <span>Activating Account...</span>
                      ) : (
                        <span>Activate Staff Account</span>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              /* Success state */
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
          </div>

          {/* Secure Footer Note */}
          <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-end text-xs text-slate-500">
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
