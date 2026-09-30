import { useEffect, useState } from 'react';
import AdminLayout from '../../../components/layout/AdminLayout';
import Button from '../../../components/common/Button';
import Modal from '../../../components/common/Modal';
import { announcementsApi } from '../../../services/apiClient';
import type { AnnouncementResponse } from '../../../types/api.types';
import type { AxiosError } from 'axios';

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<AnnouncementResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createContent, setCreateContent] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const loadAnnouncements = () => {
    setIsLoading(true);
    setError(null);
    announcementsApi
      .getAll()
      .then((res) => setAnnouncements(res.data))
      .catch((err: AxiosError) => {
        if (err.response?.status === 403) {
          setError('You do not have permission to view announcements.');
        } else {
          setError('Failed to load announcements. Please try again.');
        }
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { loadAnnouncements(); }, []);

  const handleCreate = async () => {
    if (!createTitle.trim() || !createContent.trim()) {
      setCreateError('Title and content are required.');
      return;
    }
    setCreateLoading(true);
    setCreateError(null);
    try {
      await announcementsApi.create({ title: createTitle.trim(), content: createContent.trim() });
      setShowCreateModal(false);
      setCreateTitle('');
      setCreateContent('');
      loadAnnouncements();
    } catch (err) {
      const axErr = err as AxiosError<{ message?: string }>;
      setCreateError(axErr.response?.data?.message ?? 'Failed to create announcement.');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDeactivate = async (id: number) => {
    try {
      await announcementsApi.deactivate(id);
      loadAnnouncements();
    } catch {
      alert('Failed to deactivate announcement.');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) return;
    try {
      await announcementsApi.delete(id);
      loadAnnouncements();
    } catch {
      alert('Failed to delete announcement.');
    }
  };

  return (
    <AdminLayout pageTitle="Announcements">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Announcements</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            Manage system-wide announcements for staff.
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
          <Button
            variant="primary"
            size="md"
            onClick={() => setShowCreateModal(true)}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New Announcement
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 mb-6">
          <p className="font-semibold">Error</p>
          <p className="mt-1">{error}</p>
        </div>
      )}

      {/* Loading */}
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
          <p className="mt-4 text-sm font-medium text-gray-500">No announcements yet.</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-3 text-sm font-medium text-blue-600 hover:underline"
          >
            Create your first announcement →
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((a) => (
            <div
              key={a.id}
              className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-semibold text-gray-900">{a.title}</h3>
                    <span
                      className={[
                        'rounded-full px-2.5 py-0.5 text-xs font-semibold',
                        a.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500',
                      ].join(' ')}
                    >
                      {a.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm text-gray-600 leading-relaxed">{a.content}</p>
                  <p className="mt-2 text-xs text-gray-400">
                    Created by <span className="font-medium text-gray-600">{a.createdBy}</span> ·{' '}
                    {new Date(a.createdAt).toLocaleString()}
                    {a.updatedBy && (
                      <> · Updated by <span className="font-medium text-gray-600">{a.updatedBy}</span></>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {a.isActive && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleDeactivate(a.id)}
                    >
                      Deactivate
                    </Button>
                  )}
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDelete(a.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setCreateError(null);
        }}
        title="New Announcement"
        footer={
          <>
            <Button variant="secondary" size="md" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="md" isLoading={createLoading} onClick={handleCreate}>
              Publish
            </Button>
          </>
        }
      >
        {createError && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {createError}
          </div>
        )}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={createTitle}
              onChange={(e) => setCreateTitle(e.target.value)}
              placeholder="Announcement title"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
            <textarea
              value={createContent}
              onChange={(e) => setCreateContent(e.target.value)}
              placeholder="Announcement content..."
              rows={4}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
          </div>
        </div>
      </Modal>
    </AdminLayout>
  );
}
