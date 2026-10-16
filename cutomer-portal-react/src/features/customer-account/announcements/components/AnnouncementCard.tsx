import { CalendarDays, Megaphone } from "lucide-react";
import type { Announcement } from "../../types/announcementTypes";

interface AnnouncementCardProps {
  announcement: Announcement;
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
}: AnnouncementCardProps) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md sm:p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
          <Megaphone size={21} aria-hidden="true" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-slate-900">
              {announcement.title}
            </h2>

            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
              Announcement
            </span>
          </div>

          <p className="mt-3 whitespace-pre-line break-words text-sm leading-6 text-slate-600">
            {announcement.message}
          </p>

          <div className="mt-5 flex items-center gap-2 text-xs text-slate-500">
            <CalendarDays size={15} aria-hidden="true" />
            <span>
              Published {formatDate(announcement.startsAt)}
            </span>
          </div>

          {announcement.endsAt && (
            <p className="mt-1 text-xs text-slate-500">
              Ends {formatDate(announcement.endsAt)}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}