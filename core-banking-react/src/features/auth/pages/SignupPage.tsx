import { useState, type FormEvent, useEffect, type KeyboardEvent } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../../lib/redux';
import { forceLogout } from '../authSlice';
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
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockActive, setCapsLockActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

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

                {/* Password Policy Box */}
                <div className="mb-5 rounded-xl border border-amber-200/80 bg-amber-50/80 p-3 text-xs text-amber-950 flex items-start gap-2.5 shadow-xs">
                  <svg className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <p className="text-[11px] leading-relaxed text-amber-900">
                    Password must be <strong>6–16 characters</strong> with at least <strong>1 uppercase letter</strong> and <strong>1 special character</strong>. Cannot contain your username or Gmail.
                  </p>
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
                  {/* Password & Confirm */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
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
                        placeholder="6-16 characters"
                        className="w-full rounded-xl border border-slate-300 bg-white py-2.5 px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#c5a028] focus:ring-2 focus:ring-[#c5a028]/20 transition-all"
                      />
                      {fieldErrors.staffPassword && (
                        <p className="mt-1 text-xs text-red-600">{fieldErrors.staffPassword}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
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
                        placeholder="Re-enter password"
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
                    {capsLockActive && (
                      <span className="text-xs text-amber-700 font-medium">Caps Lock is ON</span>
                    )}
                  </div>

                  {/* Submit button */}
                  <div className="pt-3">
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
