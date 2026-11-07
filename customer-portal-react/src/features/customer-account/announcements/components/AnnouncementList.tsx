import { Megaphone } from "lucide-react";
import { useTranslation } from "react-i18next";

import AnnouncementCard from "./AnnouncementCard";
import type {
  Announcement,
  AnnouncementFilter,
} from "../types/announcementTypes";

interface AnnouncementListProps {
  announcements: Announcement[];
  filter: AnnouncementFilter;
  pendingIds: Set<number>;
  isMarkingAllRead: boolean;
  onToggleRead: (announcementId: number) => void;
}

export default function AnnouncementList({
  announcements,
  filter,
  pendingIds,
  isMarkingAllRead,
  onToggleRead,
}: AnnouncementListProps) {
  const { t } = useTranslation("announcement");

  if (announcements.length === 0) {
    const emptyContent = {
      ALL: {
        title: t("emptyAllTitle"),
        message: t("emptyAllMessage"),
      },
      UNREAD: {
        title: t("emptyUnreadTitle"),
        message: t("emptyUnreadMessage"),
      },
      READ: {
        title: t("emptyReadTitle"),
        message: t("emptyReadMessage"),
      },
    }[filter];

    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
          <Megaphone size={23} aria-hidden="true" />
        </div>

        <h2 className="mt-4 text-base font-semibold text-slate-900">
          {emptyContent.title}
        </h2>

        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
          {emptyContent.message}
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
          isUpdating={pendingIds.has(announcement.announcementId)}
          disabled={isMarkingAllRead}
          onToggleRead={onToggleRead}
        />
      ))}
    </div>
  );
}