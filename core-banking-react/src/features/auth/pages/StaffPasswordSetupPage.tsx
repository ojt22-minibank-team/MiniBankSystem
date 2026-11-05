import { useState, type FormEvent, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../../lib/redux';
import { forceLogout } from '../authSlice';
import { authApi } from '../../../services/apiClient';
import Input from '../../../components/common/Input';
import hirokiEmblem from '../../../assets/hiroki-emblem.png';
import hirokiHeroCard from '../../../assets/hiroki-hero-card.png';
import type { AxiosError } from 'axios';

export default function StaffPasswordSetupPage() {
  const dispatch = useDispatch<AppDispatch>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [token, setToken] = useState(() => searchParams.get('token') || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

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
    if (!token.trim()) {
      errors.token = 'Setup token is required.';
    }
    if (!newPassword) {
      errors.newPassword = 'Password is required.';
    } else if (newPassword.length < 8 || newPassword.length > 72) {
      errors.newPassword = 'Password must be between 8 and 72 characters.';
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

            {/* Success State */}
            {isSuccess ? (
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
              <form onSubmit={handleSubmit} noValidate className="space-y-4">
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
                <div className="rounded-xl bg-amber-50/90 border border-amber-200/80 p-3 text-xs text-amber-950 flex items-center gap-2.5 shadow-sm">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100/90 text-[#b88c3a]">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <span>Please configure a permanent password (8–72 characters) for your staff account.</span>
                </div>

                {/* Setup Token */}
                <Input
                  label="Setup Token"
                  id="token"
                  placeholder="Paste security setup token"
                  value={token}
                  onChange={(e) => {
                    setToken(e.target.value);
                    if (fieldErrors.token) setFieldErrors({ ...fieldErrors, token: '' });
                  }}
                  error={fieldErrors.token}
                  disabled={isLoading}
                  required
                  leadingIcon={
                    <svg className="h-5 w-5 text-amber-800/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                    </svg>
                  }
                />

                {/* New Password */}
                <Input
                  label="New Password"
                  id="new-password"
                  placeholder="Minimum 8 characters"
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
                    <span>{isLoading ? 'Activating Account...' : 'Set Password & Activate'}</span>
                  </button>
                </div>

                {/* Back to Login Link */}
                <p className="pt-2 text-center text-xs text-stone-500">
                  Already activated?{' '}
                  <Link
                    to="/login"
                    className="font-semibold text-[#8c672b] hover:text-[#b88c3a] hover:underline transition-colors"
                  >
                    Sign in to your account
                  </Link>
                </p>
              </form>
            )}
          </div>

          {/* Secure Footer Note */}
          <div className="mt-8 pt-5 border-t border-amber-100/80 flex items-center justify-between text-[11px] text-stone-400">
            <span className="flex items-center gap-1.5 text-stone-500">
              <span className="inline-block h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              Hiroki Gold Standard Security • Active
            </span>
            <span className="flex items-center gap-1 font-mono text-stone-400">
              <svg className="h-3 w-3 text-amber-600/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              TLS 1.3 • 256-bit Encrypted
            </span>
          </div>
        </div>

        {/* ============================================================ */}
        {/* RIGHT COLUMN: Static Luxury Glass Showcase                   */}
        {/* ============================================================ */}
        <div className="hidden lg:col-span-6 lg:flex relative overflow-hidden p-8 items-center justify-center">
          {/* Card Container (Clean, Crisp & Still) */}
          <div className="relative w-full h-full max-h-[640px] rounded-[32px] overflow-hidden shadow-[0_20px_50px_-15px_rgba(180,135,60,0.22)] border border-amber-100/70">
            {/* The Silk & Glassmorphism Showcase Hero Image */}
            <img
              src={hirokiHeroCard}
              alt="Hiroki Banking Showcase"
              className="w-full h-full object-cover object-center pointer-events-none select-none"
            />

            {/* Breathing Golden Ambient Backlight behind the 3D Crest Logo */}
            <div className="animate-gold-backlight absolute top-[27%] left-1/2 -translate-x-1/2 -translate-y-1/2 h-56 w-56 rounded-full bg-gradient-to-r from-amber-400/50 via-yellow-300/60 to-amber-500/50 pointer-events-none mix-blend-screen" />
            <div className="animate-gold-backlight absolute top-[27%] left-1/2 -translate-x-1/2 -translate-y-1/2 h-36 w-36 rounded-full bg-gradient-to-r from-amber-200/70 via-yellow-100/80 to-amber-300/70 pointer-events-none mix-blend-screen blur-md" />

            {/* Crisp Glass Inner Border Highlight with Warm Gold Accent */}
            <div className="absolute inset-0 rounded-[32px] ring-1 ring-inset ring-amber-200/40 pointer-events-none" />
          </div>
        </div>
      </div>
    </div>
  );
}
