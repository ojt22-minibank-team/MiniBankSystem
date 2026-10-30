import { useCallback, useEffect, useRef, useState } from "react";
import { getAuthenticationGeneration, hasTokens } from "../../../utils/tokenStorage";

// Presentation metadata only. The backend's consumedAt + 10 minutes is authoritative.
const SETUP_KEY = "individualFirstLoginSetupWindow";
const SETUP_MS = 10 * 60 * 1000;
type SetupWindow = { challengeGroupId: string; expiresAt: number; expired?: true };
type SetupRequest = {
  challengeGroupId: string;
  generation: number;
  metadata: string | null;
};

function readWindow(): SetupWindow | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(SETUP_KEY) || "null");
    return value && typeof value.challengeGroupId === "string" && value.challengeGroupId.length > 0 &&
      Number.isSafeInteger(value.expiresAt) && value.expiresAt > 0 ? value : null;
  } catch { return null; }
}

export function captureIndividualSetupRequest(challengeGroupId: string): SetupRequest {
  return { challengeGroupId, generation: getAuthenticationGeneration(), metadata: sessionStorage.getItem(SETUP_KEY) };
}

export function isIndividualSetupRequestCurrent(request: SetupRequest): boolean {
  return sessionStorage.getItem("challengeGroupId") === request.challengeGroupId &&
    getAuthenticationGeneration() === request.generation &&
    sessionStorage.getItem(SETUP_KEY) === request.metadata;
}

export function beginIndividualSetupWindow(request: SetupRequest, verificationStartedAt: number) {
  if (!isIndividualSetupRequestCurrent(request)) return;
  sessionStorage.setItem(SETUP_KEY, JSON.stringify({
    challengeGroupId: request.challengeGroupId,
    expiresAt: verificationStartedAt + SETUP_MS,
  }));
}

export function clearIndividualSetupWindow(request: SetupRequest) {
  if (isIndividualSetupRequestCurrent(request) && readWindow()?.challengeGroupId === request.challengeGroupId) {
    sessionStorage.removeItem(SETUP_KEY);
  }
}

function isSetupExpiryError(error: unknown): boolean {
  const failure = error as { response?: { status?: number; data?: { code?: string; message?: string } } };
  return failure?.response?.status === 401 && failure.response.data?.code === "SESSION_EXPIRED" &&
    failure.response.data.message === "First-login setup session has expired. Please login again.";
}

export function useIndividualSetupWindow() {
  const challenge = sessionStorage.getItem("challengeGroupId");
  const metadata = sessionStorage.getItem(SETUP_KEY);
  const generation = getAuthenticationGeneration();
  const setupGeneration = useRef(generation);
  const mounted = useRef(true);
  const [expiredFlow, setExpiredFlow] = useState<{ challengeGroupId: string; generation: number } | null>(null);
  const savedWindow = readWindow();
  // Confirmed expiry survives cleanup/remount even when unrelated tokens remain.
  // Bare deadlines keep the token check; neither kind can block a newer challenge.
  const expiredMarker = setupGeneration.current === generation && savedWindow &&
    (savedWindow.expired === true || savedWindow.expiresAt <= Date.now()) &&
    (savedWindow.challengeGroupId === challenge || (!challenge && (savedWindow.expired === true || !hasTokens())));
  const expired = Boolean(expiredMarker || (expiredFlow && expiredFlow.generation === generation &&
    (expiredFlow.challengeGroupId === challenge || !challenge)));

  const expire = useCallback((request: SetupRequest) => {
    if (!mounted.current || !isIndividualSetupRequestCurrent(request)) return false;
    // Retain only a bound, expired presentation marker; never credentials or codes.
    const previous = readWindow();
    sessionStorage.setItem(SETUP_KEY, JSON.stringify({ challengeGroupId: request.challengeGroupId,
      expiresAt: previous?.challengeGroupId === request.challengeGroupId ? Math.min(previous.expiresAt, Date.now()) : Date.now(), expired: true }));
    sessionStorage.removeItem("challengeGroupId");
    sessionStorage.removeItem("maskedEmail");
    setExpiredFlow({ challengeGroupId: request.challengeGroupId, generation: request.generation });
    return true;
  }, []);

  useEffect(() => {
    mounted.current = true;
    const saved = readWindow();
    let timer: number | undefined;
    if (setupGeneration.current === generation && saved && saved.challengeGroupId === challenge) {
      const request = captureIndividualSetupRequest(challenge);
      if (saved.expired === true || saved.expiresAt <= Date.now()) expire(request);
      else timer = window.setTimeout(() => expire(request), saved.expiresAt - Date.now());
    }
    return () => { mounted.current = false; window.clearTimeout(timer); };
  }, [challenge, metadata, generation, expire]);

  function canProceed(request: SetupRequest): boolean {
    if (!mounted.current || setupGeneration.current !== getAuthenticationGeneration() || !isIndividualSetupRequestCurrent(request)) return false;
    const saved = readWindow();
    if (saved?.challengeGroupId === request.challengeGroupId && (saved.expired === true || saved.expiresAt <= Date.now())) {
      expire(request); return false;
    }
    return true;
  }

  return {
    expired,
    capture(challengeGroupId: string) {
      if (challengeGroupId !== challenge || setupGeneration.current !== getAuthenticationGeneration()) return null;
      const request = captureIndividualSetupRequest(challengeGroupId);
      return canProceed(request) ? request : null;
    },
    canProceed,
    handleExpiry(error: unknown, request: SetupRequest) {
      return isSetupExpiryError(error) && expire(request);
    },
  };
}
