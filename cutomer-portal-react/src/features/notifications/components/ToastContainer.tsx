import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ArrowDownLeft,
  ArrowUpRight,
  AlertCircle,
  X,
  Bell,
  User,
  ExternalLink,
  Store,
  CreditCard,
} from "lucide-react";
import type { NotificationItem } from "../types/notificationTypes";
import {
  maskAccountNumber,
  formatNotificationMessage,
} from "../utils/notificationFormatters";
import { SESSION_TIMEOUT_EVENT } from "../../../utils/sessionEvents";
import { hasTokens, subscribeToAuthenticationChanges } from "../../../utils/tokenStorage";

export interface ToastData {
  id: string;
  title: string;
  message: string;
  type?: "TRANSFER" | "PAYMENT" | "SECURITY" | "SYSTEM" | "SUCCESS" | "ERROR" | "INFO";
  transferDirection?: "SENT" | "RECEIVED" | null;
  amount?: number | null;
  currency?: string | null;
  counterpartyName?: string | null;
  counterpartyAccountNumber?: string | null;
  transactionRef?: string | null;
  duration?: number;
}

// Global utility helper to trigger toasts anywhere in frontend
export const showAppToast = (toast: Omit<ToastData, "id">) => {
  const id = Math.random().toString(36).substring(2, 9);
  window.dispatchEvent(
    new CustomEvent("show-toast-notification", {
      detail: { ...toast, id },
    })
  );
};

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const addToast = useCallback((newToast: ToastData) => {
    setToasts((prev) => {
      // Limit to max 4 concurrent toasts
      const filtered = prev.filter((t) => t.id !== newToast.id);
      return [newToast, ...filtered].slice(0, 4);
    });

    // Optional pleasant subtle chime via Web Audio API
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.35);
    } catch {
      // AudioContext not supported or restricted by browser gesture
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    // 1. Listen to real-time WebSocket notifications
    const handleWsNotification = (e: Event) => {
      const customEvent = e as CustomEvent<NotificationItem>;
      const noti = customEvent.detail;
      if (!noti) return;

      const titleLower = (noti.title || "").toLowerCase();
      const isFailed = titleLower.includes("fail") || titleLower.includes("reject");
      const isReceived =
        noti.transferDirection === "RECEIVED" ||
        titleLower.includes("received") ||
        titleLower.includes("funds received");
      const isSent =
        noti.transferDirection === "SENT" ||
        titleLower.includes("transfer sent") ||
        titleLower.includes("transferred");

      let direction: "SENT" | "RECEIVED" | null = null;
      if (isReceived) direction = "RECEIVED";
      else if (isSent) direction = "SENT";

      addToast({
        id: `noti-${noti.notificationId || Math.random().toString(36).substring(2, 9)}`,
        title: noti.title,
        message: noti.message,
        type: isFailed ? "ERROR" : noti.notificationType || "TRANSFER",
        transferDirection: direction,
        amount: noti.amount,
        currency: noti.currency || "MMK",
        counterpartyName: noti.counterpartyName,
        counterpartyAccountNumber: noti.counterpartyAccountNumber,
        transactionRef: noti.transactionRef,
        duration: 5000,
      });
    };

    // 2. Listen to generic programmatic toast triggers
    const handleCustomToast = (e: Event) => {
      const customEvent = e as CustomEvent<ToastData>;
      if (customEvent.detail) {
        addToast(customEvent.detail);
      }
    };

    // 3. Clear active toasts on Session Timeout or Logout
    const clearAllToasts = () => {
      setToasts([]);
    };

    const unsubscribeAuth = subscribeToAuthenticationChanges(() => {
      if (!hasTokens()) {
        clearAllToasts();
      }
    });

    window.addEventListener("ws-notification-received", handleWsNotification);
    window.addEventListener("show-toast-notification", handleCustomToast);
    window.addEventListener(SESSION_TIMEOUT_EVENT, clearAllToasts);

    return () => {
      window.removeEventListener("ws-notification-received", handleWsNotification);
      window.removeEventListener("show-toast-notification", handleCustomToast);
      window.removeEventListener(SESSION_TIMEOUT_EVENT, clearAllToasts);
      unsubscribeAuth();
    };
  }, [addToast]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={() => removeToast(toast.id)} />
      ))}
    </div>
  );
};

