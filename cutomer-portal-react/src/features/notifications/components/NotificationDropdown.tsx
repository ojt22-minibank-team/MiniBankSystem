import React, { useState, useEffect, useRef } from "react";
import {
  Bell,
  CheckCheck,
  ArrowUpRight,
  ArrowDownLeft,
  AlertCircle,
  Clock,
  Sparkles,
  Loader2,
  X,
} from "lucide-react";
import {
  getMyNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "../services/notificationService";
import type { NotificationItem } from "../types/notificationTypes";

export const NotificationDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Helper for relative time
  const formatTimeAgo = (dateStr: string) => {
    try {
      const now = new Date();
      const date = new Date(dateStr);
      const diffMs = now.getTime() - date.getTime();
      const diffSecs = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSecs / 60);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffSecs < 60) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return "Yesterday";
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  // Fetch unread count
  const fetchUnreadCount = async () => {
    try {
      const count = await getUnreadNotificationCount();
      setUnreadCount(count);
    } catch (err) {
      // Silently catch in polling
    }
  };

  // Fetch full notifications list
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getMyNotifications();
      if (Array.isArray(data)) {
        setNotifications(data);
      } else {
        setNotifications([]);
      }
    } catch (err: any) {
      console.error("Failed to fetch notifications", err);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load notifications."
      );
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch and polling every 20 seconds
  useEffect(() => {
    fetchUnreadCount();

    const intervalId = setInterval(() => {
      fetchUnreadCount();
      if (isOpen) {
        fetchNotifications();
      }
    }, 20000);

    // Listen to custom notification trigger (e.g. from P2P transfer)
    const handleCustomNotify = () => {
      fetchUnreadCount();
      if (isOpen) {
        fetchNotifications();
      }
    };
    window.addEventListener("new-notification-event", handleCustomNotify);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener("new-notification-event", handleCustomNotify);
    };
  }, [isOpen]);

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isOpen]);

  // Open/Close toggle
  const handleToggle = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (nextState) {
      fetchNotifications();
      fetchUnreadCount();
    }
  };

  // Mark single as read
  const handleMarkAsRead = async (item: NotificationItem) => {
    if (item.isRead) return;
    try {
      await markNotificationAsRead(item.notificationId);
      setNotifications((prev) =>
        prev.map((n) =>
          n.notificationId === item.notificationId
            ? { ...n, isRead: true, readAt: new Date().toISOString() }
            : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to mark as read", err);
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      setMarkingAll(true);
      await markAllNotificationsAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({
          ...n,
          isRead: true,
          readAt: new Date().toISOString(),
        }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all as read", err);
    } finally {
      setMarkingAll(false);
    }
  };

  // Choose icon based on notification content
  const renderIcon = (item: NotificationItem) => {
    const titleLower = item.title.toLowerCase();
    const isFailed = titleLower.includes("fail") || titleLower.includes("reject");
    const isReceived =
      titleLower.includes("received") || titleLower.includes("funds received");

    if (isFailed) {
      return (
        <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0 border border-red-100">
          <AlertCircle className="w-5 h-5" />
        </div>
      );
    }

    if (isReceived) {
      return (
        <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
          <ArrowDownLeft className="w-5 h-5" />
        </div>
      );
    }

    return (
      <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
        <ArrowUpRight className="w-5 h-5" />
      </div>
    );
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={handleToggle}
        aria-label="Notifications"
        className={`relative flex h-10 w-10 items-center justify-center rounded-xl transition focus:outline-none focus:ring-2 focus:ring-blue-100 ${
          isOpen
            ? "bg-blue-50 text-blue-600 shadow-inner"
            : "text-slate-500 hover:bg-slate-50 hover:text-[#08295C]"
        }`}
      >
        <Bell size={19} />

        {/* Dynamic Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-extrabold text-white shadow-md ring-2 ring-white animate-in zoom-in-50">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 rounded-2xl bg-white shadow-2xl border border-slate-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-3 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/70">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-slate-800 tracking-tight">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <span className="bg-blue-100 text-blue-700 text-[11px] font-bold px-2 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  disabled={markingAll}
                  className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 disabled:opacity-50 transition"
                  title="Mark all as read"
                >
                  {markingAll ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <CheckCheck className="w-3.5 h-3.5" />
                  )}
                  <span>Mark all read</span>
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200/50 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                <span className="text-xs font-medium">Loading notifications...</span>
              </div>
            ) : error ? (
              <div className="py-8 px-5 text-center flex flex-col items-center justify-center gap-2 bg-red-50/50">
                <AlertCircle className="w-6 h-6 text-red-400" />
                <p className="text-xs font-semibold text-red-600">{error}</p>
                <button
                  onClick={fetchNotifications}
                  className="mt-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 underline"
                >
                  Try Again
                </button>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-12 px-6 text-center flex flex-col items-center justify-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-700">No notifications yet</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    We will notify you when transfers or transactions occur.
                  </p>
                </div>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.notificationId}
                  onClick={() => handleMarkAsRead(item)}
                  className={`px-5 py-3.5 flex items-start gap-3.5 transition cursor-pointer select-none ${
                    !item.isRead
                      ? "bg-blue-50/40 hover:bg-blue-50/70"
                      : "bg-white hover:bg-slate-50"
                  }`}
                >
                  {renderIcon(item)}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p
                        className={`text-xs tracking-tight truncate ${
                          !item.isRead
                            ? "font-black text-slate-900"
                            : "font-semibold text-slate-700"
                        }`}
                      >
                        {item.title}
                      </p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Clock className="w-3 h-3 text-slate-300" />
                        <span className="text-[10px] font-medium text-slate-400">
                          {formatTimeAgo(item.createdAt)}
                        </span>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-600 mt-1 leading-relaxed line-clamp-2">
                      {item.message}
                    </p>

                    {item.transactionRef && (
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className="inline-block text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                          Ref: {item.transactionRef}
                        </span>
                      </div>
                    )}
                  </div>

                  {!item.isRead && (
                    <span className="w-2 h-2 rounded-full bg-blue-500 mt-2 shrink-0 ring-2 ring-blue-100" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-5 py-2.5 bg-slate-50/80 border-t border-slate-100 text-center">
              <span className="text-[11px] font-semibold text-slate-400">
                All activities are securely encrypted and logged
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
