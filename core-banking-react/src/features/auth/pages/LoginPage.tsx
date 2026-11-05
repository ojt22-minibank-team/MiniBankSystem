import { useState, type FormEvent, useEffect, type KeyboardEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { loginThunk } from '../authSlice';
import ekarajCrown from '../../../assets/ekaraj-crown-transparent.png';
import ekarajShowcase from '../../../assets/ekaraj-showcase-full.png';

const REMEMBERED_USER_KEY = 'ekaraj_remembered_username';
const LEGACY_REMEMBERED_KEY = 'hiroki_remembered_username';

export default function LoginPage() {
  const { login, isLoading, error, isAuthenticated, dismissError } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState(() => {
    return (
      localStorage.getItem(REMEMBERED_USER_KEY) ||
      localStorage.getItem(LEGACY_REMEMBERED_KEY) ||
      ''
    );
  });
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => {
    return Boolean(
      localStorage.getItem(REMEMBERED_USER_KEY) ||
      localStorage.getItem(LEGACY_REMEMBERED_KEY)
    );
  });
  const [capsLockActive, setCapsLockActive] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    username?: string;
    password?: string;
  }>({});

  const displayError = errorMessage || error;

  const handleDismissError = () => {
    setErrorMessage(null);
    if (error) dismissError();
  };

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleUsernameChange = (value: string) => {
    setUsername(value);
    if (errorMessage) setErrorMessage(null);
    if (error) dismissError();
    if (fieldErrors.username) setFieldErrors((e) => ({ ...e, username: undefined }));
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (errorMessage) setErrorMessage(null);
    if (error) dismissError();
    if (fieldErrors.password) setFieldErrors((e) => ({ ...e, password: undefined }));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.getModifierState) {
      setCapsLockActive(e.getModifierState('CapsLock'));
    }
  };

  const validate = (): boolean => {
    const errors: { username?: string; password?: string } = {};
    if (!username.trim()) errors.username = 'User ID or Phone Number is required.';
    if (!password) errors.password = 'Password is required.';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validate()) return;

    if (rememberMe) {
      localStorage.setItem(REMEMBERED_USER_KEY, username.trim());
    } else {
      localStorage.removeItem(REMEMBERED_USER_KEY);
      localStorage.removeItem(LEGACY_REMEMBERED_KEY);
    }

    setErrorMessage(null);
    if (error) dismissError();

    try {
      const result = await login({ username: username.trim(), password });

      if (loginThunk.fulfilled.match(result)) {
        navigate('/admin/dashboard', { replace: true });
      } else if (loginThunk.rejected.match(result)) {
        const backendMessage =
          (result.payload as string) ||
          (result as any).error?.response?.data?.message ||
          result.error?.message ||
          'Login failed. Please check your credentials.';
        setErrorMessage(
          typeof backendMessage === 'string'
            ? backendMessage
            : (backendMessage as any)?.message || 'Login failed. Please check your credentials.'
        );
      }
    } catch (err: any) {
      const backendMessage =
        err?.response?.data?.message ||
        err?.message ||
        (typeof err === 'string' ? err : 'Login failed. Please check your credentials.');
      setErrorMessage(
        typeof backendMessage === 'string'
          ? backendMessage
          : (backendMessage as any)?.message || 'Login failed. Please check your credentials.'
      );
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-[#e8f1f4] p-4 sm:p-6 lg:p-8 select-none">
      {/* Background Soft Ambient Glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-[600px] w-[600px] rounded-full bg-cyan-100/35 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-[600px] w-[600px] rounded-full bg-amber-100/25 blur-3xl" />
      </div>

      {/* Main Container Card (Rounded-3xl, pure white with elegant shadow) */}
      <div className="relative z-10 w-full max-w-[1020px] rounded-[32px] sm:rounded-[36px] bg-white shadow-[0_25px_80px_-15px_rgba(15,23,42,0.12),0_0_0_1px_rgba(226,232,240,0.85)] overflow-hidden grid grid-cols-1 lg:grid-cols-12">
        
        {/* ============================================================ */}
        {/* LEFT COLUMN: Clean Login Form (7 of 12 columns)              */}
        {/* ============================================================ */}
        <div className="lg:col-span-7 flex flex-col justify-between p-8 sm:p-12 lg:p-14">
          <div>
            {/* Top-Left Brand Logo: 3D Crown + "EKARAJ BANK" + "ဧကရာဇ် ဘဏ်" */}
            <div className="flex items-center gap-3.5 mb-7">
              <img
                src={ekarajCrown}
                alt="EKARAJ BANK Crown"
                className="h-11 sm:h-12 w-auto object-contain select-none drop-shadow-[0_2px_10px_rgba(26,58,110,0.22)]"
              />
              <div className="flex flex-col justify-center">
                <span className="text-[20px] sm:text-[22px] font-black tracking-wider text-[#0e2548] leading-tight">
                  EKARAJ BANK
                </span>
                <span className="text-[13px] sm:text-[14px] font-bold text-[#1b3e77] leading-tight mt-0.5">
                  ဧကရာဇ် ဘဏ်
                </span>
              </div>
            </div>

            {/* Title & Subtitle */}
            <div className="mb-7">
              <h1 className="text-2xl sm:text-[30px] font-bold text-slate-900 tracking-tight">
                Sign In
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-slate-500 font-normal">
                Welcome back! Enter your credentials to access your account.
              </p>
            </div>

            {/* Error Banner */}
            {displayError && (
              <div
                role="alert"
                aria-live="assertive"
                className="mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50/95 p-3.5 transition-all shadow-xs"
              >
                <svg
                  className="h-5 w-5 text-red-500 shrink-0 mt-0.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-red-800">Login Failed</p>
                  <p className="text-xs text-red-600 mt-0.5">{displayError}</p>
                </div>
                <button
                  type="button"
                  onClick={handleDismissError}
                  className="shrink-0 text-red-400 hover:text-red-600 focus:outline-none"
                  aria-label="Dismiss error"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              {/* Field 1: User ID / Phone Number */}
              <div>
                <label
                  htmlFor="login-identifier"
                  className="block text-xs font-semibold text-slate-700 tracking-normal mb-1.5"
                >
                  User ID / Phone Number
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                    <svg
                      className="h-5 w-5 text-slate-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                      />
                    </svg>
                  </div>
                  <input
                    id="login-identifier"
                    type="text"
                    value={username}
                    onChange={(e) => handleUsernameChange(e.target.value)}
                    placeholder="Enter your ID or phone"
                    autoComplete="username"
                    disabled={isLoading}
                    className={`w-full rounded-2xl border bg-white py-3.5 pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 shadow-xs transition-all focus:outline-none focus:ring-4 ${
                      fieldErrors.username
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500/15'
                        : 'border-[#d6c4a5] focus:border-[#caa13b] focus:ring-[#caa13b]/15'
                    }`}
                  />
                </div>
                {fieldErrors.username && (
                  <p className="mt-1 text-xs text-red-600 font-medium">{fieldErrors.username}</p>
                )}
              </div>

              {/* Field 2: Password */}
              <div>
                <label
                  htmlFor="login-password"
                  className="block text-xs font-semibold text-slate-700 tracking-normal mb-1.5"
                >
                  Password
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                    <svg
                      className="h-5 w-5 text-slate-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                      />
                    </svg>
                  </div>
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onKeyUp={handleKeyDown}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    disabled={isLoading}
                    className={`w-full rounded-2xl border bg-white py-3.5 pl-11 pr-11 text-sm text-slate-900 placeholder:text-slate-400 shadow-xs transition-all focus:outline-none focus:ring-4 ${
                      fieldErrors.password
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500/15'
                        : 'border-[#d6c4a5] focus:border-[#caa13b] focus:ring-[#caa13b]/15'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p className="mt-1 text-xs text-red-600 font-medium">{fieldErrors.password}</p>
                )}
                {capsLockActive && (
                  <p className="mt-1.5 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1 flex items-center gap-1.5 font-medium">
                    <svg className="h-3.5 w-3.5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    Caps Lock is ON
                  </p>
                )}
              </div>

              {/* Utility Row: Remember Me & Forgot Password */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-600 hover:text-slate-900 transition-colors">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-[#d6c4a5] text-[#caa13b] focus:ring-[#caa13b]/30 accent-[#caa13b]"
                  />
                  <span className="font-medium">Remember me</span>
                </label>

                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-xs font-medium text-slate-600 hover:text-[#caa13b] transition-colors focus:outline-none cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>

              {/* Exact Mockup Gold-to-Navy Gradient Sign In Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  style={{
                    background: 'linear-gradient(90deg, #c49a4e 0%, #e0c37f 20%, #ecd592 35%, #b8a674 50%, #6a8187 65%, #24588a 80%, #133866 100%)',
                  }}
                  className="w-full py-3.5 px-4 rounded-2xl font-bold text-slate-950 shadow-md shadow-blue-950/20 hover:brightness-105 active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed text-sm tracking-wide"
                >
                  {isLoading && (
                    <svg className="h-4 w-4 animate-spin text-slate-950" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  )}
                  <span>{isLoading ? 'Signing in...' : 'Sign In'}</span>
                </button>
              </div>

              {/* Don't have an account? Sign Up */}
              <p className="pt-2.5 text-center text-xs text-slate-600">
                Don't have an account?{' '}
                <Link
                  to="/signup"
                  className="font-bold text-slate-900 hover:text-[#caa13b] hover:underline transition-colors ml-1"
                >
                  Sign Up
                </Link>
              </p>
            </form>
          </div>

          {/* Secure Footer Note (Exact mockup match) */}
          <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="text-slate-600 font-medium">
              အကောင့်မရှိသေးပါက
            </span>
            <span className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
              <svg className="h-3.5 w-3.5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 2a4 4 0 00-4 4v2H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-1V6a4 4 0 00-4-4zm2 6V6a2 2 0 10-4 0v2h4zm-2 5a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" />
              </svg>
              TLS 1.3 · 256-bit Encrypted Security
            </span>
          </div>
        </div>

        {/* ============================================================ */}
        {/* RIGHT COLUMN: Pristine Full-Res Showcase Card (Exact Mockup) */}
        {/* ============================================================ */}
        <div className="hidden lg:col-span-5 lg:flex relative p-6 sm:p-7 items-center justify-center bg-slate-50/20">
          <div className="relative w-full h-full max-h-[520px] rounded-[28px] overflow-hidden shadow-[0_20px_50px_-12px_rgba(26,58,110,0.18)] border border-[#dfba61]/70 ring-1 ring-[#caa13b]/30 flex items-center justify-center bg-white">
            <img
              src={ekarajShowcase}
              alt="Welcome to Ekaraj Bank - Empowering your financial future with royal security"
              className="w-full h-full object-cover object-center select-none"
            />
          </div>
        </div>

      </div>

      {/* Forgot Password Modal Dialog */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <img src={ekarajCrown} alt="" className="h-6 w-auto" />
                <h3 className="text-sm font-bold text-slate-900">
                  Account Credential Assistance
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="py-4 text-xs text-slate-600 space-y-2.5 leading-relaxed">
              <p>
                In compliance with Ekaraj Bank security protocols, password resets require identity verification or an active activation token.
              </p>
              <p>
                If you have an invitation or setup token, you can activate your credentials directly via the Setup Portal.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 focus:outline-none cursor-pointer"
              >
                Dismiss
              </button>
              <Link
                to="/signup?tab=token"
                onClick={() => setShowForgotModal(false)}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-gradient-to-r from-[#dfba61] to-[#caa13b] text-slate-950 hover:brightness-105 transition-all shadow-sm"
              >
                Go to Setup Portal →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
