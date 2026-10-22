import { useEffect, useState, type ReactNode } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { keepAliveCorporate } from "../api/auth";
import {
  CORPORATE_IDLE_MS, CORPORATE_SESSION_ENDED, corporateExpirationReason, corporateLastActivity,
  corporateSessionDeadline, endCorporateSession, getCorporateAccessToken, getCorporateGeneration, hasCorporateSession,
  isCorporateGenerationCurrent, recordCorporateActivity, type CorporateSessionEndReason,
} from "../utils/storage";
import CorporateSessionTimeoutModal from "./CorporateSessionTimeoutModal";

export default function CorporateSessionTimeoutProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [reason, setReason] = useState<CorporateSessionEndReason | null>(() => getCorporateAccessToken() ? corporateExpirationReason() : null);
  const authenticated = hasCorporateSession();
  useEffect(() => {
    const generation = getCorporateGeneration();
    let timer: number | undefined;
    let stopped = false;
    const onEnded = (event: Event) => {
      stopped = true;
      window.clearTimeout(timer);
      setReason((event as Event & { reason?: CorporateSessionEndReason }).reason || "logout");
    };
    window.addEventListener(CORPORATE_SESSION_ENDED, onEnded);
    const check = () => {
      if (stopped || !isCorporateGenerationCurrent(generation)) return false;
      const expired = corporateExpirationReason();
      if (expired) { endCorporateSession(expired); return false; }
      return true;
    };
    const schedule = () => {
      window.clearTimeout(timer);
      if (!check()) return;
      const deadline = Math.min(corporateLastActivity() + CORPORATE_IDLE_MS, corporateSessionDeadline());
      timer = window.setTimeout(schedule, Math.max(0, deadline - Date.now()));
    };
    const activity = (event: Event) => {
      if (!event.isTrusted) return;
      // Check wall time before accepting activity after sleep or a delayed timer.
      if (!check()) return;
      recordCorporateActivity();
      schedule();
      void keepAliveCorporate().catch(() => { /* The Corporate client signals expiration; network errors are not activity. */ });
    };
    const events = ["click", "pointerdown", "keydown", "input", "scroll", "wheel", "touchstart", "touchmove"];
    if (authenticated || getCorporateAccessToken()) {
      schedule();
      events.forEach(name => window.addEventListener(name, activity, { capture: true, passive: true }));
      window.addEventListener("focus", schedule);
      document.addEventListener("visibilitychange", schedule);
      window.addEventListener("pageshow", schedule);
    }
    return () => {
      stopped = true;
      window.clearTimeout(timer);
      window.removeEventListener(CORPORATE_SESSION_ENDED, onEnded);
      events.forEach(name => window.removeEventListener(name, activity, true));
      window.removeEventListener("focus", schedule);
      document.removeEventListener("visibilitychange", schedule);
      window.removeEventListener("pageshow", schedule);
    };
  }, [authenticated]);

  // Timeout wins over the token guard so clearing tokens cannot hide the modal.
  if (reason && reason !== "logout") return <CorporateSessionTimeoutModal
    message={reason === "idle" ? "Your session has expired after 5 minutes of inactivity." : "Your Corporate session has expired. Please login again."}
    onLoginAgain={() => { navigate("/corporate/login", { replace: true }); }} />;
  if (reason === "logout" || !authenticated) return <Navigate to="/corporate/login" replace />;
  return corporateExpirationReason() ? null : children;
}
