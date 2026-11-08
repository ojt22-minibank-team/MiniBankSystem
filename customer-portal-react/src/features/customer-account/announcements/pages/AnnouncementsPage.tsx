
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  CheckCheck,
  Megaphone,
  RefreshCw,
} from "lucide-react";

import { useAppDispatch, useAppSelector } from "../../../../lib/redux";

import {
  getAuthenticationGeneration,
  hasTokens,
  isAuthenticationGenerationCurrent,
  subscribeToAuthenticationChanges,
} from "../../../../utils/tokenStorage";

import {
  clearAnnouncementErrors,
  fetchAnnouncements,
  markAllAnnouncementsRead,
  toggleAnnouncementRead,
} from "../store/announcementSlice";

import AnnouncementList from "../components/AnnouncementList";

import type { AnnouncementFilter } from "../types/announcementTypes";

// Tracks the initial auto-fetch attempt for each authentication session.
let lastAutoFetchGeneration: number | null = null;

const filters: {
  value: AnnouncementFilter;
}[] = [
  { value: "ALL" },
  { value: "UNREAD" },
  { value: "READ" },
];

export default function AnnouncementsPage() {
  const { t } = useTranslation("announcement");

  const dispatch = useAppDispatch();

  const {
    announcements,
    loading,
    hasLoaded,
    error,
    pendingRequests,
    markAllRequestId,
    actionError,
  } = useAppSelector((state) => state.announcements);

  const [authenticationGeneration, setAuthenticationGeneration] =
    useState(getAuthenticationGeneration);

  const [filter, setFilter] = useState<AnnouncementFilter>("ALL");

  const pendingIds = useMemo(
    () => Object.keys(pendingRequests || {}).map(Number),
    [pendingRequests]
  );

  const isMarkingAllRead = Boolean(markAllRequestId);

  // Subscribe to login, logout and authentication changes.
  useEffect(() => {
    const unsubscribe = subscribeToAuthenticationChanges(() => {
      setAuthenticationGeneration(getAuthenticationGeneration());
    });

    setAuthenticationGeneration(getAuthenticationGeneration());

    return unsubscribe;
  }, []);

  // Automatically fetch announcements once per valid authentication session.
  useEffect(() => {
    const generation = authenticationGeneration;

    const isSessionValid =
      hasTokens() &&
      isAuthenticationGenerationCurrent(generation);

    if (
      !isSessionValid ||
      lastAutoFetchGeneration === generation ||
      hasLoaded ||
      loading
    ) {
      return;
    }

    // Prevent duplicate requests from Strict Mode or remounts.
    lastAutoFetchGeneration = generation;

    void dispatch(fetchAnnouncements());
  }, [
    dispatch,
    authenticationGeneration,
    hasLoaded,
    loading,
  ]);

  const unreadCount = useMemo(
    () => announcements.filter((item) => !item.isRead).length,
    [announcements]
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

  // Manual refresh can retry after a failed initial request.
  const handleRefresh = () => {
    if (loading) return;

    const generation = getAuthenticationGeneration();

    const isSessionValid =
      hasTokens() &&
      isAuthenticationGenerationCurrent(generation);

    if (!isSessionValid) return;

    void dispatch(fetchAnnouncements());
  };

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Page Header */}
      <header className="mb-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            {/* Announcement Icon */}
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-[#00A3C4]">
              <Megaphone
                size={23}
                strokeWidth={1.8}
                aria-hidden="true"
              />
            </div>

            <div className="min-w-0">
              {/* Breadcrumb Navigation */}
              <nav
                aria-label={t("breadcrumb")}
                className="mb-1 flex flex-wrap items-center gap-2 text-xs font-semibold"
              >
                <Link
                  to="/dashboard"
                  className="text-slate-500 transition-colors hover:text-[#00A3C4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A3C4]"
                >
                  {t("dashboard")}
                </Link>

                <span className="text-slate-300" aria-hidden="true">
                  /
                </span>

                <span
                  className="text-[#00A3C4]"
                  aria-current="page"
                >
                  {t("title")}
                </span>
              </nav>

              <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                {t("title")}
              </h1>

              <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                {t("description")}
              </p>
            </div>
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            aria-label={t("refreshAnnouncements")}
            title={t("refreshAnnouncements")}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-[#00A3C4] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={loading ? "animate-spin" : ""}
              aria-hidden="true"
            />
          </button>
        </div>
      </header>

      {/* Action Error */}
      {!loading && actionError && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
        >
          <AlertCircle
            size={17}
            className="mt-0.5 shrink-0"
            aria-hidden="true"
          />
          <p>{actionError}</p>
        </div>
      )}

      {/* Announcement Filters */}
      <section
        aria-label={t("announcementFilters")}
        className="mb-4"
      >
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
                      ? "bg-cyan-50 text-[#00A3C4]"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                  }`}
                >
                  {t(item.value.toLowerCase())}

                  {item.value !== "ALL" && (
                    <span
                      className={`text-xs tabular-nums ${
                        selected
                          ? "text-[#00A3C4]"
                          : "text-slate-400"
                      }`}
                    >
                      {counts[item.value]}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Mark All as Read */}
          <button
            type="button"
            onClick={handleMarkAllAsRead}
            disabled={
              loading ||
              unreadCount === 0 ||
              isMarkingAllRead ||
              pendingIds.length > 0
            }
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-[#00A3C4] transition hover:bg-cyan-50 disabled:cursor-not-allowed disabled:text-slate-400 disabled:hover:bg-transparent"
          >
            {isMarkingAllRead ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : (
              <CheckCheck size={15} />
            )}

            {isMarkingAllRead
              ? t("updating")
              : t("markAllAsRead")}
          </button>
        </div>
      </section>

      {/* Loading State */}
      {loading && announcements.length === 0 ? (
        <div
          className="space-y-3"
          aria-label={t("loadingAnnouncements")}
        >
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5"
            >
              <div className="flex gap-3">
                <div className="h-11 w-11 shrink-0 rounded-xl bg-slate-200" />

                <div className="flex-1">
                  <div className="h-4 w-2/5 rounded bg-slate-200" />
                  <div className="mt-3 h-3 w-1/4 rounded bg-slate-100" />
                  <div className="mt-4 h-3 w-full rounded bg-slate-100" />
                  <div className="mt-2 h-3 w-3/5 rounded bg-slate-100" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : error && announcements.length === 0 ? (
        /* Error State */
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
                {t("unableToLoadAnnouncements")}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {error}
              </p>

              <button
                type="button"
                onClick={handleRefresh}
                disabled={loading}
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#00A3C4] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#0891B2] disabled:opacity-50"
              >
                <RefreshCw size={14} />
                {t("tryAgain")}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Announcement List */
        <AnnouncementList
          announcements={filteredAnnouncements}
          filter={filter}
          pendingIds={new Set<number>(pendingIds)}
          isMarkingAllRead={isMarkingAllRead}
          onToggleRead={handleToggleRead}
        />
      )}

      {/* Footer */}
      {!loading && !error && announcements.length > 0 && (
        <p className="mt-4 text-center text-xs text-slate-400">
          {t("showingAnnouncements", {
            filtered: filteredAnnouncements.length,
            total: announcements.length,
          })}
        </p>
      )}
    </main>
  );
}
