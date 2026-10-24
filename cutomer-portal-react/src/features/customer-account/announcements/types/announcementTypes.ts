export type AnnouncementAudience = "CUSTOMERS" | "STAFF" | "ALL";

export type AnnouncementFilter = "ALL" | "UNREAD" | "READ";

export interface Announcement {
  announcementId: number;
  title: string;
  message: string;
  audience: AnnouncementAudience;
  isActive: boolean;
  startsAt: string;
  endsAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  isRead: boolean;
  readAt: string | null;
}