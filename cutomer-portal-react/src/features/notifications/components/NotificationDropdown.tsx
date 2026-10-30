import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { isAxiosError } from "axios";
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
  User,
  Store,
  CreditCard,
} from "lucide-react";
import {
  getMyNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "../services/notificationService";
import type { NotificationItem } from "../types/notificationTypes";
import { useNotificationWebSocket } from "../hooks/useNotificationWebSocket";
import {
  maskAccountNumber,
  formatNotificationMessage,
} from "../utils/notificationFormatters";
import {
  getAccessToken,
  getAuthenticationGeneration,
  hasTokens,
  isAuthenticationGenerationCurrent,
  subscribeToAuthenticationChanges,
} from "../../../utils/tokenStorage";
import { SESSION_TIMEOUT_EVENT } from "../../../utils/sessionEvents";

interface NotificationRequestScope {
  generation: number;
}

export const NotificationDropdown: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  // Own pending work, including across effect cleanup/remount in the same generation.
  const requestScopeRef = useRef<NotificationRequestScope | null>(null);
  const isOpenRef = useRef(isOpen);
  useEffect(() => { isOpenRef.current = isOpen; }, [isOpen]);
  const stopPollingRef = useRef<() => void>(() => {});
  const startPollingRef = useRef<() => void>(() => {});

  const isCurrent = useCallback((scope: NotificationRequestScope | null) =>
    scope !== null && requestScopeRef.current === scope && hasTokens() &&
    isAuthenticationGenerationCurrent(scope.generation), []);

  // Real-time WebSocket hook integration
  const handleRealtimeNotification = useCallback((newNoti: NotificationItem) => {
    if (!isCurrent(requestScopeRef.current)) return;
    // Increment unread count in real-time
    setUnreadCount((prev) => prev + 1);

    // Prepend new incoming notification directly to list
    setNotifications((prev) => {
      if (prev.some((item) => item.notificationId === newNoti.notificationId)) {
        return prev;
      }
      return [newNoti, ...prev];
    });
  }, [isCurrent]);

  const { isConnected: isWsConnected } = useNotificationWebSocket({
    onNotificationReceived: handleRealtimeNotification,
  });

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
  const fetchUnreadCount = useCallback(async () => {
    const scope = requestScopeRef.current;
    if (!isCurrent(scope)) return;
    const requestToken = getAccessToken();
    if (!requestToken) return;

    try {
      const count = await getUnreadNotificationCount();
      if (isCurrent(scope) && requestToken === getAccessToken()) {
        setUnreadCount(count);
        // Recovery: If previous 403 or error stopped polling, but this fetch succeeded, safely resume polling
        startPollingRef.current();
      }
    } catch (err: unknown) {
      if (!isCurrent(scope)) return;
      // Token Rotation Guard: If token was rotated while in flight, ignore 401/403 from the old token!
      if (requestToken !== getAccessToken()) return;

      if (isAxiosError(err) && (err.response?.status === 401 || err.response?.status === 403)) {
        stopPollingRef.current();
      }
    }
  }, [isCurrent]);

  // Fetch full notifications list
  const fetchNotifications = useCallback(async () => {
    const scope = requestScopeRef.current;
    if (!isCurrent(scope)) return;
    const requestToken = getAccessToken();
    if (!requestToken) return;

    try {
      setLoading(true);
      setError(null);
      const data = await getMyNotifications();
      if (!isCurrent(scope)) return;
      if (requestToken === getAccessToken()) {
        if (Array.isArray(data)) {
          setNotifications(data);
        } else {
          setNotifications([]);
        }
        // Recovery: If manual fetch succeeded, safely resume polling
        startPollingRef.current();
      }
    } catch (err: unknown) {
      if (!isCurrent(scope)) return;
      // Token Rotation Guard: If token was rotated while in flight, ignore 401/403 from the old token!
      if (requestToken !== getAccessToken()) return;

      if (isAxiosError(err) && (err.response?.status === 401 || err.response?.status === 403)) {
        stopPollingRef.current();
      }
      setError(
        (isAxiosError<{ message?: string }>(err) ? err.response?.data?.message : undefined) ||
        (err instanceof Error ? err.message : "Failed to load notifications.")
      );
    } finally {
      if (isCurrent(scope)) setLoading(false);
    }
  }, [isCurrent]);

  // The existing auth store owns validity; this effect only owns notification work.
  useEffect(() => {
    let intervalId: number | undefined;
    const stopPolling = () => {
      if (intervalId !== undefined) {
        window.clearInterval(intervalId);
        intervalId = undefined;
      }
    };
    stopPollingRef.current = stopPolling;

    const startPolling = (targetScope = requestScopeRef.current) => {
      if (!isCurrent(targetScope)) return;
      if (intervalId !== undefined) return; // Prevent duplicate intervals

      intervalId = window.setInterval(() => {
        if (!isCurrent(targetScope)) return;
        void fetchUnreadCount();
        if (isOpenRef.current) void fetchNotifications();
      }, 20000);
    };
    startPollingRef.current = () => startPolling();

    const synchronize = () => {
      const generation = getAuthenticationGeneration();
      const authenticated = hasTokens() && isAuthenticationGenerationCurrent(generation);
      if (authenticated && requestScopeRef.current?.generation === generation && intervalId !== undefined) return;

      requestScopeRef.current = null;
      stopPolling();
      setIsOpen(false);
      setUnreadCount(0);
      setNotifications([]);
      setLoading(false);
      setMarkingAll(false);
      setError(null);
      if (!authenticated) return;

      const scope = { generation };
      requestScopeRef.current = scope;
      void fetchUnreadCount();
      startPolling(scope);
    };

    const handleSessionTimeout = () => {
      requestScopeRef.current = null;
      stopPolling();
      setIsOpen(false);
    };

    // Listen to custom notification trigger (e.g. from P2P transfer)
    const handleCustomNotify = () => {
      if (!isCurrent(requestScopeRef.current)) return;
      void fetchUnreadCount();
      if (isOpenRef.current) {
        void fetchNotifications();
      }
    };
    const handleOpenFromToast = () => {
      if (!isCurrent(requestScopeRef.current)) return;
      setIsOpen(true);
      void fetchNotifications();
      void fetchUnreadCount();
    };
    const unsubscribe = subscribeToAuthenticationChanges(synchronize);
    window.addEventListener(SESSION_TIMEOUT_EVENT, handleSessionTimeout);
    window.addEventListener("new-notification-event", handleCustomNotify);
    window.addEventListener("open-notification-dropdown", handleOpenFromToast);
    window.addEventListener("storage", synchronize);
    synchronize();

    return () => {
      requestScopeRef.current = null;
      stopPolling();
      unsubscribe();
      window.removeEventListener(SESSION_TIMEOUT_EVENT, handleSessionTimeout);
      window.removeEventListener("new-notification-event", handleCustomNotify);
      window.removeEventListener("open-notification-dropdown", handleOpenFromToast);
      window.removeEventListener("storage", synchronize);
    };
  }, [fetchNotifications, fetchUnreadCount, isCurrent]);

  const formatAmount = (num: number | null | undefined) => {
    if (num === null || num === undefined) return null;
    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 2,
    }).format(num);
  };

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
    if (!isCurrent(requestScopeRef.current)) return;
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (nextState) {
      fetchNotifications();
      fetchUnreadCount();
    }
  };

  // Helper to reliably check if a notification is unread (handling both isRead and read from API)
  const isItemUnread = (item: NotificationItem) => {
    return !(item.isRead ?? item.read);
  };

  // Mark single as read
  const handleMarkAsRead = async (item: NotificationItem) => {
    const scope = requestScopeRef.current;
    if (!isCurrent(scope)) return;
    if (!isItemUnread(item)) return;
    try {
      await markNotificationAsRead(item.notificationId);
      if (!isCurrent(scope)) return;
      setNotifications((prev) =>
        prev.map((n) =>
          n.notificationId === item.notificationId
            ? { ...n, isRead: true, read: true, readAt: new Date().toISOString() }
            : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // A failed or obsolete request must not affect another session.
    }
  };

  // Deep-link directly to Receipt / Slip view
  const handleNotificationClick = (item: NotificationItem) => {
    void handleMarkAsRead(item);
    setIsOpen(false);
    const ref = item.transactionRef || (item.notificationId ? `NOTI-${item.notificationId}` : "");
    navigate(`/receipt/${encodeURIComponent(ref)}`, {
      state: {
        notification: item,
        from: location.pathname,
      },
    });
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    const scope = requestScopeRef.current;
    if (!isCurrent(scope)) return;
    try {
      setMarkingAll(true);
      await markAllNotificationsAsRead();
      if (!isCurrent(scope)) return;
      setNotifications((prev) =>
        prev.map((n) => ({
          ...n,
          isRead: true,
          read: true,
          readAt: new Date().toISOString(),
        }))
      );
      setUnreadCount(0);
    } catch {
      // A failed or obsolete request must not affect another session.
    } finally {
      if (isCurrent(scope)) setMarkingAll(false);
    }
  };

  // Choose icon based on notification content
  const renderIcon = (item: NotificationItem) => {
    const titleLower = item.title.toLowerCase();
    const isFailed = titleLower.includes("fail") || titleLower.includes("reject");
    const isReceived =
      item.transferDirection === "RECEIVED" ||
      titleLower.includes("received") ||
      titleLower.includes("funds received");
    const isPayment =
      item.notificationType === "PAYMENT" ||
      titleLower.includes("payment");

    if (isFailed) {
      return (
        <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0 border border-red-100">
          <AlertCircle className="w-5 h-5" />
        </div>
      );
    }

    if (isPayment && isReceived) {
      return (
        <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100 shadow-xs">
          <Store className="w-5 h-5" />
        </div>
      );
    }

    if (isPayment && !isReceived) {
      return (
        <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100 shadow-xs">
          <CreditCard className="w-5 h-5" />
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
            : "text-slate-500 hover:bg-slate-50 hover:text-[#0A192F]"
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
        <div className="absolute -right-14 sm:right-auto sm:left-1/2 sm:-translate-x-1/2 mt-3 w-80 sm:w-96 rounded-2xl bg-white shadow-2xl border border-slate-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-3 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/70">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-slate-800 tracking-tight flex items-center gap-1.5">
                  Notifications
                  {isWsConnected && (
                    <span
                      className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"
                      title="Real-time live WebSocket connected"
                    />
                  )}
                </h3>
              </div>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                {unreadCount > 0
                  ? `${unreadCount} unread • ${notifications.length} total`
                  : `${notifications.length} total notifications`}
              </p>
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

          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 px-4 py-2 bg-slate-50/90 border-b border-slate-100 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 ${
                activeTab === "all"
                  ? "bg-white text-blue-600 shadow-sm border border-slate-200/50"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <span>All</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 font-bold">
                {notifications.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("unread")}
              className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 ${
                activeTab === "unread"
                  ? "bg-white text-blue-600 shadow-sm border border-slate-200/50"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <span>Unread</span>
              {unreadCount > 0 ? (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-red-100 text-red-600 font-extrabold">
                  {unreadCount}
                </span>
              ) : (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-500 font-bold">
                  0
                </span>
              )}
            </button>
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
            ) : (activeTab === "unread" ? notifications.filter(isItemUnread) : notifications).length === 0 ? (
              <div className="py-12 px-6 text-center flex flex-col items-center justify-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-700">
                    {activeTab === "unread" ? "No unread notifications" : "No notifications yet"}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {activeTab === "unread"
                      ? "You are all caught up!"
                      : "We will notify you when transfers or transactions occur."}
                  </p>
                </div>
              </div>
            ) : (
              (activeTab === "unread" ? notifications.filter(isItemUnread) : notifications).map((item) => {
                const unread = isItemUnread(item);
                return (
                  <div
                    key={item.notificationId}
                    onClick={() => handleNotificationClick(item)}
                    className={`px-5 py-3.5 flex items-start gap-3.5 transition cursor-pointer select-none ${
                      unread
                        ? "bg-blue-50/40 hover:bg-blue-50/70"
                        : "bg-white hover:bg-slate-50"
                    }`}
                  >
                    {renderIcon(item)}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p
                          className={`text-xs tracking-tight truncate ${
                            unread
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

                      {/* Prominent Account Holder Name + Account Number */}
                      {item.counterpartyName && (
                        <div className="mt-1 flex items-center gap-1.5 text-xs font-bold text-slate-800">
                          <User className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span className="truncate">
                            {item.transferDirection === "RECEIVED"
                              ? "From: "
                              : item.transferDirection === "SENT"
                              ? "To: "
                              : ""}
                            {item.counterpartyName}
                            {item.counterpartyAccountNumber
                              ? ` (${maskAccountNumber(item.counterpartyAccountNumber)})`
                              : ""}
                          </span>
                        </div>
                      )}

                      <p className="text-[11px] text-slate-600 mt-1 leading-relaxed line-clamp-2">
                        {formatNotificationMessage(item)}
                      </p>

                      <div className="mt-1.5 flex items-center justify-end gap-2">
                        {(() => {
                          const itemTitleLower = (item.title || "").toLowerCase();
                          const isItemFailed = itemTitleLower.includes("fail") || itemTitleLower.includes("reject");

                          return (
                            <>
                              {isItemFailed && (
                                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                                  Failed
                                </span>
                              )}
                              {item.amount !== undefined && item.amount !== null && (
                                <span
                                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                                    isItemFailed
                                      ? "bg-red-50 text-red-700 border border-red-200"
                                      : item.transferDirection === "RECEIVED"
                                      ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                      : item.transferDirection === "SENT"
                                      ? "bg-rose-50 text-rose-700 border border-rose-100"
                                      : "bg-slate-100 text-slate-600"
                                  }`}
                                >
                                  {isItemFailed
                                    ? `- ${formatAmount(item.amount)} ${item.currency || "MMK"} (Failed)`
                                    : `${item.transferDirection === "RECEIVED" ? "+ " : item.transferDirection === "SENT" ? "- " : ""}${formatAmount(item.amount)} ${item.currency || "MMK"}`}
                                </span>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    {unread && (
                      <span className="w-2 h-2 rounded-full bg-blue-500 mt-2 shrink-0 ring-2 ring-blue-100" />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-5 py-2.5 bg-slate-50/80 border-t border-slate-100 text-center flex items-center justify-center gap-1.5 text-[11px] font-semibold text-slate-400">
              <span>Showing latest 30 notifications</span>
              <span>•</span>
              <span>Encrypted & Logged</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
