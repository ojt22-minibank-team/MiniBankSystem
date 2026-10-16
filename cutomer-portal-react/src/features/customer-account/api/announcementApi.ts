
import api from "../../../config/api";

import type { Announcement } from "../types/announcementTypes";

export async function getCustomerAnnouncements(): Promise<Announcement[]> {
  const response = await api.get<Announcement[]>("/announcements");

  return response.data;
}

export async function markAnnouncementAsRead(
  announcementId: number,
): Promise<void> {
  await api.put(`/announcements/${announcementId}/read`);
}

export async function markAnnouncementAsUnread(
  announcementId: number,
): Promise<void> {
  await api.delete(`/announcements/${announcementId}/read`);
}

export async function markAllAnnouncementsAsRead(): Promise<void> {
  await api.put("/announcements/read-all");
}
