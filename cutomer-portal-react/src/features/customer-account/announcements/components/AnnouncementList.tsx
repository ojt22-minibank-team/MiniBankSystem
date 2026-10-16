import { Megaphone } from "lucide-react";
import AnnouncementCard from "./AnnouncementCard";
import type { Announcement } from "../../types/announcementTypes";

interface AnnouncementListProps {
  announcements: Announcement[];
}

export default function AnnouncementList({
  announcements,
}: AnnouncementListProps) {
  if (announcements.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
          <Megaphone size={23} aria-hidden="true" />
        </div>

        <h2 className="mt-4 text-base font-semibold text-slate-900">
          No announcements yet
        </h2>

        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
          There are no announcements available for you right now.
          Please check again later.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {announcements.map((announcement) => (
        <AnnouncementCard
          key={announcement.announcementId}
          announcement={announcement}
        />
      ))}
    </div>
  );
}