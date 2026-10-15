export type AnnouncementAudience = "CUSTOMERS" | "STAFF" | "ALL";

export interface Announcement {
  announcementId: number;
  title: string;
  message: string;
  audience: AnnouncementAudience;
  active: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdByStaffId: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}