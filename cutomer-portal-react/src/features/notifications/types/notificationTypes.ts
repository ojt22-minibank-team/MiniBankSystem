export type NotificationType = "TRANSFER" | "PAYMENT" | "SECURITY" | "SYSTEM";

export interface NotificationItem {
  notificationId: number;
  notificationType: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  read?: boolean;
  readAt: string | null;
  createdAt: string;
  transactionId?: string | null;
  transactionRef?: string | null;
  amount?: number | null;
  currency?: string | null;
  counterpartyName?: string | null;
  counterpartyAccountNumber?: string | null;
  transferDirection?: "SENT" | "RECEIVED" | null;
  sourceAccountNumber?: string | null;
  destinationAccountNumber?: string | null;
}

export interface UnreadCountResponse {
  unreadCount: number;
}
