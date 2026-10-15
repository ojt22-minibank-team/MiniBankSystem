import { useState, type FormEvent, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../../lib/redux';
import { forceLogout } from '../authSlice';
import { authApi } from '../../../services/apiClient';
import Input from '../../../components/common/Input';
import Button from '../../../components/common/Button';
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

      // Scoped session cleanup: clear any existing session (such as an admin session
      // active in the same browser) from both Redux state and localStorage.
      // This ensures that when the user navigates to /login, they are not automatically
      // redirected to the Admin Dashboard and can log in with their new credentials.
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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 px-4">
      {/* Background ambient lighting */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-blue-600/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-emerald-600/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="rounded-2xl bg-white shadow-2xl overflow-hidden">
          {/* Header banner */}
          <div className="bg-gradient-to-r from-blue-700 to-indigo-700 px-8 py-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
              <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white">CoreBank Security</h1>
            <p className="mt-1 text-sm text-blue-200">Staff Account Credential Setup</p>
          </div>

          <div className="px-8 py-8">
            {isSuccess ? (
              <div className="text-center py-6">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900">Password Setup Complete!</h2>
                <p className="mt-2 text-sm text-gray-600">
                  Your credentials have been configured securely. Redirecting to login portal in 3 seconds...
                </p>
                <div className="mt-6">
                  <Link
                    to="/login"
                    className="inline-flex items-center text-sm font-semibold text-blue-600 hover:text-blue-800"
                  >
                    Go to Login Immediately →
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                {apiError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {apiError}
                  </div>
                )}

                <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 text-xs text-blue-800">
                  Please configure a permanent password (8–72 characters) for your staff account.
                </div>

                <Input
                  label="Setup Token"
                  placeholder="Paste security setup token"
                  value={token}
                  onChange={(e) => {
                    setToken(e.target.value);
                    if (fieldErrors.token) setFieldErrors({ ...fieldErrors, token: '' });
                  }}
                  error={fieldErrors.token}
                  disabled={isLoading}
                  required
                />

                <Input
                  label="New Password"
                  type="password"
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
                />

                <Input
                  label="Confirm Password"
                  type="password"
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
                />

                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="w-full"
                    isLoading={isLoading}
                  >
                    Set Password & Activate
                  </Button>
                </div>

                <div className="text-center pt-2">
                  <Link to="/login" className="text-xs text-gray-500 hover:text-gray-700">
                    Back to Login
                  </Link>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
