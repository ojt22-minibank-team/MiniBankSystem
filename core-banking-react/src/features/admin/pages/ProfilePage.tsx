import { useEffect, useState, useMemo } from 'react';
import AdminLayout from '../../../components/layout/AdminLayout';
import StaffEditModal from '../components/StaffEditModal';
import StaffResetPasswordModal from '../components/StaffResetPasswordModal';
import { staffApi } from '../../../services/apiClient';
import type { StaffResponse } from '../../../types/api.types';
import type { AxiosError } from 'axios';
import { useAuth } from '../../auth/hooks/useAuth';
import ekarajCrown from '../../../assets/ekaraj-crown-transparent.png';

export default function ProfilePage() {
  const { user } = useAuth();
  const [staff, setStaff] = useState<StaffResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modals state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);

  // Inline Quick Edit state
  const [isInlineEditing, setIsInlineEditing] = useState(false);
  const [inlineForm, setInlineForm] = useState({
    fullName: '',
    email: '',
    phone: '',
  });
  const [inlineErrors, setInlineErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadProfile = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await staffApi.getAll();
      const currentUsername = user?.username?.trim().toLowerCase();
      // Match current authenticated user
      let matched = res.data.find(
        (s) => s.username?.trim().toLowerCase() === currentUsername,
      );

      // Fallback: if username not matched directly, find by admin role
      if (!matched && res.data.length > 0) {
        matched = res.data.find(
          (s) =>
            (s.roleCode || (s.staffNo?.includes('ADM') ? 'ADMIN' : '')).toUpperCase() === 'ADMIN',
        ) || res.data[0];
      }

      if (matched) {
        setStaff(matched);
        setInlineForm({
          fullName: matched.fullName || '',
          email: matched.email || '',
          phone: matched.phone || '',
        });
      } else {
        setError('No staff profile record found for the current user.');
      }
    } catch (err) {
      const axErr = err as AxiosError<{ message?: string }>;
      if (axErr.response?.status === 403) {
        setError('Access denied. You do not have permission to view staff records.');
      } else {
        setError(axErr.response?.data?.message || 'Failed to load profile details.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleShowSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => {
      setSuccessMessage(null);
    }, 4500);
  };

  const roleCode = useMemo(() => {
    if (!staff) return (user?.roles?.[0]?.replace('ROLE_', '') || 'ADMIN').toUpperCase();
    return (
      staff.roleCode ||
      (staff.staffNo?.includes('TLR')
        ? 'TELLER'
        : staff.staffNo?.includes('AUD')
        ? 'AUDITOR'
        : staff.staffNo?.includes('ADM')
        ? 'ADMIN'
        : 'STAFF')
    ).toUpperCase();
  }, [staff, user]);

  const roleDisplayName = useMemo(() => {
    if (staff?.roleName) return staff.roleName;
    if (roleCode === 'ADMIN') return 'Administrator';
    if (roleCode === 'AUDITOR') return 'Auditor';
    if (roleCode === 'TELLER') return 'Teller / Cashier';
    return roleCode;
  }, [staff, roleCode]);

  // Inline Edit Validation
  const validateInlineForm = () => {
    const errs: Record<string, string> = {};
    if (!inlineForm.fullName.trim()) errs.fullName = 'Full name is required.';
    if (!inlineForm.email.trim()) {
      errs.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inlineForm.email.trim())) {
      errs.email = 'Please enter a valid email address.';
    }
    if (!inlineForm.phone.trim()) errs.phone = 'Phone number is required.';
    setInlineErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleInlineSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staff) return;
    if (!validateInlineForm()) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const res = await staffApi.update(staff.staffId, {
        fullName: inlineForm.fullName.trim(),
        email: inlineForm.email.trim(),
        phone: inlineForm.phone.trim(),
      });
      setStaff(res.data);
      setIsInlineEditing(false);
      handleShowSuccess('Profile information updated successfully.');
    } catch (err) {
      const axErr = err as AxiosError<{ message?: string }>;
      setError(axErr.response?.data?.message || 'Failed to update profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelInline = () => {
    if (staff) {
      setInlineForm({
        fullName: staff.fullName || '',
        email: staff.email || '',
        phone: staff.phone || '',
      });
    }
    setInlineErrors({});
    setIsInlineEditing(false);
  };

  return (
    <AdminLayout pageTitle="Profile">
      <div className="max-w-[1440px] mx-auto space-y-6">

        {/* ── Page Header ────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
          <div>
            <h2 className="text-2xl sm:text-[28px] font-black text-[#1E1B4B] tracking-tight flex items-center gap-2.5">
              <span>Admin Profile & Security Settings</span>
              <span className="status-pill-purple text-[10px] uppercase font-bold tracking-wider">
                {roleDisplayName}
              </span>
            </h2>
            <p className="mt-0.5 text-xs sm:text-sm text-zinc-500 font-medium">
              Ekaraj Bank Core Banking RBAC Identity: Manage administrative credentials, contact details, and account security
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={loadProfile}
              disabled={isLoading}
              className="flex items-center gap-2 rounded-full border border-purple-950/15 bg-white/80 px-4 py-2 text-xs font-bold text-[#1E1B4B] hover:bg-white shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              <svg
                className={['h-4 w-4', isLoading ? 'animate-spin' : ''].join(' ')}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Refresh</span>
            </button>

            <button
              type="button"
              disabled={!staff || isLoading}
              onClick={() => setIsEditModalOpen(true)}
              className="flex items-center gap-2 rounded-full border border-purple-950/20 bg-white/90 px-4.5 py-2 text-xs font-bold text-[#1E1B4B] hover:bg-[#1E1B4B] hover:text-white shadow-xs transition-all disabled:opacity-50 cursor-pointer"
            >
              <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span>Edit Information</span>
            </button>

            <button
              type="button"
              disabled={!staff || isLoading}
              onClick={() => setIsResetPasswordModalOpen(true)}
              className="btn-liquid-gold px-5 py-2 text-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <svg className="h-4 w-4 text-[#1E1B4B]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              <span>Reset Password</span>
            </button>
          </div>
        </div>

        {/* ── Success Toast Alert ─────────────────────────────────── */}
        {successMessage && (
          <div className="flex items-center justify-between rounded-2xl bg-emerald-50 border border-emerald-200/80 p-4 text-emerald-800 shadow-xs animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500 text-white shrink-0">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-bold text-emerald-900">Operation Successful</p>
                <p className="text-xs text-emerald-700">{successMessage}</p>
              </div>
            </div>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-emerald-600 hover:text-emerald-900 text-xs font-semibold px-2 py-1"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* ── Error Alert ─────────────────────────────────────────── */}
        {error && (
          <div className="flex items-center justify-between rounded-2xl bg-rose-50 border border-rose-200/80 p-4 text-rose-800 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-500 text-white shrink-0">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <p className="text-xs font-semibold text-rose-800">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-rose-600 hover:text-rose-900 text-xs font-semibold px-2 py-1"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* ── Main Hero Card: Liquid Glass Admin Identity ─────────── */}
        <div className="liquid-glass-card rounded-3xl p-6 sm:p-8 relative overflow-hidden border border-white/90 shadow-[0_15px_40px_-5px_rgba(30,27,75,0.06)]">
          {/* Subtle Ambient Radial Accents */}
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gradient-to-br from-amber-400/20 via-sky-400/10 to-transparent blur-3xl" />
          <div className="pointer-events-none absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-gradient-to-tr from-purple-500/15 via-indigo-400/10 to-transparent blur-3xl" />

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              {/* Avatar with Crown Badge */}
              <div className="relative shrink-0">
                <div className="flex h-20 w-20 sm:h-22 sm:w-22 items-center justify-center rounded-3xl bg-gradient-to-br from-[#1E1B4B] via-indigo-900 to-sky-700 text-white text-3xl font-black shadow-xl shadow-[#1E1B4B]/20 ring-4 ring-white">
                  {(staff?.fullName || staff?.username || user?.username || 'A').charAt(0).toUpperCase()}
                </div>
                <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-md">
                  <img
                    src={ekarajCrown}
                    alt="Crown"
                    className="h-5 w-5 object-contain"
                  />
                </div>
              </div>

              {/* Title & Identifiers */}
              <div className="space-y-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black text-[#1E1B4B] tracking-tight">
                    {staff?.fullName || user?.username || 'System Administrator'}
                  </h1>
                  <span className="status-pill-purple text-xs font-bold px-3 py-0.5">
                    {roleDisplayName}
                  </span>
                  <span className={staff?.status === 'ACTIVE' ? 'status-pill-emerald text-xs' : 'status-pill-crimson text-xs'}>
                    {staff?.status || 'ACTIVE'}
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-zinc-500 font-medium flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-bold text-[#1E1B4B]">
                    @{staff?.username || user?.username || 'admin'}
                  </span>
                  <span className="text-zinc-300">•</span>
                  <span className="font-mono text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded-md font-semibold text-xs">
                    Staff No: {staff?.staffNo || 'ADM-0001'}
                  </span>
                  <span className="text-zinc-300">•</span>
                  <span className="text-zinc-500 font-medium">
                    Branch: Head Office Operations
                  </span>
                </p>
              </div>
            </div>

            {/* Quick Action Badges */}
            <div className="flex items-center gap-2 self-stretch md:self-auto justify-end">
              <button
                type="button"
                onClick={() => setIsInlineEditing((prev) => !prev)}
                className="flex-1 md:flex-none flex items-center justify-center gap-1.5 rounded-xl border border-purple-950/15 bg-white/80 px-4 py-2.5 text-xs font-bold text-[#1E1B4B] hover:bg-white shadow-xs transition-all cursor-pointer"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                <span>{isInlineEditing ? 'Close Form' : 'Quick Edit'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsResetPasswordModalOpen(true)}
                className="flex-1 md:flex-none flex items-center justify-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition-all cursor-pointer"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span>Change Password</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── 3 Summary KPI Cards ─────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {/* Card 1: Account Identity */}
          <div className="liquid-glass-card rounded-3xl p-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                System Identity
              </span>
              <span className="status-pill-purple text-[10px]">RBAC Level 1</span>
            </div>
            <div className="mt-3 space-y-1">
              <p className="text-lg font-bold text-slate-900 font-mono">
                {staff?.staffNo || 'ADM-0001'}
              </p>
              <p className="text-xs text-zinc-500 font-medium truncate">
                User ID: {staff?.staffId ? `${staff.staffId.slice(0, 13)}...` : 'System Principal'}
              </p>
            </div>
          </div>

          {/* Card 2: Security & Token Status */}
          <div className="liquid-glass-card rounded-3xl p-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Security Credential
              </span>
              <span className="status-pill-emerald text-[10px]">Encrypted</span>
            </div>
            <div className="mt-3 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-slate-900 font-sans">
                  {staff?.mustChangePassword ? 'Reset Pending' : 'Password Active'}
                </span>
              </div>
              <p className="text-xs text-zinc-500 font-medium">
                Last Active: {staff?.lastLoginAt ? new Date(staff.lastLoginAt).toLocaleString() : 'Active session'}
              </p>
            </div>
          </div>

          {/* Card 3: Permissions & Privilege */}
          <div className="liquid-glass-card rounded-3xl p-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Authority Scope
              </span>
              <span className="status-pill-amber text-[10px]">Tier 1 Admin</span>
            </div>
            <div className="mt-3 space-y-1">
              <p className="text-lg font-bold text-slate-900">
                Full Oversight
              </p>
              <p className="text-xs text-zinc-500 font-medium">
                Rules, Personnel, OTC, Analytics
              </p>
            </div>
          </div>
        </div>

        {/* ── Two Column Actionable Section ──────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left Column (2 Cols): Personal Information & Inline Edit */}
          <div className="lg:col-span-2 space-y-6">
            <div className="liquid-glass-card rounded-3xl p-6 sm:p-7 border border-white/90">
              <div className="flex items-center justify-between pb-4 border-b border-purple-950/5">
                <div>
                  <h3 className="text-base font-black text-[#1E1B4B] tracking-tight">
                    Personal & Contact Information
                  </h3>
                  <p className="text-xs text-zinc-500 font-medium">
                    {isInlineEditing
                      ? 'Modify your personnel record and contact credentials'
                      : 'Official personnel directory details registered for core banking'}
                  </p>
                </div>

                {!isInlineEditing ? (
                  <button
                    type="button"
                    onClick={() => setIsInlineEditing(true)}
                    className="flex items-center gap-1.5 rounded-full border border-purple-950/15 bg-white/80 px-3.5 py-1.5 text-xs font-bold text-[#1E1B4B] hover:bg-[#1E1B4B] hover:text-white transition-all cursor-pointer shadow-xs"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    <span>Edit Info</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleCancelInline}
                    className="text-xs font-bold text-zinc-500 hover:text-zinc-800 px-3 py-1.5"
                  >
                    Cancel
                  </button>
                )}
              </div>

              {isInlineEditing ? (
                /* Inline Edit Form */
                <form onSubmit={handleInlineSave} className="mt-5 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Username (Read-Only)
                      </label>
                      <input
                        type="text"
                        value={staff?.username || user?.username || ''}
                        disabled
                        className="w-full rounded-xl border border-slate-200 bg-slate-100/70 px-3.5 py-2.5 text-xs font-mono font-semibold text-slate-500 cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Staff Number (Read-Only)
                      </label>
                      <input
                        type="text"
                        value={staff?.staffNo || ''}
                        disabled
                        className="w-full rounded-xl border border-slate-200 bg-slate-100/70 px-3.5 py-2.5 text-xs font-mono font-semibold text-slate-500 cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Full Legal Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={inlineForm.fullName}
                      onChange={(e) => {
                        setInlineForm({ ...inlineForm, fullName: e.target.value });
                        if (inlineErrors.fullName) setInlineErrors({ ...inlineErrors, fullName: '' });
                      }}
                      placeholder="e.g. Daw Aye Thida"
                      className={`w-full rounded-xl border px-3.5 py-2.5 text-xs font-semibold text-slate-800 transition-all focus:outline-none focus:ring-2 ${
                        inlineErrors.fullName
                          ? 'border-red-400 focus:ring-red-300 bg-red-50/20'
                          : 'border-slate-300 focus:border-indigo-600 focus:ring-indigo-100 bg-white'
                      }`}
                    />
                    {inlineErrors.fullName && (
                      <p className="mt-1 text-[11px] font-medium text-red-600">{inlineErrors.fullName}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Email Address <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        value={inlineForm.email}
                        onChange={(e) => {
                          setInlineForm({ ...inlineForm, email: e.target.value });
                          if (inlineErrors.email) setInlineErrors({ ...inlineErrors, email: '' });
                        }}
                        placeholder="admin@ekarajbank.com.mm"
                        className={`w-full rounded-xl border px-3.5 py-2.5 text-xs font-semibold text-slate-800 transition-all focus:outline-none focus:ring-2 ${
                          inlineErrors.email
                            ? 'border-red-400 focus:ring-red-300 bg-red-50/20'
                            : 'border-slate-300 focus:border-indigo-600 focus:ring-indigo-100 bg-white'
                        }`}
                      />
                      {inlineErrors.email && (
                        <p className="mt-1 text-[11px] font-medium text-red-600">{inlineErrors.email}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Phone Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={inlineForm.phone}
                        onChange={(e) => {
                          setInlineForm({ ...inlineForm, phone: e.target.value });
                          if (inlineErrors.phone) setInlineErrors({ ...inlineErrors, phone: '' });
                        }}
                        placeholder="0912345678"
                        className={`w-full rounded-xl border px-3.5 py-2.5 text-xs font-semibold text-slate-800 transition-all focus:outline-none focus:ring-2 ${
                          inlineErrors.phone
                            ? 'border-red-400 focus:ring-red-300 bg-red-50/20'
                            : 'border-slate-300 focus:border-indigo-600 focus:ring-indigo-100 bg-white'
                        }`}
                      />
                      {inlineErrors.phone && (
                        <p className="mt-1 text-[11px] font-medium text-red-600">{inlineErrors.phone}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-purple-950/5">
                    <button
                      type="button"
                      onClick={handleCancelInline}
                      disabled={isSubmitting}
                      className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="btn-liquid-gold px-6 py-2 text-xs font-bold flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isSubmitting && (
                        <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      )}
                      <span>Save Changes</span>
                    </button>
                  </div>
                </form>
              ) : (
                /* Information Read-Only View */
                <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-y-5 gap-x-6">
                  <div>
                    <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                      Full Legal Name
                    </span>
                    <p className="text-sm font-bold text-slate-900 mt-1">
                      {staff?.fullName || '—'}
                    </p>
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                      Assigned System Role
                    </span>
                    <p className="text-sm font-bold text-slate-900 mt-1 flex items-center gap-2">
                      <span>{roleDisplayName}</span>
                      <span className="status-pill-purple text-[10px] py-0 px-2 font-mono">
                        {roleCode}
                      </span>
                    </p>
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                      Official Email Address
                    </span>
                    <p className="text-sm font-medium text-slate-800 mt-1 flex items-center gap-1.5">
                      <svg className="h-4 w-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span className="truncate">{staff?.email || '—'}</span>
                    </p>
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                      Work Phone Number
                    </span>
                    <p className="text-sm font-medium text-slate-800 mt-1 flex items-center gap-1.5">
                      <svg className="h-4 w-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <span className="font-mono">{staff?.phone || '—'}</span>
                    </p>
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                      Account Registered On
                    </span>
                    <p className="text-xs font-medium text-zinc-600 mt-1 font-mono">
                      {staff?.createdAt ? new Date(staff.createdAt).toLocaleString() : 'System Genesis'}
                    </p>
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                      Last Updated
                    </span>
                    <p className="text-xs font-medium text-zinc-600 mt-1 font-mono">
                      {staff?.updatedAt ? new Date(staff.updatedAt).toLocaleString() : 'Recently'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Actionable Privileges & Oversight Scope */}
            <div className="liquid-glass-card rounded-3xl p-6 sm:p-7 border border-white/90">
              <h3 className="text-base font-black text-[#1E1B4B] tracking-tight mb-1">
                Administrative Permissions & System Authority
              </h3>
              <p className="text-xs text-zinc-500 font-medium mb-4">
                Assigned RBAC privileges associated with your administrator credential
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/70 border border-purple-950/5">
                  <div className="h-6 w-6 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 font-bold">
                    ✓
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">Staff Personnel Administration</p>
                    <p className="text-zinc-500 text-[11px] mt-0.5">
                      Provision tellers, cashiers, auditors; manage role assignments and account lifecycles.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/70 border border-purple-950/5">
                  <div className="h-6 w-6 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center shrink-0 font-bold">
                    ✓
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">Financial Rules & Fee Parameters</p>
                    <p className="text-zinc-500 text-[11px] mt-0.5">
                      Configure dynamic interest thresholds, fee schedules, and global overdraft limits.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/70 border border-purple-950/5">
                  <div className="h-6 w-6 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 font-bold">
                    ✓
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">Operational Analytics & Reports</p>
                    <p className="text-zinc-500 text-[11px] mt-0.5">
                      Inspect vault balances, KYC compliance metrics, liquidity ratios, and transactional velocity.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/70 border border-purple-950/5">
                  <div className="h-6 w-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-bold">
                    ✓
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">Complete Audit Trail Oversight</p>
                    <p className="text-zinc-500 text-[11px] mt-0.5">
                      Verify cryptographic non-repudiation event logs across all staff actions.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column (1 Col): Security & Password Action Center */}
          <div className="space-y-6">

            {/* Actionable Password Management Card */}
            <div className="liquid-glass-card rounded-3xl p-6 sm:p-7 border border-white/90">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-md shadow-amber-500/20">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#1E1B4B] tracking-tight">
                    Credential & Password Control
                  </h3>
                  <p className="text-[11px] text-zinc-500 font-medium">
                    Self-service credential maintenance
                  </p>
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-4 space-y-3 mb-5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500 font-medium">Credential Status:</span>
                  <span className="font-bold text-emerald-700">Healthy & Verified</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500 font-medium">Force Change on Next Login:</span>
                  <span className={`font-bold ${staff?.mustChangePassword ? 'text-amber-600' : 'text-zinc-600'}`}>
                    {staff?.mustChangePassword ? 'REQUIRED' : 'No'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500 font-medium">Two-Factor Authentication:</span>
                  <span className="font-bold text-indigo-700">Enforced by Policy</span>
                </div>
              </div>

              <p className="text-xs text-zinc-600 leading-relaxed mb-5">
                Triggering a password reset will generate an encrypted, single-use authentication token link sent to your registered email address.
              </p>

              <button
                type="button"
                disabled={!staff || isLoading}
                onClick={() => setIsResetPasswordModalOpen(true)}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-3 text-xs font-bold text-white shadow-md shadow-amber-500/20 hover:from-amber-600 hover:to-amber-700 transition-all cursor-pointer disabled:opacity-50"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                <span>Issue Password Reset Link</span>
              </button>
            </div>

            {/* Quick Security Tips */}
            <div className="liquid-glass-card rounded-3xl p-6 border border-white/90 space-y-3">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Security Recommendations
                </h4>
              </div>
              <ul className="text-xs text-zinc-500 space-y-2 list-disc list-inside leading-relaxed font-medium">
                <li>Never share your administrative username or password token.</li>
                <li>Ensure your contact phone and email are current for OTP verification.</li>
                <li>Log out when leaving the workstation terminal unattended.</li>
              </ul>
            </div>

          </div>
        </div>

      </div>

      {/* ── Modals Reused from Staff Action Center ──────────────── */}
      <StaffEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        staff={staff}
        onSuccess={() => {
          loadProfile();
          handleShowSuccess('Staff information updated successfully.');
        }}
      />

      <StaffResetPasswordModal
        isOpen={isResetPasswordModalOpen}
        onClose={() => setIsResetPasswordModalOpen(false)}
        staff={staff}
        onSuccess={() => {
          loadProfile();
          handleShowSuccess('Password reset link issued successfully.');
        }}
      />
    </AdminLayout>
  );
}
