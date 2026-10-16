import { useEffect, useRef, useState, useCallback } from "react";
import { getAccessToken } from "../../../utils/tokenStorage";
import type { NotificationItem } from "../types/notificationTypes";

interface UseNotificationWebSocketProps {
  onNotificationReceived?: (notification: NotificationItem) => void;
}

export const useNotificationWebSocket = ({
  onNotificationReceived,
}: UseNotificationWebSocketProps = {}) => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectAttemptRef = useRef<number>(0);
  const callbackRef = useRef(onNotificationReceived);

  // Keep latest callback ref without triggering reconnect cycles
  useEffect(() => {
    callbackRef.current = onNotificationReceived;
  }, [onNotificationReceived]);

  const connect = useCallback(() => {
    const token = getAccessToken();
    if (!token) {
      setIsConnected(false);
      return;
    }

    // Determine WebSocket endpoint URL
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.hostname || "localhost";
    const wsUrl = `${protocol}//${host}:8080/ws/notifications?token=${encodeURIComponent(token)}`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        reconnectAttemptRef.current = 0;
        console.log("🟢 [WebSocket] Connected to Real-time Notification Channel");

        // Keep-alive heartbeat ping every 25 seconds
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send("PING");
          }
        }, 25000);
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === "NOTIFICATION" && payload.data) {
            const noti: NotificationItem = payload.data;
            console.log("🔔 [WebSocket] Real-time notification received:", noti);

            // 1. Invoke component callback
            if (callbackRef.current) {
              callbackRef.current(noti);
            }

            // 2. Dispatch global window event for cross-component awareness
            window.dispatchEvent(
              new CustomEvent("ws-notification-received", { detail: noti })
            );
          }
        } catch {
          // Non-JSON or system ping/pong message
        }
      };

      ws.onclose = (event) => {
        setIsConnected(false);
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);

        // Normal closure (e.g. user logout / unmount)
        if (event.code === 1000) {
          console.log("⚪ [WebSocket] Disconnected cleanly");
          return;
        }

        // Exponential backoff reconnect (2s, 4s, 8s, max 30s)
        const attempt = reconnectAttemptRef.current;
        const delay = Math.min(2000 * Math.pow(1.5, attempt), 30000);
        reconnectAttemptRef.current += 1;

        console.log(`🟡 [WebSocket] Reconnecting in ${Math.round(delay / 1000)}s...`);
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, delay);
      };

      ws.onerror = (error) => {
        console.warn("⚠️ [WebSocket] Connection error:", error);
        ws.close();
      };
    } catch (err) {
      console.error("❌ [WebSocket] Failed to establish connection:", err);
    }
  }, []);

  useEffect(() => {
    connect();

    return () => {
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.close(1000, "Client unmount");
      }
    };
  }, [connect]);

  return { isConnected };
};
