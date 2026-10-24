
import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCheck,
  Megaphone,
  RefreshCw,
} from "lucide-react";

import { useAppDispatch, useAppSelector } from "../../../../lib/redux";

import {
  clearAnnouncementErrors,
  fetchAnnouncements,
  markAllAnnouncementsRead,
  toggleAnnouncementRead,
} from "../store/announcementSlice";

import AnnouncementList from "../components/AnnouncementList";

import type { AnnouncementFilter } from "../types/announcementTypes";

const filters: {
  value: AnnouncementFilter;
  label: string;
}[] = [
  { value: "ALL", label: "All" },
  { value: "UNREAD", label: "Unread" },
  { value: "READ", label: "Read" },
];

export default function AnnouncementsPage() {
  const dispatch = useAppDispatch();

  const {
    announcements,
    loading,
    hasLoaded,
    error,
    pendingIds,
    isMarkingAllRead,
    actionError,
  } = useAppSelector((state) => state.announcements);

  const [filter, setFilter] = useState<AnnouncementFilter>("ALL");

  useEffect(() => {
    if (!hasLoaded && !loading) {
      void dispatch(fetchAnnouncements());
    }
  }, [dispatch, hasLoaded, loading]);

  const unreadCount = useMemo(
    () => announcements.filter((item) => !item.isRead).length,
    [announcements],
  );

  const readCount = announcements.length - unreadCount;

  const counts: Record<AnnouncementFilter, number> = {
    ALL: announcements.length,
    UNREAD: unreadCount,
    READ: readCount,
  };

  const filteredAnnouncements = useMemo(() => {
    switch (filter) {
      case "UNREAD":
        return announcements.filter((item) => !item.isRead);
      case "READ":
        return announcements.filter((item) => item.isRead);
      default:
        return announcements;
    }
  }, [announcements, filter]);

  const handleToggleRead = (announcementId: number) => {
    dispatch(clearAnnouncementErrors());
    void dispatch(toggleAnnouncementRead(announcementId));
  };

  const handleMarkAllAsRead = () => {
    if (
      unreadCount === 0 ||
      loading ||
      isMarkingAllRead ||
      pendingIds.length > 0
    ) {
      return;
    }

    dispatch(clearAnnouncementErrors());
    void dispatch(markAllAnnouncementsRead());
  };

  const handleRefresh = () => {
    if (loading) return;
    void dispatch(fetchAnnouncements());
  };

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-6">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2 text-xs font-medium text-blue-700">
              <Megaphone size={15} aria-hidden="true" />
              Bank updates
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Announcements
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Important bank updates and service notices.
            </p>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            aria-label="Refresh announcements"
            title="Refresh announcements"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={loading ? "animate-spin" : ""}
              aria-hidden="true"
            />
          </button>
        </div>
      </header>

      {!loading && actionError && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
        >
          <AlertCircle size={17} className="mt-0.5 shrink-0" />
          <p>{actionError}</p>
        </div>
      )}

      <section aria-label="Announcement filters" className="mb-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-1">
            {filters.map((item) => {
              const selected = filter === item.value;

              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setFilter(item.value)}
                  aria-pressed={selected}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                    selected
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                  }`}
                >
                  {item.label}

                  {item.value !== "ALL" && (
                    <span
                      className={`text-xs tabular-nums ${
                        selected ? "text-blue-700" : "text-slate-400"
                      }`}
                    >
                      {counts[item.value]}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleMarkAllAsRead}
            disabled={
              loading ||
              unreadCount === 0 ||
              isMarkingAllRead ||
              pendingIds.length > 0
            }
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:text-slate-400 disabled:hover:bg-transparent"
          >
            {isMarkingAllRead ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : (
              <CheckCheck size={15} />
            )}

            {isMarkingAllRead ? "Updating..." : "Mark all as read"}
          </button>
        </div>
      </section>

      {loading && announcements.length === 0 ? (
        <div
          className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white"
          aria-label="Loading announcements"
        >
          {[1, 2, 3].map((item) => (
            <div key={item} className="animate-pulse px-4 py-5">
              <div className="h-4 w-2/5 rounded bg-slate-200" />
              <div className="mt-3 h-3 w-full rounded bg-slate-100" />
              <div className="mt-2 h-3 w-3/5 rounded bg-slate-100" />
            </div>
          ))}
        </div>
      ) : error && announcements.length === 0 ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-white p-5"
        >
          <div className="flex items-start gap-3">
            <AlertCircle
              size={20}
              className="mt-0.5 shrink-0 text-red-600"
              aria-hidden="true"
            />

            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Unable to load announcements
              </h2>

              <p className="mt-1 text-sm text-slate-500">{error}</p>

              <button
                type="button"
                onClick={handleRefresh}
                disabled={loading}
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-blue-700 px-3 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50"
              >
                <RefreshCw size={14} />
                Try again
              </button>
            </div>
          </div>
        </div>
      ) : (
        <AnnouncementList
          announcements={filteredAnnouncements}
          filter={filter}
          pendingIds={new Set<number>(pendingIds)}
          isMarkingAllRead={isMarkingAllRead}
          onToggleRead={handleToggleRead}
        />
      )}

      {!loading && !error && announcements.length > 0 && (
        <p className="mt-4 text-center text-xs text-slate-400">
          Showing {filteredAnnouncements.length} of {announcements.length} announcements
        </p>
      )}
    </main>
  );
}