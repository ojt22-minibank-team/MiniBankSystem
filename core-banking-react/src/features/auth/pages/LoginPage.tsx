import { useState, type FormEvent, useEffect, useRef, type ClipboardEvent, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { loginThunk, verifyOtpThunk, resendOtpApi } from '../authSlice';
import Input from '../../../components/common/Input';
import Button from '../../../components/common/Button';

type LoginStep = 'CREDENTIALS' | 'OTP';

export default function LoginPage() {
  const { login, verifyOtp, isLoading, error, isAuthenticated, dismissError } = useAuth();
  const navigate = useNavigate();

  // Step state
  const [step, setStep] = useState<LoginStep>('CREDENTIALS');

  // Step 1: Credentials
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{
    username?: string;
    password?: string;
  }>({});

  // Step 2: OTP
  const [challengeGroupId, setChallengeGroupId] = useState('');
  const [destinationMasked, setDestinationMasked] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [resendCooldown, setResendCooldown] = useState(60);
  const [expiryCountdown, setExpiryCountdown] = useState(300); // 5 minutes
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

  // If already authenticated, redirect immediately to dashboard
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/admin/dashboard', { replace: true });
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

  // Clear error on credential change
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

  const validateCredentials = (): boolean => {
    const errors: { username?: string; password?: string } = {};
    if (!username.trim()) errors.username = 'Username is required.';
    if (!password) errors.password = 'Password is required.';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ============================================================
  // Step 1: Submit Credentials
  // ============================================================
  const handleCredentialsSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateCredentials()) return;

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
          setResendCooldown(60);
          setExpiryCountdown(300);
          setStep('OTP');
          setSuccessInfo('A 6-digit verification code has been sent to your registered email.');
        } else {
          // Direct login (if MFA wasn't required)
          navigate('/admin/dashboard', { replace: true });
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
            : (backendMessage as any)?.message || 'Login failed. Please try again.'
        );
      }
    } catch (err: any) {
      const backendMessage =
        err?.response?.data?.message ||
        err?.message ||
        (typeof err === 'string' ? err : 'Login failed. Please try again.');
      setErrorMessage(
        typeof backendMessage === 'string'
          ? backendMessage
          : (backendMessage as any)?.message || 'Login failed. Please try again.'
      );
    }
  };

  // ============================================================
  // Step 2: OTP Input Handling
  // ============================================================
  const handleDigitChange = (index: number, value: string) => {
    if (errorMessage) setErrorMessage(null);
    if (error) dismissError();

    // Only allow single numeric character
    const cleaned = value.replace(/\D/g, '');
    const newDigits = [...otpDigits];

    if (cleaned.length > 0) {
      newDigits[index] = cleaned[cleaned.length - 1];
      setOtpDigits(newDigits);
      // Auto focus next box
      if (index < 5) {
        otpInputRefs.current[index + 1]?.focus();
      }
    } else {
      newDigits[index] = '';
      setOtpDigits(newDigits);
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
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
        navigate('/admin/dashboard', { replace: true });
      } else if (verifyOtpThunk.rejected.match(result)) {
        const backendMessage =
          (result.payload as string) ||
          (result as any).error?.response?.data?.message ||
          result.error?.message ||
          'OTP verification failed. Please try again.';
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
      setResendCooldown(60);
      setExpiryCountdown(300);
      setSuccessInfo('A new verification code has been sent to your email.');
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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 px-4">
      {/* Background pattern */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-blue-600/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-blue-600/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="rounded-2xl bg-white shadow-2xl overflow-hidden">
          {/* Header banner */}
          <div className="bg-gradient-to-r from-blue-700 to-blue-600 px-8 py-7 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
              {step === 'CREDENTIALS' ? (
                <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              )}
            </div>
            <h1 className="text-2xl font-bold text-white">
              {step === 'CREDENTIALS' ? 'CoreBank' : 'Security Verification'}
            </h1>
            <p className="mt-1 text-sm text-blue-200">
              {step === 'CREDENTIALS'
                ? 'Staff Portal — Secure Login'
                : 'Two-Factor Authentication (OTP)'}
            </p>
          </div>

          {/* Form container */}
          <div className="px-8 py-7">
            {/* Success message banner */}
            {successInfo && (
              <div className="mb-5 flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
                <svg className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm font-medium text-emerald-800">{successInfo}</p>
              </div>
            )}

            {/* Backend error alert */}
            {displayError && (
              <div className="mb-5 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                <svg className="h-5 w-5 text-red-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-800">
                    {step === 'CREDENTIALS' ? 'Login Failed' : 'Verification Failed'}
                  </p>
                  <p className="mt-0.5 text-sm text-red-600">{displayError}</p>
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

            {/* STEP 1: USERNAME & PASSWORD */}
            {step === 'CREDENTIALS' && (
              <form onSubmit={handleCredentialsSubmit} noValidate className="space-y-5">
                {/* Username */}
                <Input
                  label="Username"
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  error={fieldErrors.username}
                  autoComplete="username"
                  autoFocus
                  disabled={isLoading}
                />

                {/* Password */}
                <Input
                  label="Password"
                  id="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  error={fieldErrors.password}
                  showPasswordToggle
                  autoComplete="current-password"
                  disabled={isLoading}
                />

                {/* Submit button */}
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  isLoading={isLoading}
                  className="w-full mt-2"
                >
                  {isLoading ? 'Authenticating...' : 'Sign In'}
                </Button>
              </form>
            )}

            {/* STEP 2: OTP VERIFICATION */}
            {step === 'OTP' && (
              <form onSubmit={handleOtpSubmit} noValidate className="space-y-6">
                <div className="text-center">
                  <p className="text-sm text-gray-600">
                    We sent a verification code to
                  </p>
                  <p className="font-semibold text-gray-900 mt-0.5">
                    {destinationMasked || 'your registered email'}
                  </p>
                </div>

                {/* 6 Digit Input Boxes */}
                <div className="flex justify-between gap-2">
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
                      onKeyDown={(e) => handleKeyDown(idx, e)}
                      onPaste={handlePaste}
                      disabled={isLoading}
                      className="w-12 h-13 text-center text-xl font-bold text-gray-900 rounded-xl border border-gray-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-xs"
                      aria-label={`Digit ${idx + 1}`}
                    />
                  ))}
                </div>

                {/* Expiry countdown indicator */}
                <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
                  <div className="flex items-center gap-1.5">
                    <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>
                      {expiryCountdown > 0 ? (
                        <>Expires in <span className="font-semibold text-gray-700">{formatTime(expiryCountdown)}</span></>
                      ) : (
                        <span className="text-red-500 font-semibold">Code expired</span>
                      )}
                    </span>
                  </div>

                  {/* Resend button */}
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendCooldown > 0 || resending || isLoading}
                    className="font-medium text-blue-600 hover:text-blue-800 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {resending
                      ? 'Sending...'
                      : resendCooldown > 0
                      ? `Resend in ${resendCooldown}s`
                      : 'Resend Code'}
                  </button>
                </div>

                {/* Verify Submit button */}
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  isLoading={isLoading}
                  disabled={otpDigits.join('').length !== 6}
                  className="w-full"
                >
                  {isLoading ? 'Verifying OTP...' : 'Verify & Complete Login'}
                </Button>

                {/* Back to credentials */}
                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={handleBackToLogin}
                    disabled={isLoading}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-800 transition-colors"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back to username & password
                  </button>
                </div>
              </form>
            )}

            {/* Footer note */}
            <p className="mt-6 text-center text-xs text-gray-400">
              Authorized personnel only. All activity is monitored and logged.
            </p>
          </div>
        </div>

        {/* Version badge */}
        <p className="mt-4 text-center text-xs text-slate-500">
          CoreBank Portal &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
