
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
    <article className="border-b border-slate-200 bg-white px-4 py-5 transition-colors sm:px-5">
      <div className="flex items-start gap-3">
        <div className="relative mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-50 text-[#00A3C4]">
          <Megaphone size={18} aria-hidden="true" />

          {!isRead && (
            <span
              className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#00A3C4]"
              aria-label="Unread"
            />
          )}
        </div>

        <div className="flex min-w-0 flex-1 items-start gap-3">
          <button
            type="button"
            onClick={handleOpenAnnouncement}
            disabled={isRead || isActionDisabled}
            aria-label={`Mark announcement as read: ${announcement.title}`}
            className="min-w-0 flex-1 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-[#00A3C4] focus-visible:ring-offset-2 disabled:cursor-default"
          >
            <h2
              className={`break-words text-sm text-slate-900 ${
                isRead ? "font-medium" : "font-semibold"
              }`}
            >
              {announcement.title}
            </h2>

            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
              <span>{formatDate(announcement.startsAt)}</span>
              <span aria-hidden="true">·</span>
              <span>{isRead ? "Read" : "Unread"}</span>
            </div>

            <p className="mt-3 whitespace-pre-line break-words text-sm leading-6 text-slate-600">
              {announcement.message}
            </p>

            {announcement.endsAt && (
              <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
                <CalendarDays size={13} aria-hidden="true" />
                <span>Ends {formatDate(announcement.endsAt)}</span>
              </div>
            )}
          </button>

          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setMenuOpen((previous) => !previous)}
              disabled={isActionDisabled}
              aria-label="Announcement actions"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              title="Announcement actions"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isUpdating ? (
                <LoaderCircle
                  size={17}
                  className="animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <MoreHorizontal size={19} aria-hidden="true" />
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
                  className="absolute right-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleToggleRead}
                    className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-50"
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
