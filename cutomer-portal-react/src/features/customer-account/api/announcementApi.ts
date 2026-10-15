
import api from "../../../config/api";
import type { Announcement } from "../types/announcementTypes";

export async function getCustomerAnnouncements(): Promise<Announcement[]> {
  const response = await api.get<Announcement[]>(
    "/announcements/customer",
  );

  return response.data;
}
