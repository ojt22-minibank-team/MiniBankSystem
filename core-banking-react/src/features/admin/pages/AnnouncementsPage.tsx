import { useEffect, useMemo, useState } from 'react';
import AdminLayout from '../../../components/layout/AdminLayout';
import Button from '../../../components/common/Button';
import Modal from '../../../components/common/Modal';
import { announcementsApi } from '../../../services/apiClient';
import { useAuth } from '../../auth/hooks/useAuth';
import type {
  AnnouncementResponse,
  AnnouncementAudience,
  AnnouncementCreateRequest,
} from '../../../types/api.types';
import type { AxiosError } from 'axios';

// ── Constants ────────────────────────────────────────────────────────
const PAGE_SIZE = 10;
const MYANMAR_TZ = 'Asia/Rangoon'; // UTC+06:30

type StatusView = 'ALL' | 'EXPIRED';

function nowMs(): number {
  return Date.now();
}

function formatMMDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { timeZone: MYANMAR_TZ });
}

function getCurrentMMLocalDateTime(): string {
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: MYANMAR_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return formatter.format(new Date()).replace(' ', 'T');
}

function isAnnouncementActive(a: AnnouncementResponse): boolean {
  const now = nowMs();
  const start = a.startsAt ? new Date(a.startsAt).getTime() : -Infinity;
  const end = a.endsAt ? new Date(a.endsAt).getTime() : Infinity;
  return now >= start && now <= end;
}

