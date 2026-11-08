import { useState, type FormEvent, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../../lib/redux';
import { forceLogout } from '../authSlice';
import { authApi } from '../../../services/apiClient';
import Input from '../../../components/common/Input';
import { validatePasswordPolicy } from '../../../utils/validation';
import hirokiEmblem from '../../../assets/hiroki-emblem.png';
import hirokiHeroCard from '../../../assets/hiroki-hero-card.png';
import type { AxiosError } from 'axios';

export default function StaffPasswordSetupPage() {
  const dispatch = useDispatch<AppDispatch>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [token] = useState(() => searchParams.get('token') || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Token validation state
  const [isValidatingToken, setIsValidatingToken] = useState(true);
  const [isTokenValid, setIsTokenValid] = useState(false);
  const [staffInfo, setStaffInfo] = useState<{ username?: string; email?: string }>({});

  // Validate setup token immediately on page load
  useEffect(() => {
    let isMounted = true;
    const checkToken = async () => {
      if (!token.trim()) {
        if (isMounted) {
          setIsValidatingToken(false);
          setIsTokenValid(false);
          setApiError('Setup token is missing. Please use the activation link sent to your email.');
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

  // Manage the 3-second redirect timer cleanly after successful setup
  useEffect(() => {
    if (isSuccess) {
      const timer = setTimeout(() => {
        navigate('/login', { replace: true });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isSuccess, navigate]);

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!token.trim() || !isTokenValid) {
      errors.token = 'Setup token is invalid or missing.';
    }
    const pwdError = validatePasswordPolicy(newPassword, {
      username: staffInfo.username,
      email: staffInfo.email,
    });
    if (pwdError) {
      errors.newPassword = pwdError;
    }
    if (!confirmPassword) {
      errors.confirmPassword = 'Confirmation password is required.';
    } else if (newPassword !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setApiError(null);

    try {
      await authApi.completePasswordSetup({
        token: token.trim(),
        newPassword,
        confirmPassword,
      });

      // Clear any stale local session so user can log in freshly
      dispatch(forceLogout());

      setIsSuccess(true);
    } catch (err) {
      const error = err as AxiosError<{ message?: string }>;
      setApiError(
        error.response?.data?.message ||
          'Failed to complete password setup. The token may be expired or already used.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-x-hidden bg-gradient-to-br from-[#faf7f2] via-[#f5efe4] to-[#ece3d4] p-4 sm:p-6 lg:p-10 select-none">
      {/* ============================================================ */}
      {/* Soft Ambient Light Orbs with Pure Luxury Gold Theme          */}
      {/* ============================================================ */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        {/* Warm champagne gold aura */}
        <div className="animate-orb-a absolute -top-24 -right-24 h-[650px] w-[650px] rounded-full bg-gradient-to-br from-amber-400/25 via-yellow-200/15 to-transparent blur-3xl" />
        {/* Honey gold & warm amber aura */}
        <div className="animate-orb-b absolute -bottom-28 -left-28 h-[650px] w-[650px] rounded-full bg-gradient-to-tr from-amber-500/20 via-yellow-300/15 to-transparent blur-3xl" />
        {/* Soft center ambient golden glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[800px] w-[800px] rounded-full bg-amber-100/35 blur-[130px] pointer-events-none" />
        {/* Subtle luxury architectural grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#d4af3710_1px,transparent_1px),linear-gradient(to_bottom,#d4af3710_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
      </div>

      {/* ============================================================ */}
      {/* Main Split-Screen Canvas Container                           */}
      {/* ============================================================ */}
      <div className="relative z-10 w-full max-w-6xl min-h-[680px] rounded-[36px] bg-white/92 backdrop-blur-2xl shadow-[0_30px_90px_-15px_rgba(180,135,60,0.15),0_0_0_1px_rgba(255,255,255,0.95)] border border-amber-100/80 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
        
        {/* ============================================================ */}
        {/* LEFT COLUMN: Clean Form Panel (6 of 12 columns)              */}
        {/* ============================================================ */}
        <div className="lg:col-span-6 flex flex-col justify-between p-8 sm:p-12 lg:p-14">
          <div>
            {/* Brand Logo Header: Clean Emblem + HIROKI Banking */}
            <div className="flex items-center gap-3 mb-7">
              <img
                src={hirokiEmblem}
                alt="Hiroki Logo"
                className="h-9 w-auto object-contain select-none drop-shadow-[0_2px_8px_rgba(198,159,75,0.35)]"
              />
              <div className="flex flex-col">
                <span className="text-xl font-black tracking-widest text-[#1e293b]">
                  HIROKI
                </span>
                <span className="text-[9px] font-bold tracking-[0.22em] text-[#b88c3a] -mt-1 uppercase">
                  Banking
                </span>
              </div>
            </div>

            {/* Heading in Warm Gold */}
            <div className="mb-6">
              <h1 className="text-2xl sm:text-[26px] font-bold text-[#9e7b44] tracking-tight">
                Account Activation
              </h1>
              <p className="mt-1 text-xs text-stone-500 font-normal">
                Staff & Member Security — Set up permanent credentials
              </p>
            </div>

            {/* Token Validating Loading State */}
            {isValidatingToken ? (
              <div className="py-16 text-center space-y-3">
                <div className="mx-auto h-9 w-9 animate-spin rounded-full border-3 border-[#c69f4b] border-t-transparent" />
                <p className="text-sm font-semibold text-stone-700">Verifying activation token...</p>
                <p className="text-xs text-stone-400">Please wait while we validate your setup credentials.</p>
              </div>
            ) : !isTokenValid ? (
              /* Invalid or Expired Token State */
              <div className="py-8 space-y-5 animate-in fade-in duration-300">
                <div className="rounded-2xl border border-red-200 bg-red-50/80 p-6 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <h3 className="text-base font-bold text-red-900">Invalid or Expired Link</h3>
                  <p className="mt-1.5 text-xs text-red-700 leading-relaxed max-w-sm mx-auto">
                    {apiError || 'This password setup link is invalid, expired, or has already been used. Please contact your system administrator.'}
                  </p>
                </div>
                <div className="text-center pt-2">
                  <Link
                    to="/login"
                    className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 transition-colors"
                  >
                    ← Return to Login
                  </Link>
                </div>
              </div>
            ) : isSuccess ? (
              /* Success State */
              <div className="text-center py-8">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 border border-amber-300 text-[#b88c3a] shadow-md shadow-amber-900/10 animate-in zoom-in-95 duration-200">
                  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-stone-900">Password Setup Complete!</h2>
                <p className="mt-2 text-xs text-stone-600 leading-relaxed max-w-sm mx-auto">
                  Your credentials have been configured securely with Hiroki Banking. Redirecting to login portal in 3 seconds...
                </p>
                <div className="mt-6">
                  <Link
                    to="/login"
                    className="inline-flex items-center text-xs font-semibold text-[#8c672b] hover:text-[#b88c3a] transition-colors"
                  >
                    Go to Login Immediately →
                  </Link>
                </div>
              </div>
            ) : (
              /* Valid Token: Form State */
              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                {/* User Info Badge */}
                {staffInfo.username && (
                  <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 p-3 text-xs text-amber-950 flex items-center justify-between">
                    <span className="font-semibold">Account: <span className="text-[#9e7b44]">{staffInfo.username}</span></span>
                    {staffInfo.email && <span className="text-stone-500 text-[11px]">{staffInfo.email}</span>}
                  </div>
                )}

                {/* Server Error Alert */}
                {apiError && (
                  <div
                    role="alert"
                    aria-live="assertive"
                    className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50/90 p-3.5 text-xs text-red-700 shadow-sm transition-all"
                  >
                    <svg className="h-5 w-5 text-red-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span>{apiError}</span>
                  </div>
                )}

                {/* Helpful Guidance Pill in Warm Gold */}
                <div className="rounded-xl bg-amber-50/90 border border-amber-200/80 p-3 text-xs text-amber-950 flex items-start gap-2.5 shadow-sm">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100/90 text-[#b88c3a] mt-0.5">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <span className="text-[11px] leading-relaxed">
                    Password must be <strong>6–16 characters</strong> with at least <strong>1 uppercase letter</strong> and <strong>1 special character</strong>. Cannot contain your username or Gmail.
                  </span>
                </div>

                {/* New Password */}
                <Input
                  label="New Password"
                  id="new-password"
                  placeholder="6–16 chars, 1 uppercase, 1 special char"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (fieldErrors.newPassword) setFieldErrors({ ...fieldErrors, newPassword: '' });
                  }}
                  error={fieldErrors.newPassword}
                  showPasswordToggle
                  disabled={isLoading}
                  required
                  leadingIcon={
                    <svg className="h-5 w-5 text-amber-800/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                  }
                />

                {/* Confirm Password */}
                <Input
                  label="Confirm Password"
                  id="confirm-password"
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (fieldErrors.confirmPassword) setFieldErrors({ ...fieldErrors, confirmPassword: '' });
                  }}
                  error={fieldErrors.confirmPassword}
                  showPasswordToggle
                  disabled={isLoading}
                  required
                  leadingIcon={
                    <svg className="h-5 w-5 text-amber-800/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                    </svg>
                  }
                />

                {/* Champagne Gold Gradient Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="relative group w-full py-3.5 px-4 rounded-xl font-semibold text-stone-900 bg-gradient-to-r from-[#c69f4b] via-[#ecd599] to-[#b88c3a] hover:from-[#d4af58] hover:via-[#fae8b8] hover:to-[#c69a42] active:scale-[0.99] transition-all duration-200 shadow-md shadow-amber-900/20 hover:shadow-lg hover:shadow-amber-900/25 focus:outline-none focus:ring-2 focus:ring-amber-500/50 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed overflow-hidden border border-amber-300/40"
                  >
                    <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none" />
                    {isLoading && (
                      <svg className="h-4 w-4 animate-spin text-stone-900" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    )}
                    <span>{isLoading ? 'Activating Credentials...' : 'Set Staff Password'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Secure Footer Note */}
          <div className="mt-8 pt-4 border-t border-amber-100/60 flex items-center justify-between text-xs text-stone-400">
            <span>Hiroki Banking System v2.4</span>
            <span className="flex items-center gap-1.5 text-[11px] text-amber-700 font-medium">
              <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 2a4 4 0 00-4 4v2H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-1V6a4 4 0 00-4-4zm2 6V6a2 2 0 10-4 0v2h4zm-2 5a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" />
              </svg>
              TLS 1.3 · 256-bit Encrypted
            </span>
          </div>
        </div>

        {/* ============================================================ */}
        {/* RIGHT COLUMN: Full Image Cover View                          */}
        {/* ============================================================ */}
        <div className="hidden lg:col-span-6 lg:flex relative p-8 items-center justify-center bg-stone-100/40">
          <div className="relative w-full h-full max-h-[580px] rounded-[28px] overflow-hidden shadow-[0_20px_50px_-10px_rgba(180,135,60,0.3)] border border-amber-200/50">
            <img
              src={hirokiHeroCard}
              alt="Hiroki Secure Workspace"
              className="w-full h-full object-cover object-center select-none"
            />
            {/* Subtle Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-stone-900/60 via-transparent to-transparent pointer-events-none" />
            <div className="absolute bottom-6 left-6 right-6 text-white pointer-events-none">
              <p className="text-xs font-semibold tracking-wider uppercase text-amber-300">
                Verified Staff Security
              </p>
              <p className="text-sm font-medium text-white/90 mt-1">
                Robust credential protection and cryptographic session isolation.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
