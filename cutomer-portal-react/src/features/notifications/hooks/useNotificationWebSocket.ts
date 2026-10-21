import { useEffect, useRef, useState } from "react";
import {
  getAccessToken, getAuthenticationGeneration, hasTokens, isAuthenticationGenerationCurrent,
  subscribeToAuthenticationChanges,
} from "../../../utils/tokenStorage";
import { SESSION_TIMEOUT_EVENT } from "../../../utils/sessionEvents";
import type { NotificationItem } from "../types/notificationTypes";

interface UseNotificationWebSocketProps {
  onNotificationReceived?: (notification: NotificationItem) => void;
}

interface Authentication {
  token: string;
  generation: number;
  customerId: string;
  sessionId: string;
  expiresAt: number;
}

// Lifecycle checks only. The server verifies signatures and session authorization.
function currentAuthentication(): Authentication | null {
  const token = getAccessToken();
  const generation = getAuthenticationGeneration();
  if (!token || !hasTokens() || !isAuthenticationGenerationCurrent(generation)) return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const part = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const claims = JSON.parse(atob(part.padEnd(Math.ceil(part.length / 4) * 4, "=")));
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (claims.subjectType !== "CUSTOMER" || claims.tokenType !== "ACCESS" ||
        !uuid.test(claims.sub) || !uuid.test(claims.sid) || typeof claims.exp !== "number" ||
        !Number.isFinite(claims.exp) || claims.exp * 1000 <= Date.now()) return null;
    return { token, generation, customerId: claims.sub, sessionId: claims.sid, expiresAt: claims.exp * 1000 };
  } catch { return null; }
}

export const useNotificationWebSocket = ({
  onNotificationReceived,
}: UseNotificationWebSocketProps = {}) => {
  const [isConnected, setIsConnected] = useState(false);
  const callbackRef = useRef(onNotificationReceived);
  useEffect(() => { callbackRef.current = onNotificationReceived; }, [onNotificationReceived]);

  useEffect(() => {
    let disposed = false;
    let socket: WebSocket | null = null;
    let authentication: Authentication | null = null;
    let reconnectTimer: number | undefined;
    let expiryTimer: number | undefined;
    let attempts = 0;
    let blockedToken: string | null = null;
    let policyBlocked = false;
    let endedGeneration: number | null = null;
    const maximumAttempts = 5;

    const clearTimers = () => {
      window.clearTimeout(reconnectTimer);
      window.clearTimeout(expiryTimer);
      reconnectTimer = expiryTimer = undefined;
    };

    const closeSocket = () => {
      clearTimers();
      const old = socket;
      socket = null;
      if (old) {
        try { old.close(1000, "Authentication changed"); } catch { /* Already closed. */ }
        if (!disposed) setIsConnected(false);
      }
    };

    const stillCurrent = (expected: Authentication) => {
      const current = currentAuthentication();
      return !disposed && current !== null && current.generation !== endedGeneration &&
        current.generation === expected.generation && current.token === expected.token &&
        current.customerId === expected.customerId && current.sessionId === expected.sessionId;
    };

    const retry = (expected: Authentication) => {
      if (!stillCurrent(expected) || blockedToken === expected.token || reconnectTimer !== undefined) return;
      if (attempts >= maximumAttempts) { blockedToken = expected.token; return; }
      const delay = Math.min(2000 * Math.pow(2, Math.max(0, attempts - 1)), 30000);
      reconnectTimer = window.setTimeout(() => {
        reconnectTimer = undefined;
        if (stillCurrent(expected)) connect(expected);
      }, delay);
    };

    function connect(expected: Authentication) {
      if (!stillCurrent(expected) || socket || blockedToken === expected.token) return;
      attempts++;
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.hostname || "localhost";
      try {
        // Access token only; transport retained for existing browser/client compatibility.
        const ws = new WebSocket(protocol + "//" + host + ":8080/ws/notifications?token=" + encodeURIComponent(expected.token));
        socket = ws;
        expiryTimer = window.setTimeout(() => synchronize(), Math.max(0, expected.expiresAt - Date.now()));
        ws.onopen = () => {
          if (socket !== ws || !stillCurrent(expected)) {
            try { ws.close(1000, "Authentication changed"); } catch { /* Already closed. */ }
            return;
          }
          attempts = 0;
          setIsConnected(true);
        };
        ws.onmessage = event => {
          if (socket !== ws || !stillCurrent(expected)) {
            if (socket === ws) closeSocket();
            return;
          }
          try {
            const payload = JSON.parse(event.data);
            if (payload.type === "NOTIFICATION" && payload.data) {
              const notification: NotificationItem = payload.data;
              callbackRef.current?.(notification);
              window.dispatchEvent(new CustomEvent("ws-notification-received", { detail: notification }));
            }
          } catch { /* Ignore PONG/invalid payloads; never log tokens or notification data. */ }
        };
        ws.onclose = event => {
          if (socket !== ws || disposed) return;
          socket = null;
          clearTimers();
          setIsConnected(false);
          if (!stillCurrent(expected)) return;
          if (event.code === 1008 || event.code === 1000) {
            blockedToken = expected.token;
            policyBlocked = true;
            return;
          }
          retry(expected);
        };
        // Handshake failures reach onclose without HTTP status. Avoid logging token-bearing URLs.
        ws.onerror = () => { /* onclose owns bounded retries. */ };
      } catch { retry(expected); }
    }

    function synchronize() {
      if (disposed) return;
      const current = currentAuthentication();
      if (!current || current.generation === endedGeneration) {
        closeSocket();
        authentication = null;
        return;
      }
      if (authentication?.token !== current.token || authentication.generation !== current.generation) {
        closeSocket();
        authentication = current;
        blockedToken = null;
        policyBlocked = false;
        attempts = 0;
        connect(current);
      } else if (!socket && reconnectTimer === undefined) {
        connect(current);
      }
    }

    const sessionEnded = () => {
      endedGeneration = getAuthenticationGeneration();
      authentication = null;
      closeSocket();
    };
    const online = () => {
      if (!policyBlocked) { blockedToken = null; attempts = 0; synchronize(); }
    };

    // Observe existing authentication/rotation only: this hook never requests refresh.
    const unsubscribe = subscribeToAuthenticationChanges(synchronize);
    window.addEventListener(SESSION_TIMEOUT_EVENT, sessionEnded);
    window.addEventListener("storage", synchronize);
    window.addEventListener("online", online);
    const heartbeat = window.setInterval(() => {
      synchronize();
      if (socket?.readyState === WebSocket.OPEN && authentication && stillCurrent(authentication)) {
        try { socket.send("PING"); } catch { /* onclose handles transport failure. */ }
      }
    }, 25000);
    synchronize();

    return () => {
      disposed = true;
      window.clearInterval(heartbeat);
      window.removeEventListener(SESSION_TIMEOUT_EVENT, sessionEnded);
      window.removeEventListener("storage", synchronize);
      window.removeEventListener("online", online);
      unsubscribe();
      closeSocket();
    };
  }, []);

  return { isConnected };
};