export default function AnnouncementsPage() {
  const { isTeller } = useAuth();
  const [announcements, setAnnouncements] = useState<AnnouncementResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Filter & pagination state ────────────────────────────────────
  const [statusView, setStatusView] = useState<StatusView>('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  // ── Bulk delete state ────────────────────────────────────────────
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // ── Create modal state ───────────────────────────────────────────
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createMessage, setCreateMessage] = useState('');
  const [createAudience, setCreateAudience] = useState<AnnouncementAudience>('ALL');

  const [createStartsAt, setCreateStartsAt] = useState('');
  const [createEndsAt, setCreateEndsAt] = useState('');

  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const minDateTime = getCurrentMMLocalDateTime();

  const loadAnnouncements = () => {
    setIsLoading(true);
    setError(null);
    const fetch = isTeller ? announcementsApi.getActive() : announcementsApi.getAll();
    fetch
      .then((res) => setAnnouncements(res.data))
      .catch((err: AxiosError) => {
        if (err.response?.status === 403) {
          setError('You do not have permission to view announcements.');
        } else {
          setError('Failed to load announcements. Please verify backend is running.');
        }
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadAnnouncements();
  }, [isTeller]);

  const filtered = useMemo(() => {
    if (statusView === 'EXPIRED') {
      return announcements.filter((a) => !isAnnouncementActive(a));
    }
    return announcements;
  }, [announcements, statusView]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  useEffect(() => {
    setCurrentPage(1);
  }, [statusView]);

  const pageData = useMemo(
    () => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filtered, currentPage],
  );

  const activeCount = useMemo(
    () => announcements.filter((a) => isAnnouncementActive(a)).length,
    [announcements],
  );

  const expiredCount = useMemo(
    () => announcements.filter((a) => !isAnnouncementActive(a)).length,
    [announcements],
  );

  const handleCreate = async () => {
    if (!createTitle.trim() || !createMessage.trim() || !createStartsAt || !createEndsAt) {
      setCreateError('Title, message, start date, and end date are required.');
      return;
    }

    if (new Date(createEndsAt) <= new Date(createStartsAt)) {
      setCreateError('End date and time must be after the start date and time.');
      return;
    }

    setCreateLoading(true);
    setCreateError(null);
    try {
      const payload: AnnouncementCreateRequest = {
        title: createTitle.trim(),
        message: createMessage.trim(),
        audience: createAudience,
        startsAt: new Date(createStartsAt).toISOString(),
        endsAt: new Date(createEndsAt).toISOString(),
      };

      await announcementsApi.create(payload);
      setShowCreateModal(false);

      setCreateTitle('');
      setCreateMessage('');
      setCreateAudience('ALL');
      setCreateStartsAt('');
      setCreateEndsAt('');

      loadAnnouncements();
    } catch (err) {
      const axErr = err as AxiosError<{ message?: string }>;
      setCreateError(axErr.response?.data?.message ?? 'Failed to create announcement.');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDeactivate = async (announcementId: number) => {
    try {
      await announcementsApi.deactivate(announcementId);
      loadAnnouncements();
    } catch {
      alert('Failed to deactivate announcement.');
    }
  };

  const handleSoftDelete = async (announcementId: number) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) return;
    try {
      await announcementsApi.softDelete(announcementId);
      loadAnnouncements();
    } catch {
      alert('Failed to delete announcement.');
    }
  };

  const handleBulkSoftDeleteExpired = async () => {
    if (expiredCount === 0) {
      alert('There are no expired announcements to delete.');
      return;
    }
    if (
      !window.confirm(
        `Are you sure you want to delete all ${expiredCount} expired announcement${expiredCount !== 1 ? 's' : ''}? This action cannot be undone.`,
      )
    )
      return;

    setBulkDeleting(true);
    try {
      await announcementsApi.bulkSoftDeleteExpired();
      loadAnnouncements();
    } catch {
      alert('Failed to delete expired announcements. Please try again.');
      loadAnnouncements();
    } finally {
      setBulkDeleting(false);
    }
  };

  return (
    <AdminLayout pageTitle="Announcements">
      <div className="max-w-[1440px] mx-auto space-y-6">

        {/* ── Page header ──────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
          <div>
            <h2 className="text-2xl sm:text-[28px] font-black text-[#1E1B4B] tracking-tight">
              Announcements & Broadcast Notices
            </h2>
            <p className="mt-0.5 text-xs sm:text-sm text-zinc-500 font-medium">
              Ekaraj Bank Communications: System-wide alerts, maintenance broadcasts, and client bulletins
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadAnnouncements}
              className="flex items-center gap-2 rounded-full border border-purple-950/15 bg-white/80 px-4 py-2 text-xs font-bold text-[#1E1B4B] hover:bg-white shadow-xs transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Refresh</span>
            </button>

            {!isTeller && (
              <button
                type="button"
                disabled={expiredCount === 0 || bulkDeleting}
                onClick={handleBulkSoftDeleteExpired}
                className="flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-50/80 px-4 py-2 text-xs font-bold text-red-700 hover:bg-red-100 disabled:opacity-40 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>Delete Expired{expiredCount > 0 && ` (${expiredCount})`}</span>
              </button>
            )}

            {!isTeller && (
              <button
                type="button"
                onClick={() => {
                  setCreateError(null);
                  setShowCreateModal(true);
                }}
                className="btn-liquid-gold px-5 py-2 text-xs flex items-center gap-2"
              >
                <svg className="h-4 w-4 text-[#1E1B4B]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                <span>New Announcement</span>
              </button>
            )}
          </div>
        </div>

        {/* 3 Summary KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)]">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Bulletins
            </span>
            <div className="flex items-baseline justify-between mt-3">
              <span className="text-2xl sm:text-[28px] font-bold text-slate-900 font-mono tabular-nums">
                {announcements.length}
              </span>
              <span className="status-pill-emerald text-[11px]">
                Audit Retained
              </span>
            </div>
          </div>

          <div className="glass-panel p-6">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
              Active Broadcasts
            </span>
            <div className="flex items-baseline justify-between mt-3">
              <span className="text-2xl sm:text-[28px] font-black text-[#1E1B4B] font-mono tabular-nums">
                {activeCount}
              </span>
              <span className="status-pill-emerald text-[11px]">
                Live in Portals
              </span>
            </div>
          </div>

          <div className="glass-panel p-6">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
              Expired Broadcasts
            </span>
            <div className="flex items-baseline justify-between mt-3">
              <span className="text-2xl sm:text-[28px] font-black text-[#1E1B4B] font-mono tabular-nums">
                {expiredCount}
              </span>
              <span className="status-pill-amber text-[11px]">
                Past Validity
              </span>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-500/30 bg-red-50/80 backdrop-blur-md px-5 py-4 text-xs font-semibold text-red-700">
            <p className="font-bold">Notice</p>
            <p className="mt-1">{error}</p>
          </div>
        )}

        {/* ── Filter Toolbar ────────────────────────────────────────────── */}
        {!isLoading && announcements.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <select
              value={statusView}
              onChange={(e) => setStatusView(e.target.value as StatusView)}
              className="rounded-full border border-purple-950/15 bg-white/80 px-4 py-2 text-xs font-semibold text-[#1E1B4B] focus:outline-none focus:ring-2 focus:ring-amber-400/25"
            >
              <option value="ALL">All Announcements</option>
              <option value="EXPIRED">Expired Only</option>
            </select>
            <p className="text-xs font-medium text-zinc-500">
              Showing {pageData.length} of {filtered.length} broadcast message{filtered.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}

        {/* ── Content ──────────────────────────────────────────────── */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <svg className="h-8 w-8 animate-spin text-amber-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : announcements.length === 0 ? (
          <div className="glass-panel p-16 text-center space-y-3">
            <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-2xl bg-purple-100 text-[#1E1B4B] text-xl">
              📢
            </div>
            <p className="text-sm font-bold text-zinc-700">No announcements published yet.</p>
            {!isTeller && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn-liquid-gold px-5 py-2 text-xs inline-flex items-center gap-1.5"
              >
                Create your first announcement →
              </button>
            )}
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass-panel p-16 text-center">
            <p className="text-sm font-bold text-zinc-500">No announcements match the selected filter.</p>
          </div>
        ) : (
          <>
            {/* ── Announcement cards ──────────────── */}
            <div className="space-y-4">
              {pageData.map((a) => {
                const active = isAnnouncementActive(a);
                return (
                  <div
                    key={a.announcementId}
                    className="glass-panel p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md space-y-3"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-black text-[#1E1B4B] tracking-tight">{a.title}</h3>
                          <span className={active ? 'status-pill-emerald' : 'status-pill-amber'}>
                            {active ? 'Active' : 'Expired'}
                          </span>
                          <span className="status-pill-purple">
                            Audience: {a.audience}
                          </span>
                        </div>
                        <p className="mt-2 text-xs sm:text-sm text-zinc-700 leading-relaxed whitespace-pre-line font-medium">
                          {a.message}
                        </p>

                        {/* Date range display */}
                        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-zinc-400 font-medium">
                          {a.startsAt && (
                            <span>📅 Start: {formatMMDateTime(a.startsAt)}</span>
                          )}
                          {a.startsAt && a.endsAt && <span>·</span>}
                          {a.endsAt && (
                            <span>🔚 End: {formatMMDateTime(a.endsAt)}</span>
                          )}
                        </div>

                        <p className="mt-1 text-[11px] text-zinc-400">
                          ID #{a.announcementId} · Published {formatMMDateTime(a.createdAt)}
                          {a.updatedAt && a.updatedAt !== a.createdAt && (
                            <> · Updated {formatMMDateTime(a.updatedAt)}</>
                          )}
                        </p>
                      </div>

                      {/* Action buttons */}
                      {!isTeller && (
                        <div className="flex items-center gap-2 shrink-0">
                          {active && (
                            <button
                              type="button"
                              onClick={() => handleDeactivate(a.announcementId)}
                              className="rounded-full border border-purple-950/15 bg-white/80 px-3.5 py-1 text-xs font-bold text-[#1E1B4B] hover:bg-white transition-colors"
                            >
                              Deactivate
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleSoftDelete(a.announcementId)}
                            className="rounded-full px-3.5 py-1 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Pagination ──────────────────────────────────────── */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-500">
                  Page {currentPage} of {totalPages}
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="rounded-full border border-purple-950/15 bg-white/80 px-3.5 py-1.5 text-xs font-bold text-[#1E1B4B] hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    ← Prev
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(
                      (p) =>
                        p === 1 ||
                        p === totalPages ||
                        Math.abs(p - currentPage) <= 2,
                    )
                    .reduce<(number | 'ellipsis')[]>((acc, p, idx, arr) => {
                      if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('ellipsis');
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((item, idx) =>
                      item === 'ellipsis' ? (
                        <span key={`e-${idx}`} className="px-2 text-zinc-400">…</span>
                      ) : (
                        <button
                          key={item}
                          onClick={() => setCurrentPage(item)}
                          className={[
                            'rounded-full px-3 py-1.5 text-xs font-bold transition-all',
                            item === currentPage
                              ? 'bg-[#1E1B4B] text-amber-300 shadow-sm'
                              : 'border border-purple-950/10 bg-white/70 text-zinc-700 hover:bg-white',
                          ].join(' ')}
                        >
                          {item}
                        </button>
                      ),
                    )}

                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="rounded-full border border-purple-950/15 bg-white/80 px-3.5 py-1.5 text-xs font-bold text-[#1E1B4B] hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Create Modal ─────────────────────────────────────────── */}
        <Modal
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            setCreateError(null);
          }}
          title="Publish Broadcast Announcement"
          size="md"
          footer={
            <>
              <Button
                variant="secondary"
                size="md"
                onClick={() => setShowCreateModal(false)}
                disabled={createLoading}
              >
                Cancel
              </Button>
              <Button
                variant="gold"
                size="md"
                isLoading={createLoading}
                onClick={handleCreate}
              >
                Publish Announcement
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            {createError && (
              <div className="rounded-xl border border-red-500/30 bg-red-50/80 p-3 text-xs font-semibold text-red-700">
                {createError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-[#1E1B4B] uppercase tracking-wider mb-1.5">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className="w-full rounded-xl border border-purple-950/15 bg-white/80 px-3.5 py-2.5 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-400/25"
                placeholder="e.g. Scheduled System Maintenance"
                value={createTitle}
                onChange={(e) => setCreateTitle(e.target.value)}
                disabled={createLoading}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1E1B4B] uppercase tracking-wider mb-1.5">
                Target Audience <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full rounded-xl border border-purple-950/15 bg-white/80 px-3.5 py-2.5 text-xs font-semibold text-[#1E1B4B] focus:outline-none focus:ring-2 focus:ring-amber-400/25"
                value={createAudience}
                onChange={(e) => setCreateAudience(e.target.value as AnnouncementAudience)}
                disabled={createLoading}
              >
                <option value="ALL">All (Staff &amp; Customers)</option>
                <option value="STAFF">Staff Only</option>
                <option value="CUSTOMERS">Customers Only</option>
              </select>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-[#1E1B4B] uppercase tracking-wider mb-1.5">
                  Start Date &amp; Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  className="w-full rounded-xl border border-purple-950/15 bg-white/80 px-3.5 py-2.5 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-400/25"
                  value={createStartsAt}
                  onChange={(e) => setCreateStartsAt(e.target.value)}
                  disabled={createLoading}
                  min={minDateTime}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#1E1B4B] uppercase tracking-wider mb-1.5">
                  End Date &amp; Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  className="w-full rounded-xl border border-purple-950/15 bg-white/80 px-3.5 py-2.5 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-400/25"
                  value={createEndsAt}
                  onChange={(e) => setCreateEndsAt(e.target.value)}
                  disabled={createLoading}
                  min={createStartsAt || minDateTime}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1E1B4B] uppercase tracking-wider mb-1.5">
                Message Content <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={4}
                className="w-full rounded-xl border border-purple-950/15 bg-white/80 px-3.5 py-2.5 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-400/25"
                placeholder="Provide complete details of the announcement..."
                value={createMessage}
                onChange={(e) => setCreateMessage(e.target.value)}
                disabled={createLoading}
              />
            </div>
          </div>
        </Modal>
      </div>
    </AdminLayout>
  );
}
