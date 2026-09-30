import { useState, type FormEvent, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { loginThunk } from '../authSlice';
import Input from '../../../components/common/Input';
import Button from '../../../components/common/Button';

export default function LoginPage() {
  const { login, isLoading, error, isAuthenticated, isAdmin, dismissError } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{
    username?: string;
    password?: string;
  }>({});

  // If already authenticated, redirect immediately
  useEffect(() => {
    if (isAuthenticated) {
      navigate(isAdmin ? '/admin/dashboard' : '/login', { replace: true });
    }
  }, [isAuthenticated, isAdmin, navigate]);

  // Clear backend error when user starts typing
  const handleUsernameChange = (value: string) => {
    setUsername(value);
    if (error) dismissError();
    if (fieldErrors.username) setFieldErrors((e) => ({ ...e, username: undefined }));
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (error) dismissError();
    if (fieldErrors.password) setFieldErrors((e) => ({ ...e, password: undefined }));
  };

  const validate = (): boolean => {
    const errors: { username?: string; password?: string } = {};
    if (!username.trim()) errors.username = 'Username is required.';
    if (!password) errors.password = 'Password is required.';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validate()) return;

    const result = await login({ username: username.trim(), password });

    if (loginThunk.fulfilled.match(result)) {
      const roles: string[] = result.payload.roles ?? [];
      if (roles.includes('ADMIN')) {
        navigate('/admin/dashboard', { replace: true });
      } else {
        // Non-admin authenticated user — redirect to dashboard (backend enforces authorization)
        navigate('/admin/dashboard', { replace: true });
      }
    }
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
          <div className="bg-gradient-to-r from-blue-700 to-blue-600 px-8 py-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
              <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white">CoreBank</h1>
            <p className="mt-1 text-sm text-blue-200">Staff Portal — Secure Login</p>
          </div>

          {/* Form */}
          <div className="px-8 py-8">
            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              {/* Backend error alert */}
              {error && (
                <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                  <svg className="h-5 w-5 text-red-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-800">Login Failed</p>
                    <p className="mt-0.5 text-sm text-red-600">{error}</p>
                  </div>
                  <button
                    type="button"
                    onClick={dismissError}
                    className="shrink-0 text-red-400 hover:text-red-600 focus:outline-none"
                    aria-label="Dismiss error"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}

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

              {/* Submit */}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isLoading}
                className="w-full mt-2"
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>

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
