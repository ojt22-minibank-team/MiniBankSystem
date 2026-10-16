export type NotificationType = "TRANSFER" | "PAYMENT" | "SECURITY" | "SYSTEM";

export interface NotificationItem {
  notificationId: number;
  notificationType: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  transactionRef?: string | null;
  amount?: number | null;
  currency?: string | null;
}

export interface UnreadCountResponse {
  unreadCount: number;
}
