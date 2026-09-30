import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/hooks/useAuth';
import AdminLayout from '../../../components/layout/AdminLayout';
import { staffApi } from '../../../services/apiClient';
import { announcementsApi } from '../../../services/apiClient';
import { systemRulesApi } from '../../../services/apiClient';
import type {
  StaffResponse,
  AnnouncementResponse,
  SystemParameterResponse,
} from '../../../types/api.types';
import type { AxiosError } from 'axios';

// ============================================================
// Stat card component
// ============================================================

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
  onClick?: () => void;
}

function StatCard({ title, value, icon, color, subtitle, onClick }: StatCardProps) {
  return (
    <div
      onClick={onClick}
      className={[
        'rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all',
        onClick ? 'cursor-pointer hover:shadow-md hover:border-blue-300' : '',
      ].join(' ')}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
          {subtitle && (
            <p className="mt-1 text-xs text-gray-400">{subtitle}</p>
          )}
        </div>
        <div className={`flex h-14 w-14 items-center justify-center rounded-xl ${color}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Dashboard page
// ============================================================

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [staff, setStaff] = useState<StaffResponse[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementResponse[]>([]);
  const [parameters, setParameters] = useState<SystemParameterResponse[]>([]);
  const [staffLoading, setStaffLoading] = useState(true);
  const [announcementsLoading, setAnnouncementsLoading] = useState(true);
  const [rulesLoading, setRulesLoading] = useState(true);
  const [staffError, setStaffError] = useState<string | null>(null);
  const [announcementsError, setAnnouncementsError] = useState<string | null>(null);

  useEffect(() => {
    setStaffLoading(true);
    staffApi
      .getAll()
      .then((res) => setStaff(res.data))
      .catch((err: AxiosError) => {
        setStaffError(
          err.response?.status === 403
            ? 'Access denied.'
            : 'Failed to load staff data.',
        );
      })
      .finally(() => setStaffLoading(false));

    setAnnouncementsLoading(true);
    announcementsApi
      .getAll()
      .then((res) => setAnnouncements(res.data))
      .catch((err: AxiosError) => {
        setAnnouncementsError(
          err.response?.status === 403
            ? 'Access denied.'
            : 'Failed to load announcements.',
        );
      })
      .finally(() => setAnnouncementsLoading(false));

    setRulesLoading(true);
    systemRulesApi
      .getAllParameters()
      .then((res) => setParameters(res.data))
      .catch(() => {})
      .finally(() => setRulesLoading(false));
  }, []);

  const activeStaff = staff.filter((s) => s.status === 'ACTIVE').length;
  const activeAnnouncements = announcements.filter((a) => a.isActive).length;

  return (
    <AdminLayout pageTitle="Dashboard">
      {/* Welcome banner */}
      <div className="mb-6 rounded-xl bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 p-6 text-white shadow">
        <p className="text-sm font-medium text-blue-200">Welcome back,</p>
        <h2 className="mt-1 text-2xl font-bold">{user?.username}</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {user?.roles?.map((role) => (
            <span
              key={role}
              className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold"
            >
              {role}
            </span>
          ))}
        </div>
        <p className="mt-3 text-xs text-blue-200">
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4 mb-8">
        {/* Total staff */}
        <StatCard
          title="Staff Management"
          value={staffLoading ? '—' : staff.length}
          subtitle={staffLoading ? undefined : `${activeStaff} active staff`}
          color="bg-blue-100 text-blue-700"
          onClick={() => navigate('/admin/staff')}
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
        />

        {/* System Rules */}
        <StatCard
          title="System Rules"
          value={rulesLoading ? '—' : parameters.length}
          subtitle={rulesLoading ? undefined : 'Active parameters'}
          color="bg-teal-100 text-teal-700"
          onClick={() => navigate('/admin/system-rules')}
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
        />

        {/* Announcements */}
        <StatCard
          title="Announcements"
          value={announcementsLoading ? '—' : announcements.length}
          subtitle={announcementsLoading ? undefined : `${activeAnnouncements} active`}
          color="bg-purple-100 text-purple-700"
          onClick={() => navigate('/admin/announcements')}
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
            </svg>
          }
        />

        {/* Your role */}
        <StatCard
          title="Your Role"
          value={user?.roles?.[0] ?? '—'}
          subtitle="Current session"
          color="bg-amber-100 text-amber-700"
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          }
        />
      </div>

      {/* Two column panels */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Staff */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <h3 className="text-sm font-semibold text-gray-800">Recent Staff</h3>
            <button
              onClick={() => navigate('/admin/staff')}
              className="text-xs font-medium text-blue-600 hover:underline"
            >
              Manage staff →
            </button>
          </div>

          <div className="divide-y divide-gray-50">
            {staffLoading ? (
              <div className="flex items-center justify-center py-10">
                <svg className="h-6 w-6 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            ) : staffError ? (
              <div className="px-6 py-8 text-center text-sm text-red-500">{staffError}</div>
            ) : staff.length === 0 ? (
              <div className="px-6 py-8 text-center text-sm text-gray-400">No staff found.</div>
            ) : (
              staff.slice(0, 5).map((s) => (
                <div key={s.staffId} className="flex items-center gap-3 px-6 py-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700 shrink-0">
                    {s.username?.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-800">{s.username}</p>
                    <p className="truncate text-xs text-gray-400">{s.email ?? '—'}</p>
                  </div>
                  <span
                    className={[
                      'rounded-full px-2 py-0.5 text-xs font-medium shrink-0',
                      s.status === 'ACTIVE'
                        ? 'bg-green-100 text-green-700'
                        : s.status === 'SUSPENDED'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-red-100 text-red-700',
                    ].join(' ')}
                  >
                    {s.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Announcements */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <h3 className="text-sm font-semibold text-gray-800">Announcements</h3>
            <button
              onClick={() => navigate('/admin/announcements')}
              className="text-xs font-medium text-blue-600 hover:underline"
            >
              Manage →
            </button>
          </div>

          <div className="divide-y divide-gray-50">
            {announcementsLoading ? (
              <div className="flex items-center justify-center py-10">
                <svg className="h-6 w-6 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            ) : announcementsError ? (
              <div className="px-6 py-8 text-center text-sm text-red-500">{announcementsError}</div>
            ) : announcements.length === 0 ? (
              <div className="px-6 py-8 text-center text-sm text-gray-400">No announcements.</div>
            ) : (
              announcements.slice(0, 5).map((a) => (
                <div key={a.id} className="px-6 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-gray-800 leading-snug">{a.title}</p>
                    <span
                      className={[
                        'shrink-0 rounded-full px-2 py-0.5 text-xs font-medium',
                        a.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500',
                      ].join(' ')}
                    >
                      {a.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-gray-400">
                    By {a.createdBy} · {new Date(a.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
