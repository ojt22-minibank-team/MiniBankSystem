import api from "../../../../config/api";
import type { Announcement } from "../types/announcementTypes";

export async function getCustomerAnnouncements(
  signal?: AbortSignal
): Promise<Announcement[]> {
  const response = await api.get<Announcement[]>("/announcements", {
    signal,
  });

  return response.data;
}

export async function markAnnouncementAsRead(
  announcementId: number,
  signal?: AbortSignal
): Promise<void> {
  await api.put(`/announcements/${announcementId}/read`, undefined, {
    signal,
  });
}

export async function markAnnouncementAsUnread(
  announcementId: number,
  signal?: AbortSignal
): Promise<void> {
  await api.delete(`/announcements/${announcementId}/read`, {
    signal,
  });
}

export async function markAllAnnouncementsAsRead(
  signal?: AbortSignal
): Promise<void> {
  await api.put("/announcements/read-all", undefined, {
    signal,
  });
}