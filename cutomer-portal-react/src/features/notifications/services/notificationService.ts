import api from "../../../config/api";
import type { NotificationItem, UnreadCountResponse } from "../types/notificationTypes";

export const getMyNotifications = async (): Promise<NotificationItem[]> => {
  const response = await api.get<NotificationItem[]>("/notifications");
  return response.data;
};

export const getUnreadNotificationCount = async (): Promise<number> => {
  const response = await api.get<UnreadCountResponse>("/notifications/unread-count");
  return response.data.unreadCount;
};

export const markNotificationAsRead = async (
  notificationId: number
): Promise<boolean> => {
  const response = await api.patch<{ success: boolean }>(
    `/notifications/${notificationId}/read`
  );
  return response.data.success;
};

export const markAllNotificationsAsRead = async (): Promise<number> => {
  const response = await api.put<{ success: boolean; updatedCount: number }>(
    "/notifications/read-all"
  );
  return response.data.updatedCount;
};
