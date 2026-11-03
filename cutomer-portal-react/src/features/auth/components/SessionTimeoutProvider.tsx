import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  clearTokens,
  getAuthenticationGeneration,
  hasTokens,
  isAuthenticationGenerationCurrent,
  subscribeToAuthenticationChanges,
} from "../../../utils/tokenStorage";
import { keepSessionAlive } from "../../../services/authService";
import { resetCustomerState, useAppDispatch } from "../../../lib/redux";
import { SESSION_TIMEOUT_EVENT, type SessionTimeoutDetail } from "../../../utils/sessionEvents";
import SessionTimeoutModal from "./SessionTimeoutModal";
import { isIndividualLogoutInProgress } from "../hooks/useIndividualLogout";

interface SessionTimeoutProviderProps {
  children: ReactNode;
}

interface TimeoutOwner {
  sourceGeneration: number;
  cleanupGeneration: number;
}

const IDLE_TIMEOUT_MS = 5 * 60 * 1000;
const KEEP_ALIVE_THROTTLE_MS = 60 * 1000;
const DEFAULT_TIMEOUT_MESSAGE = "Your session has expired after 5 minutes of inactivity.";

function SessionTimeoutProvider({ children }: SessionTimeoutProviderProps) {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [timedOut, setTimedOut] = useState(false);
  const [timeoutMessage, setTimeoutMessage] = useState(DEFAULT_TIMEOUT_MESSAGE);
  const idleTimerRef = useRef<number | null>(null);
  const sessionGenerationRef = useRef<number | null>(
    hasTokens() && isAuthenticationGenerationCurrent(getAuthenticationGeneration())
      ? getAuthenticationGeneration() : null
  );
  const expiredRef = useRef(false);
  const modalOwnerRef = useRef<TimeoutOwner | null>(null);
  const lastKeepAliveRef = useRef(0);
  const keepAliveOwnerRef = useRef<object | null>(null);

  const cancelIdleTimer = useCallback(() => {
    if (idleTimerRef.current !== null) {
      window.clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, []);

  const showTimeout = useCallback((
    message: string | undefined,
    sourceGeneration: number,
    invalidatedGeneration?: number
  ) => {
    if (
      !Number.isSafeInteger(sourceGeneration) || sourceGeneration < 0 ||
      sessionGenerationRef.current !== sourceGeneration ||
      expiredRef.current || !hasTokens() || isIndividualLogoutInProgress()
    ) return;

    if (invalidatedGeneration === undefined) {
      if (!isAuthenticationGenerationCurrent(sourceGeneration)) return;
    } else {
      // Axios invalidates G to G+1 before emitting the event. Accept precisely
      // that transition, never a missing origin or an event from an older login.
      if (
        !Number.isSafeInteger(invalidatedGeneration) ||
        invalidatedGeneration !== sourceGeneration + 1 ||
        getAuthenticationGeneration() !== invalidatedGeneration ||
        isAuthenticationGenerationCurrent(invalidatedGeneration)
      ) return;
    }

    // Latch before synchronous token observers run; duplicates cannot re-enter.
    expiredRef.current = true;
    cancelIdleTimer();
    const owner: TimeoutOwner = { sourceGeneration, cleanupGeneration: -1 };
    modalOwnerRef.current = owner;
    clearTokens();
    owner.cleanupGeneration = getAuthenticationGeneration();
    dispatch(resetCustomerState());
    setTimeoutMessage(message || DEFAULT_TIMEOUT_MESSAGE);
    setTimedOut(true);
  }, [cancelIdleTimer, dispatch]);

  const resetIdleTimer = useCallback(() => {
    const generation = sessionGenerationRef.current;
    if (
      generation === null || expiredRef.current || !hasTokens() ||
      !isAuthenticationGenerationCurrent(generation) || isIndividualLogoutInProgress()
    ) return;
    cancelIdleTimer();
    idleTimerRef.current = window.setTimeout(() => {
      // The captured generation survives cancellation and manual invocation.
      showTimeout(DEFAULT_TIMEOUT_MESSAGE, generation);
    }, IDLE_TIMEOUT_MS);
  }, [cancelIdleTimer, showTimeout]);

  useEffect(() => {
    const observeAuthentication = () => {
      const generation = getAuthenticationGeneration();
      if (!hasTokens() || !isAuthenticationGenerationCurrent(generation)) {
        cancelIdleTimer();
        // Retain the origin while Axios emits its post-invalidation expiry.
        return;
      }
      if (sessionGenerationRef.current === generation) return; // refresh rotation
      sessionGenerationRef.current = generation;
      expiredRef.current = false;
      modalOwnerRef.current = null;
      lastKeepAliveRef.current = 0;
      keepAliveOwnerRef.current = null;
      setTimedOut(false);
      resetIdleTimer();
    };
    const unsubscribe = subscribeToAuthenticationChanges(observeAuthentication);
    observeAuthentication();
    return unsubscribe;
  }, [cancelIdleTimer, resetIdleTimer]);

  const sendKeepAliveIfNeeded = useCallback(async () => {
    const generation = sessionGenerationRef.current;
    if (
      generation === null || !isAuthenticationGenerationCurrent(generation) ||
      !hasTokens() || expiredRef.current || isIndividualLogoutInProgress() ||
      keepAliveOwnerRef.current
    ) return;
    const now = Date.now();
    if (now - lastKeepAliveRef.current < KEEP_ALIVE_THROTTLE_MS) return;
    lastKeepAliveRef.current = now;
    const owner = {};
    keepAliveOwnerRef.current = owner;
    try {
      await keepSessionAlive();
    } catch {
      // Axios owns SESSION_EXPIRED handling.
    } finally {
      // A's late completion must not release B's in-flight keepalive.
      if (keepAliveOwnerRef.current === owner) keepAliveOwnerRef.current = null;
    }
  }, []);

  useEffect(() => {
    const handleActivity = (event: Event) => {
      if (!event.isTrusted) return;
      resetIdleTimer();
      void sendKeepAliveIfNeeded();
    };
    resetIdleTimer();
    const activityEvents = ["pointerdown", "click", "keydown", "input", "scroll", "touchstart"];
    for (const event of activityEvents) {
      window.addEventListener(event, handleActivity, { passive: true, capture: true });
    }
    return () => {
      cancelIdleTimer();
      for (const event of activityEvents) window.removeEventListener(event, handleActivity, true);
    };
  }, [cancelIdleTimer, resetIdleTimer, sendKeepAliveIfNeeded]);

  useEffect(() => {
    const handleSessionTimeout = (event: Event) => {
      const detail = (event as CustomEvent<SessionTimeoutDetail>).detail;
      // Unscoped legacy events must not be reinterpreted as the newest session.
      if (!detail || !Number.isSafeInteger(detail.sourceGeneration) ||
          !Number.isSafeInteger(detail.invalidatedGeneration)) return;
      showTimeout(detail.message, detail.sourceGeneration, detail.invalidatedGeneration);
    };
    window.addEventListener(SESSION_TIMEOUT_EVENT, handleSessionTimeout);
    return () => window.removeEventListener(SESSION_TIMEOUT_EVENT, handleSessionTimeout);
  }, [showTimeout]);

  // Capture this render's owner, rather than consulting whichever newer modal
  // happens to exist when an old event handler is eventually invoked.
  const modalOwner = modalOwnerRef.current;
  const handleLoginAgain = () => {
    if (
      !modalOwner || modalOwnerRef.current !== modalOwner ||
      sessionGenerationRef.current !== modalOwner.sourceGeneration ||
      getAuthenticationGeneration() !== modalOwner.cleanupGeneration ||
      isAuthenticationGenerationCurrent(modalOwner.cleanupGeneration) || hasTokens()
    ) return;
    modalOwnerRef.current = null;
    clearTokens();
    sessionStorage.removeItem("challengeGroupId");
    sessionStorage.removeItem("maskedEmail");
    sessionStorage.removeItem("pinResetChallengeGroupId");
    sessionStorage.removeItem("pinResetMaskedEmail");
    sessionStorage.removeItem("verifiedPinResetChallengeGroupId");
    setTimedOut(false);
    navigate("/login", { replace: true });
  };

  return (
    <>
      {children}
      <SessionTimeoutModal open={timedOut} message={timeoutMessage} onLoginAgain={handleLoginAgain} />
    </>
  );
}

export default SessionTimeoutProvider;
