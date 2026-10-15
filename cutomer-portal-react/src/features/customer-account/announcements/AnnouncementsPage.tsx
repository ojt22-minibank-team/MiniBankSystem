import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Megaphone, RefreshCw } from "lucide-react";

import { getCustomerAnnouncements } from "../api/announcementApi";
import AnnouncementList from "./components/AnnouncementList";
import type { Announcement } from "../types/announcementTypes";

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnnouncements = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await getCustomerAnnouncements();
      setAnnouncements(data);
    } catch {
      setError(
        "We couldn't load announcements. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAnnouncements();
  }, [loadAnnouncements]);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-blue-700">
            <Megaphone size={17} aria-hidden="true" />
            Bank updates
          </div>

          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Announcements
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Stay informed about important bank updates,
            service notices, and announcements.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadAnnouncements()}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:self-center"
        >
          <RefreshCw
            size={16}
            className={loading ? "animate-spin" : ""}
            aria-hidden="true"
          />
          Refresh
        </button>
      </header>

      {loading ? (
        <div className="space-y-4" aria-label="Loading announcements">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="animate-pulse rounded-2xl border border-slate-200 bg-white p-6"
            >
              <div className="h-5 w-2/5 rounded bg-slate-200" />
              <div className="mt-4 h-3 w-full rounded bg-slate-100" />
              <div className="mt-2 h-3 w-4/5 rounded bg-slate-100" />
              <div className="mt-5 h-3 w-32 rounded bg-slate-100" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 p-6"
        >
          <div className="flex items-start gap-3">
            <AlertCircle
              size={21}
              className="mt-0.5 shrink-0 text-red-600"
              aria-hidden="true"
            />

            <div>
              <h2 className="font-semibold text-red-900">
                Unable to load announcements
              </h2>

              <p className="mt-1 text-sm leading-6 text-red-700">
                {error}
              </p>

              <button
                type="button"
                onClick={() => void loadAnnouncements()}
                className="mt-4 rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-800"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      ) : (
        <AnnouncementList announcements={announcements} />
      )}
    </main>
  );
}