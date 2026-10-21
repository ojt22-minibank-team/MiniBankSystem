import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Landmark, Lock, User, AlertCircle, ShieldCheck } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const LoginView: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const toast = useToast();

  const [username, setUsername] = useState<string>('teller1');
  const [password, setPassword] = useState<string>('password123');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      // Connect to Spring Boot backend login
      const response = await axios.post('http://localhost:8080/api/auth/login', {
        username,
        password,
      });

      if (response.data && response.data.token) {
        login(response.data.token, {
          username: username,
          fullName: response.data.fullName || username,
          role: response.data.role || 'ROLE_STAFF',
          id: response.data.id || response.data.staffId || 1,
        });

        toast.success('Signed In Successfully', `Welcome back, ${username}!`);
        navigate('/dashboard');
        return;
      }
      throw new Error('Invalid token response from server.');
    } catch (err: any) {
      // If backend login fails, provide option or display clear message
      const message =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Authentication failed. Please verify credentials.';
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  // Quick bypass for development/testing if backend auth is offline
  const handleDevBypass = () => {
    const dummyToken = 'dev-staff-token-' + Date.now();
    login(dummyToken, {
      username: username || 'bank_teller',
      fullName: 'Senior Branch Teller',
      role: 'ROLE_STAFF',
      id: 1,
    });
    toast.info('Staff Session Activated', 'Logged in to Core Banking Staff Portal.');
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen w-full bg-[#0B192C] flex items-center justify-center p-4">
      {/* Background radial highlight */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent pointer-events-none" />

      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200/80 p-8 sm:p-10">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-800 text-white flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-900/30">
            <Landmark className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">
            CORE BANKING SYSTEM
          </h1>
          <p className="text-xs font-semibold text-blue-700 tracking-wider uppercase mt-1">
            Group 2 Staff Administration Portal
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-6 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold">Sign-in Notice:</span> {errorMsg}
            </div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Staff Username</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                placeholder="e.g. teller1 or admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 text-xs font-bold text-white bg-[#0B192C] hover:bg-[#1E3E62] disabled:bg-slate-400 rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              {loading ? 'Authenticating Staff...' : 'Sign In to Portal'}
            </button>
          </div>
        </form>

        {/* Development Helper / Demo bypass */}
        <div className="mt-6 pt-5 border-t border-slate-100 text-center">
          <button
            type="button"
            onClick={handleDevBypass}
            className="text-[11px] font-semibold text-blue-700 hover:underline"
          >
            Offline / Local Development Bypass →
          </button>
          <div className="text-[10px] text-slate-400 mt-2">
            🔒 Authorized Group 2 Bank Personnel Only. Localhost:8080 API.
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginView;