interface ToastItemProps {
  toast: ToastData;
  onDismiss: () => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onDismiss }) => {
  const [progress, setProgress] = useState<number>(100);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const duration = toast.duration || 5000;
  const remainingRef = useRef<number>(duration);
  const lastTickRef = useRef<number>(Date.now());
  const onDismissRef = useRef(onDismiss);

  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    if (isPaused) return;

    lastTickRef.current = Date.now();

    const timer = setInterval(() => {
      const now = Date.now();
      const delta = now - lastTickRef.current;
      lastTickRef.current = now;

      remainingRef.current = Math.max(0, remainingRef.current - delta);
      const newProgress = (remainingRef.current / duration) * 100;

      if (remainingRef.current <= 0) {
        clearInterval(timer);
        onDismissRef.current();
      } else {
        setProgress(newProgress);
      }
    }, 50);

    return () => clearInterval(timer);
  }, [isPaused, duration]);

  const titleLower = toast.title.toLowerCase();
  const isError =
    toast.type === "ERROR" ||
    titleLower.includes("fail") ||
    titleLower.includes("reject") ||
    titleLower.includes("error");
  const isReceived =
    toast.transferDirection === "RECEIVED" ||
    titleLower.includes("received") ||
    titleLower.includes("funds received");
  const isSent =
    toast.transferDirection === "SENT" ||
    titleLower.includes("transfer sent") ||
    titleLower.includes("sent");
  const isPayment =
    toast.type === "PAYMENT" ||
    titleLower.includes("payment");

  const formatAmount = (num: number | null | undefined) => {
    if (num === null || num === undefined) return null;
    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 2,
    }).format(num);
  };

  const navigate = useNavigate();
  const location = useLocation();

  const handleOpenReceipt = () => {
    onDismiss();
    const ref = toast.transactionRef || toast.id;
    navigate(`/receipt/${encodeURIComponent(ref)}`, {
      state: {
        notification: toast,
        from: location.pathname,
      },
    });
  };

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className={`pointer-events-auto relative overflow-hidden rounded-2xl bg-white/95 backdrop-blur-md p-4 shadow-2xl border transition-all duration-300 animate-in slide-in-from-right-8 fade-in ${
        isReceived
          ? "border-emerald-200 shadow-emerald-500/10 ring-1 ring-emerald-500/20"
          : isSent
          ? "border-blue-200 shadow-blue-500/10 ring-1 ring-blue-500/20"
          : isError
          ? "border-red-200 shadow-red-500/10 ring-1 ring-red-500/20"
          : "border-slate-200 shadow-slate-500/10"
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Icon Pill */}
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
            isReceived
              ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
              : isSent
              ? "bg-blue-50 text-blue-600 border border-blue-100"
              : isError
              ? "bg-red-50 text-red-600 border border-red-100"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          {isPayment && isReceived ? (
            <Store className="w-5 h-5" />
          ) : isPayment && isSent ? (
            <CreditCard className="w-5 h-5" />
          ) : isReceived ? (
            <ArrowDownLeft className="w-5 h-5" />
          ) : isSent ? (
            <ArrowUpRight className="w-5 h-5" />
          ) : isError ? (
            <AlertCircle className="w-5 h-5" />
          ) : (
            <Bell className="w-5 h-5" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-xs font-black text-slate-900 tracking-tight flex items-center gap-1.5 truncate">
              {toast.title}
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
            </h4>

            {/* Amount Badge */}
            {toast.amount !== undefined && toast.amount !== null && (
              <span
                className={`text-[11px] font-black px-2 py-0.5 rounded-full shrink-0 ${
                  isReceived
                    ? "bg-emerald-100 text-emerald-800"
                    : isSent
                    ? "bg-rose-100 text-rose-800"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                {isReceived ? "+ " : isSent ? "- " : ""}
                {formatAmount(toast.amount)} {toast.currency || "MMK"}
              </span>
            )}
          </div>

          {/* Prominent Counterparty Account Holder Name */}
          {toast.counterpartyName && (
            <div className="mt-1 flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <User className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="truncate">
                {isReceived ? "From: " : isSent ? "To: " : ""}
                {toast.counterpartyName}
                {toast.counterpartyAccountNumber
                  ? ` (${maskAccountNumber(toast.counterpartyAccountNumber)})`
                  : ""}
              </span>
            </div>
          )}

          {/* Description / Message */}
          <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed line-clamp-2">
            {formatNotificationMessage(toast)}
          </p>

          {/* Footer with Ref & View action */}
          <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
            <span>Just now</span>

            <button
              onClick={handleOpenReceipt}
              className="text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-1 hover:underline transition"
            >
              <span>View slip</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </button>
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={onDismiss}
          className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition shrink-0"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Auto-dismiss Animated Progress Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-100">
        <div
          className={`h-full transition-all duration-75 ${
            isReceived
              ? "bg-emerald-500"
              : isSent
              ? "bg-blue-500"
              : isError
              ? "bg-red-500"
              : "bg-slate-400"
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};
