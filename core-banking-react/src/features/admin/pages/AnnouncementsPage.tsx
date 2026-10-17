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

// ── Myanmar-timezone helpers ─────────────────────────────────────────

/** Current instant expressed as epoch-ms (timezone-independent). */
function nowMs(): number {
  return Date.now();
}

/**
 * Format an ISO / UTC date string for display in Myanmar timezone.
 * Falls back to the browser's default locale formatting.
 */
function formatMMDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { timeZone: MYANMAR_TZ });
}

/**
 * Return the current Myanmar local time in `YYYY-MM-DDThh:mm` format
 * suitable for an `<input type="datetime-local">` min value.
 */
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
  // sv-SE locale gives "YYYY-MM-DD HH:mm" → replace space with T
  return formatter.format(new Date()).replace(' ', 'T');
}

/** Dynamically compute whether an announcement is currently active. */
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

  // Date and Time states
  const [createStartsAt, setCreateStartsAt] = useState('');
  const [createEndsAt, setCreateEndsAt] = useState('');

  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // လက်ရှိ Local အချိန်ကို datetime-local input ဖတ်နိုင်တဲ့ ပုံစံ (YYYY-MM-DDThh:mm) ပြောင်းပေးခြင်း
  const minDateTime = getCurrentMMLocalDateTime();

  // ── Fetch (backend already filters out isDeleted=true) ───────────
  const loadAnnouncements = () => {
    setIsLoading(true);
    setError(null);
    // Tellers use the public endpoint; Admins/Auditors use the admin endpoint
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

  // ── Derived: filtered list ───────────────────────────────────────
  const filtered = useMemo(() => {
    if (statusView === 'EXPIRED') {
      return announcements.filter((a) => !isAnnouncementActive(a));
    }
    return announcements;
  }, [announcements, statusView]);

  // ── Pagination helpers ───────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [statusView]);

  const pageData = useMemo(
    () => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filtered, currentPage],
  );

  // Count of expired announcements (used by the bulk-delete button)
  const expiredCount = useMemo(
    () => announcements.filter((a) => !isAnnouncementActive(a)).length,
    [announcements],
  );

  // ── Handlers ─────────────────────────────────────────────────────
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
        endsAt: new Date(createEndsAt).toISOString(), // Backend Entity အတိုင်း endsAt ကို အသုံးပြုထားပါသည်
      };

      await announcementsApi.create(payload);
      setShowCreateModal(false);

      // Reset form
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

  /** Soft-delete a single announcement (sets isDeleted = true on backend). */
  const handleSoftDelete = async (announcementId: number) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) return;
    try {
      await announcementsApi.softDelete(announcementId);
      loadAnnouncements();
    } catch {
      alert('Failed to delete announcement.');
    }
  };

  /** Bulk soft-delete all expired announcements via dedicated backend endpoint. */
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

  // ── Render ──────────────────────────────────────────────────────
  return (
    <AdminLayout pageTitle="Announcements">
      {/* ── Page header ──────────────────────────────────────────── */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">System Announcements</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            Publish broadcast messages, maintenance alerts, and system notices.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadAnnouncements}
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>

          {/* Bulk Soft-Delete Expired button — Admin/Auditor only */}
          {!isTeller && (
            <Button
              variant="danger"
              size="md"
              disabled={expiredCount === 0 || bulkDeleting}
              isLoading={bulkDeleting}
              onClick={handleBulkSoftDeleteExpired}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete Expired{expiredCount > 0 && ` (${expiredCount})`}
            </Button>
          )}

          {/* New Announcement button — Admin/Auditor only */}
          {!isTeller && (
            <Button
              variant="primary"
              size="md"
              onClick={() => {
                setCreateError(null);
                setShowCreateModal(true);
              }}
            >
              + New Announcement
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          <p className="font-semibold">Notice</p>
          <p className="mt-1">{error}</p>
        </div>
      )}

      {/* ── Toolbar: filter + summary ────────────────────────────── */}
      {!isLoading && announcements.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <select
            value={statusView}
            onChange={(e) => setStatusView(e.target.value as StatusView)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="ALL">All Announcements</option>
            <option value="EXPIRED">Expired Only</option>
          </select>
          <p className="text-sm text-gray-500">
            Showing {pageData.length} of {filtered.length} announcement{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}

      {/* ── Content ──────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <svg className="h-8 w-8 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : announcements.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white px-8 py-16 text-center">
          <svg className="mx-auto h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
          </svg>
          <p className="mt-4 text-sm font-medium text-gray-500">No announcements published yet.</p>
          {!isTeller && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-3 text-sm font-medium text-blue-600 hover:underline"
            >
              Create your first announcement →
            </button>
          )}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white px-8 py-16 text-center">
          <p className="text-sm font-medium text-gray-500">No announcements match the selected filter.</p>
        </div>
      ) : (
        <>
          {/* ── Announcement cards (current page) ──────────────── */}
          <div className="space-y-4">
            {pageData.map((a) => {
              const active = isAnnouncementActive(a);
              return (
                <div
                  key={a.announcementId}
                  className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-semibold text-gray-900">{a.title}</h3>
                        <span
                          className={[
                            'rounded-full px-2.5 py-0.5 text-xs font-semibold',
                            active
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-500',
                          ].join(' ')}
                        >
                          {active ? 'Active' : 'Expired'}
                        </span>
                        <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                          Audience: {a.audience}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-gray-700 leading-relaxed whitespace-pre-line">{a.message}</p>

                      {/* Date range display (Myanmar timezone) */}
                      <p className="mt-2 text-xs text-gray-400">
                        {a.startsAt && (
                          <>📅 Start: {formatMMDateTime(a.startsAt)}</>
                        )}
                        {a.startsAt && a.endsAt && ' · '}
                        {a.endsAt && (
                          <>🔚 End: {formatMMDateTime(a.endsAt)}</>
                        )}
                      </p>

                      <p className="mt-1 text-xs text-gray-400">
                        ID #{a.announcementId} · Published {formatMMDateTime(a.createdAt)}
                        {a.updatedAt && a.updatedAt !== a.createdAt && (
                          <> · Updated {formatMMDateTime(a.updatedAt)}</>
                        )}
                      </p>
                    </div>

                    {/* Action buttons — hidden from Tellers */}
                    {!isTeller && (
                      <div className="flex items-center gap-2 shrink-0">
                        {active && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleDeactivate(a.announcementId)}
                          >
                            Deactivate
                          </Button>
                        )}
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleSoftDelete(a.announcementId)}
                        >
                          Delete
                        </Button>
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
              <span className="text-sm text-gray-500">
                Page {currentPage} of {totalPages}
              </span>

              <div className="flex items-center gap-1">
                {/* Previous */}
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  ← Prev
                </button>

                {/* Page numbers (show up to 5 around current) */}
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
                      <span key={`e-${idx}`} className="px-2 text-gray-400">…</span>
                    ) : (
                      <button
                        key={item}
                        onClick={() => setCurrentPage(item)}
                        className={[
                          'rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
                          item === currentPage
                            ? 'border-blue-600 bg-blue-600 text-white'
                            : 'border-gray-300 text-gray-700 hover:bg-gray-50',
                        ].join(' ')}
                      >
                        {item}
                      </button>
                    ),
                  )}

                {/* Next */}
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
        title="Create Broadcast Announcement"
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
              variant="primary"
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
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {createError}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="e.g. Scheduled System Maintenance"
              value={createTitle}
              onChange={(e) => setCreateTitle(e.target.value)}
              disabled={createLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Target Audience <span className="text-red-500">*</span>
            </label>
            <select
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date &amp; Time <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={createStartsAt}
                onChange={(e) => setCreateStartsAt(e.target.value)}
                disabled={createLoading}
                min={minDateTime}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date &amp; Time <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={createEndsAt}
                onChange={(e) => setCreateEndsAt(e.target.value)}
                disabled={createLoading}
                min={createStartsAt || minDateTime}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message Content <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={4}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Provide complete details of the announcement..."
              value={createMessage}
              onChange={(e) => setCreateMessage(e.target.value)}
              disabled={createLoading}
            />
          </div>
        </div>
      </Modal>
    </AdminLayout>
  );
}