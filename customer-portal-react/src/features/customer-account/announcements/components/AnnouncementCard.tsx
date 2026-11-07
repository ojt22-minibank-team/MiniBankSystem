
import { useState } from "react";
import {
  CalendarDays,
  Check,
  Circle,
  LoaderCircle,
  Megaphone,
  MoreHorizontal,
} from "lucide-react";

import type { Announcement } from "../types/announcementTypes";

interface AnnouncementCardProps {
  announcement: Announcement;
  isUpdating: boolean;
  disabled?: boolean;
  onToggleRead: (announcementId: number) => void;
}

function formatDate(value: string | null): string {
  if (!value) return "Date unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export default function AnnouncementCard({
  announcement,
  isUpdating,
  disabled = false,
  onToggleRead,
}: AnnouncementCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const isRead = announcement.isRead;
  const isActionDisabled = disabled || isUpdating;

  const handleOpenAnnouncement = () => {
    if (isRead || isActionDisabled) return;

    onToggleRead(announcement.announcementId);
  };

  const handleToggleRead = () => {
    if (isActionDisabled) return;

    setMenuOpen(false);
    onToggleRead(announcement.announcementId);
  };

  return (
    <article
      className={`group relative rounded-2xl border p-4 transition-all duration-200 sm:p-5 ${
        isRead
          ? "border-slate-200 bg-white shadow-sm hover:border-slate-300 hover:shadow-md"
          : "border-cyan-200 bg-cyan-50/30 shadow-sm hover:border-cyan-300 hover:shadow-md"
      }`}
    >
      <div className="flex items-start gap-3 sm:gap-4">
        {/* Announcement Icon */}
        <div
          className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
            isRead
              ? "bg-slate-100 text-slate-500"
              : "bg-cyan-100 text-[#00A3C4]"
          }`}
        >
          <Megaphone size={20} strokeWidth={1.8} aria-hidden="true" />

          {!isRead && (
            <span
              className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-white bg-[#00A3C4]"
              aria-label="Unread"
            />
          )}
        </div>

        {/* Announcement Content */}
        <div className="flex min-w-0 flex-1 items-start gap-2">
          <button
            type="button"
            onClick={handleOpenAnnouncement}
            disabled={isRead || isActionDisabled}
            aria-label={`Mark announcement as read: ${announcement.title}`}
            className="min-w-0 flex-1 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-[#00A3C4] focus-visible:ring-offset-2 disabled:cursor-default"
          >
            {/* Title */}
            <div className="flex flex-wrap items-center gap-2">
              <h2
                className={`break-words text-sm text-slate-900 sm:text-base ${
                  isRead ? "font-semibold" : "font-bold"
                }`}
              >
                {announcement.title}
              </h2>

              {!isRead && (
                <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#0089A6]">
                  New
                </span>
              )}
            </div>

            {/* Metadata */}
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <CalendarDays size={13} aria-hidden="true" />
                {formatDate(announcement.startsAt)}
              </span>

              <span
                className={`flex items-center gap-1.5 ${
                  isRead ? "text-slate-400" : "font-medium text-[#0089A6]"
                }`}
              >
                {isRead ? (
                  <Check size={13} aria-hidden="true" />
                ) : (
                  <Circle
                    size={9}
                    fill="currentColor"
                    aria-hidden="true"
                  />
                )}
                {isRead ? "Read" : "Unread"}
              </span>
            </div>

            {/* Message */}
            <p className="mt-3 whitespace-pre-line break-words text-sm leading-6 text-slate-600">
              {announcement.message}
            </p>

            {/* End Date */}
            {announcement.endsAt && (
              <div className="mt-4 flex items-center gap-1.5 border-t border-slate-100 pt-3 text-xs text-slate-400">
                <CalendarDays size={13} aria-hidden="true" />
                <span>Ends {formatDate(announcement.endsAt)}</span>
              </div>
            )}
          </button>

          {/* Action Menu */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setMenuOpen((previous) => !previous)}
              disabled={isActionDisabled}
              aria-label="Announcement actions"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              title="Announcement actions"
              className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isUpdating ? (
                <LoaderCircle
                  size={18}
                  className="animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <MoreHorizontal size={20} aria-hidden="true" />
              )}
            </button>

            {menuOpen && !isActionDisabled && (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-10 cursor-default"
                  aria-label="Close announcement actions"
                  onClick={() => setMenuOpen(false)}
                />

                <div
                  role="menu"
                  className="absolute right-0 top-full z-20 mt-2 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xl"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleToggleRead}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    {isRead ? (
                      <Circle
                        size={15}
                        className="text-slate-500"
                        aria-hidden="true"
                      />
                    ) : (
                      <Check
                        size={15}
                        className="text-[#00A3C4]"
                        aria-hidden="true"
                      />
                    )}

                    {isRead ? "Mark as unread" : "Mark as read"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
