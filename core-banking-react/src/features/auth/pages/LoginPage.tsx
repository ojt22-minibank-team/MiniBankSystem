import { useState, type FormEvent, useEffect, useRef, type ClipboardEvent, type KeyboardEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { loginThunk, verifyOtpThunk, resendOtpApi } from '../authSlice';
import ekarajCrown from '../../../assets/ekaraj-crown-transparent.png';
import ekarajShowcase from '../../../assets/ekaraj-showcase-full.png';

const REMEMBERED_USER_KEY = 'ekaraj_remembered_username';
const LEGACY_REMEMBERED_KEY = 'hiroki_remembered_username';

type LoginStep = 'CREDENTIALS' | 'OTP';

export default function LoginPage() {
  const { login, verifyOtp, isLoading, error, isAuthenticated, isTeller, dismissError } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Step state
  const [step, setStep] = useState<LoginStep>('CREDENTIALS');

  // Step 1: Credentials
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

  const [fieldErrors, setFieldErrors] = useState<{
    username?: string;
    password?: string;
  }>({});

  // Step 2: OTP
  const [challengeGroupId, setChallengeGroupId] = useState('');
  const [destinationMasked, setDestinationMasked] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [resendCooldown, setResendCooldown] = useState(30); // 30 seconds
  const [expiryCountdown, setExpiryCountdown] = useState(60); // 1 minute
  const [resending, setResending] = useState(false);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);

  // Common error state
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const displayError = errorMessage || error;

  const handleDismissError = () => {
    setErrorMessage(null);
    if (error) dismissError();
  };

  // Check for session timeout reason in query params
  useEffect(() => {
    if (searchParams.get('reason') === 'idle_timeout') {
      setErrorMessage('Your session has expired due to inactivity. Please sign in again.');
    }
  }, [searchParams]);

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    if (isAuthenticated) {
      navigate(isTeller ? '/teller/dashboard' : '/admin/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Timers for OTP step
  useEffect(() => {
    if (step !== 'OTP') return;

    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      setExpiryCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [step]);

  // Focus the first OTP box when transitioning to OTP step
  useEffect(() => {
    if (step === 'OTP') {
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 100);
    }
  }, [step]);

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

  const validateCredentials = (): boolean => {
    const errors: { username?: string; password?: string } = {};
    if (!username.trim()) errors.username = 'User Name is required.';
    if (!password) errors.password = 'Password is required.';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ============================================================
  // Step 1: Submit Credentials
  // ============================================================
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateCredentials()) return;

    if (rememberMe) {
      localStorage.setItem(REMEMBERED_USER_KEY, username.trim());
    } else {
      localStorage.removeItem(REMEMBERED_USER_KEY);
      localStorage.removeItem(LEGACY_REMEMBERED_KEY);
    }

    setErrorMessage(null);
    setSuccessInfo(null);
    if (error) dismissError();

    try {
      const result = await login({ username: username.trim(), password });

      if (loginThunk.fulfilled.match(result)) {
        const payload = result.payload;
        if (payload.otpRequired) {
          // Transition to OTP step
          setChallengeGroupId(payload.challengeGroupId || '');
          setDestinationMasked(payload.destinationMasked || '');
          setOtpDigits(['', '', '', '', '', '']);
          setResendCooldown(30);
          setExpiryCountdown(60);
          setStep('OTP');
          setSuccessInfo('A 6-digit verification code has been dispatched to your registered email.');
        } else {
          // Direct login (if MFA wasn't required)
          const isTellerRole = payload?.roles?.some((r: string) => r === 'ROLE_TELLER' || r === 'TELLER');
          navigate(isTellerRole ? '/teller/dashboard' : '/admin/dashboard', { replace: true });
        }
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

  // ============================================================
  // Step 2: OTP Input Handling
  // ============================================================
  const handleDigitChange = (index: number, value: string) => {
    if (errorMessage) setErrorMessage(null);
    if (error) dismissError();

    const cleaned = value.replace(/\D/g, '');
    const newDigits = [...otpDigits];

    if (cleaned.length > 0) {
      newDigits[index] = cleaned[cleaned.length - 1];
      setOtpDigits(newDigits);
      if (index < 5) {
        otpInputRefs.current[index + 1]?.focus();
      }
    } else {
      newDigits[index] = '';
      setOtpDigits(newDigits);
    }
  };

  const handleOtpKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim().replace(/\D/g, '');
    if (!pastedData) return;

    const newDigits = [...otpDigits];
    for (let i = 0; i < 6; i++) {
      if (i < pastedData.length) {
        newDigits[i] = pastedData[i];
      }
    }
    setOtpDigits(newDigits);

    const focusIndex = Math.min(pastedData.length, 5);
    otpInputRefs.current[focusIndex]?.focus();
  };

  // ============================================================
  // Step 2: Submit OTP Verification
  // ============================================================
  const handleOtpSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fullOtp = otpDigits.join('');

    if (fullOtp.length !== 6) {
      setErrorMessage('Please enter the full 6-digit OTP code.');
      return;
    }

    setErrorMessage(null);
    setSuccessInfo(null);
    if (error) dismissError();

    try {
      const result = await verifyOtp(challengeGroupId, fullOtp);

      if (verifyOtpThunk.fulfilled.match(result)) {
        const isTellerRole = result.payload?.roles?.some((r: string) => r === 'ROLE_TELLER' || r === 'TELLER');
        navigate(isTellerRole ? '/teller/dashboard' : '/admin/dashboard', { replace: true });
      } else if (verifyOtpThunk.rejected.match(result)) {
        const backendMessage =
          (result.payload as string) ||
          (result as any).error?.response?.data?.message ||
          result.error?.message ||
          'OTP verification failed. Please check the code.';
        setErrorMessage(
          typeof backendMessage === 'string'
            ? backendMessage
            : (backendMessage as any)?.message || 'OTP verification failed. Please try again.'
        );
      }
    } catch (err: any) {
      const backendMessage =
        err?.response?.data?.message ||
        err?.message ||
        (typeof err === 'string' ? err : 'OTP verification failed. Please try again.');
      setErrorMessage(
        typeof backendMessage === 'string'
          ? backendMessage
          : (backendMessage as any)?.message || 'OTP verification failed. Please try again.'
      );
    }
  };

  // ============================================================
  // Step 2: Resend OTP
  // ============================================================
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || resending) return;

    setResending(true);
    setErrorMessage(null);
    setSuccessInfo(null);
    if (error) dismissError();

    try {
      const res = await resendOtpApi(challengeGroupId);
      if (res.challengeGroupId) {
        setChallengeGroupId(res.challengeGroupId);
      }
      setOtpDigits(['', '', '', '', '', '']);
      setResendCooldown(30);
      setExpiryCountdown(60);
      setSuccessInfo('A new verification code has been dispatched to your email.');
      otpInputRefs.current[0]?.focus();
    } catch (err: any) {
      const backendMessage =
        err?.response?.data?.message ||
        err?.message ||
        'Unable to resend OTP. Please try again later.';
      setErrorMessage(
        typeof backendMessage === 'string'
          ? backendMessage
          : (backendMessage as any)?.message || 'Unable to resend OTP.'
      );
    } finally {
      setResending(false);
    }
  };

  // Format countdown seconds into mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleBackToLogin = () => {
    setStep('CREDENTIALS');
    setErrorMessage(null);
    setSuccessInfo(null);
    if (error) dismissError();
    setOtpDigits(['', '', '', '', '', '']);
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-[#e8f1f4] p-4 sm:p-6 lg:p-8 select-none">
      {/* Background Soft Ambient Glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-[600px] w-[600px] rounded-full bg-cyan-100/35 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-[600px] w-[600px] rounded-full bg-amber-100/25 blur-3xl" />
      </div>

      {/* Main Container Card (Rounded-3xl, pure white with elegant shadow) */}
      <div className="relative z-10 w-full max-w-[1020px] rounded-[32px] sm:rounded-[36px] bg-white shadow-[0_25px_60px_-15px_rgba(26,58,110,0.12),0_10px_25px_-5px_rgba(0,0,0,0.04)] border border-slate-100 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">

        {/* ============================================================ */}
        {/* LEFT COLUMN: Modern EKARAJ Login Form & Branding */}
        {/* ============================================================ */}
        <div className="lg:col-span-7 p-6 sm:p-10 lg:p-12 flex flex-col justify-between">
          <div>
            {/* Header: Royal Crown + Bank Title */}
            <div className="flex items-center gap-3">
              <img
                src={ekarajCrown}
                alt="EKARAJ BANK"
                className="h-9 w-auto object-contain drop-shadow-sm select-none"
              />
              <div className="flex flex-col">
                <span className="text-sm font-black tracking-widest text-[#caa13b] uppercase">
                  EKARAJ BANK
                </span>
                <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">
                  Royal Excellence in Modern Core Banking
                </span>
              </div>
            </div>

            {/* Title / Welcome Message */}
            <div className="mt-8">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1a3a6e] tracking-tight">
                {step === 'CREDENTIALS' ? 'Welcome to Ekaraj Bank' : 'Security Verification'}
              </h1>
              <p className="mt-2 text-xs sm:text-sm text-slate-500 leading-relaxed">
                {step === 'CREDENTIALS' ? (
                  'Enter your secure staff credentials to access the central banking operations panel.'
                ) : (
                  <>
                    Two-Factor Authentication: We dispatched a 6-digit verification code to{' '}
                    <span className="font-semibold text-slate-800">
                      {destinationMasked || 'your registered staff email'}
                    </span>.
                  </>
                )}
              </p>
            </div>

            {/* Error Message Banner */}
            {displayError && (
              <div className="mt-5 rounded-xl border border-red-200 bg-red-50/90 p-3.5 flex items-start justify-between gap-3 animate-in fade-in duration-200 shadow-xs">
                <div className="flex items-start gap-2.5">
                  <svg className="h-4 w-4 text-red-600 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <p className="text-xs font-semibold text-red-700 leading-snug">
                    {displayError}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDismissError}
                  className="text-red-400 hover:text-red-600 focus:outline-none cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Success / OTP Info Banner */}
            {successInfo && (
              <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50/90 p-3.5 flex items-start gap-2.5 animate-in fade-in duration-200 shadow-xs">
                <svg className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs font-semibold text-emerald-800 leading-snug">
                  {successInfo}
                </p>
              </div>
            )}

            {/* ============================================================ */}
            {/* STEP 1: USERNAME & PASSWORD FORM */}
            {/* ============================================================ */}
            {step === 'CREDENTIALS' && (
              <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
                {/* Username Input */}
                <div>
                  <label
                    htmlFor="username"
                    className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
                  >
                    User Name
                  </label>
                  <div className="relative">
                    <input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(e) => handleUsernameChange(e.target.value)}
                      placeholder="e.g. staff"
                      disabled={isLoading}
                      autoComplete="username"
                      autoFocus
                      className={`w-full rounded-xl border ${
                        fieldErrors.username
                          ? 'border-red-400 bg-red-50/30 text-red-900 focus:border-red-500 focus:ring-red-200'
                          : 'border-slate-200 bg-slate-50/70 text-slate-900 focus:border-[#dfba61] focus:ring-[#dfba61]/20'
                      } px-4 py-3 text-sm placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-4 transition-all font-medium`}
                    />
                  </div>
                  {fieldErrors.username && (
                    <p className="mt-1 text-[11px] font-semibold text-red-600">
                      {fieldErrors.username}
                    </p>
                  )}
                </div>

                {/* Password Input */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="password"
                      className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
                    >
                      Password
                    </label>
                    {capsLockActive && (
                      <span className="text-[10px] font-bold text-amber-600 animate-pulse">
                        CAPS LOCK IS ACTIVE
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => handlePasswordChange(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Enter your confidential password"
                      disabled={isLoading}
                      autoComplete="current-password"
                      className={`w-full rounded-xl border ${
                        fieldErrors.password
                          ? 'border-red-400 bg-red-50/30 text-red-900 focus:border-red-500 focus:ring-red-200'
                          : 'border-slate-200 bg-slate-50/70 text-slate-900 focus:border-[#dfba61] focus:ring-[#dfba61]/20'
                      } px-4 py-3 pr-11 text-sm placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-4 transition-all font-medium`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isLoading}
                      className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
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
                  {fieldErrors.password && (
                    <p className="mt-1 text-[11px] font-semibold text-red-600">
                      {fieldErrors.password}
                    </p>
                  )}
                </div>

                {/* Remember Me & Forgot Password */}
                <div className="flex items-center pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      disabled={isLoading}
                      className="h-4 w-4 rounded border-slate-300 text-[#1a3a6e] focus:ring-[#dfba61]"
                    />
                    <span className="text-xs font-semibold text-slate-600">
                      Remember ID
                    </span>
                  </label>
                </div>

                {/* Sign In CTA Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full rounded-xl bg-gradient-to-r from-[#1a3a6e] via-[#152e57] to-[#0f2342] text-white py-3.5 px-4 text-sm font-bold shadow-lg shadow-blue-950/20 hover:shadow-xl hover:shadow-blue-950/30 hover:brightness-110 active:brightness-95 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isLoading && (
                      <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    )}
                    <span>{isLoading ? 'Signing in...' : 'Sign In'}</span>
                  </button>
                </div>

                
              </form>
            )}

            {/* ============================================================ */}
            {/* STEP 2: OTP VERIFICATION */}
            {/* ============================================================ */}
            {step === 'OTP' && (
              <form onSubmit={handleOtpSubmit} noValidate className="mt-6 space-y-6">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 text-center">
                    Enter 6-Digit Verification Code
                  </label>

                  {/* 6 Digit Input Boxes */}
                  <div className="flex justify-center gap-2 sm:gap-3">
                    {otpDigits.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => { otpInputRefs.current[idx] = el; }}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleDigitChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        onPaste={handlePaste}
                        disabled={isLoading}
                        className="w-11 sm:w-12 h-13 text-center text-xl font-bold font-mono text-slate-900 rounded-xl border border-slate-200 bg-slate-50/80 focus:border-[#dfba61] focus:ring-4 focus:ring-[#dfba61]/20 focus:bg-white outline-none transition-all shadow-xs"
                        aria-label={`Digit ${idx + 1}`}
                      />
                    ))}
                  </div>
                </div>

                {/* Expiry countdown indicator & Resend button */}
                <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                  <div className="flex items-center gap-1.5">
                    <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>
                      {expiryCountdown > 0 ? (
                        <>Code expires in <span className="font-bold text-slate-800">{formatTime(expiryCountdown)}</span></>
                      ) : (
                        <span className="text-red-500 font-bold">Code expired</span>
                      )}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendCooldown > 0 || resending || isLoading}
                    className="font-bold text-[#caa13b] hover:text-[#b08b2e] disabled:text-slate-400 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    {resending
                      ? 'Sending...'
                      : resendCooldown > 0
                      ? `Resend in ${resendCooldown}s`
                      : 'Resend Code'}
                  </button>
                </div>

                {/* Verify Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading || otpDigits.join('').length !== 6}
                  className="w-full rounded-xl bg-gradient-to-r from-[#1a3a6e] via-[#152e57] to-[#0f2342] text-white py-3.5 px-4 text-sm font-bold shadow-lg shadow-blue-950/20 hover:shadow-xl hover:shadow-blue-950/30 hover:brightness-110 active:brightness-95 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isLoading && (
                    <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  )}
                  <span>{isLoading ? 'Verifying OTP...' : 'Verify & Complete Login'}</span>
                </button>

                {/* Back to credentials */}
                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={handleBackToLogin}
                    disabled={isLoading}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#1a3a6e] transition-colors cursor-pointer"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back to username & password
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Secure Footer Note */}
          <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="text-slate-600 font-medium">
              Authorized Staff Gateway
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
        {/* RIGHT COLUMN: Pristine Full-Res Showcase Card */}
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

      </div>
  );
}
