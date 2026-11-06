import type { CorporateSetupStep, CorporateTokens } from "../types";

const keys = {
  access: "corporateAccessToken",
  refresh: "corporateRefreshToken",
  challenge: "corporateChallengeGroupId",
  setupExpiry: "corporateSetupExpiresAt",
  setupStep: "corporateSetupStep",
  activity: "corporateLastActivityAt",
  activitySession: "corporateActivitySession",
  keepAliveAt: "corporateKeepAliveStartedAt",
  keepAliveSession: "corporateKeepAliveSession",
} as const;

let generation = 0;
let invalidated = false;
export const CORPORATE_SESSION_ENDED = "minibank:corporate-session-ended";
export const getCorporateGeneration = () => generation;
export const isCorporateGenerationCurrent = (value: number) => value === generation && !invalidated;
export const invalidateCorporateGeneration = () => { invalidated = true; return ++generation; };
export const assertCorporateGeneration = (value: number) => {
  if (!isCorporateGenerationCurrent(value)) throw new Error("Corporate authentication has changed. Please login again.");
};

export function clearCorporateChallenge() {
  sessionStorage.removeItem(keys.challenge);
  sessionStorage.removeItem(keys.setupExpiry);
  sessionStorage.removeItem(keys.setupStep);
}

export function clearCorporateAuth() {
  invalidateCorporateGeneration();
  Object.values(keys).forEach(key => sessionStorage.removeItem(key));
}

export type CorporateSessionEndReason = "logout" | "idle" | "absolute" | "expired";
export function endCorporateSession(reason: CorporateSessionEndReason = "logout") {
  clearCorporateAuth();
  const event = new Event(CORPORATE_SESSION_ENDED);
  Object.assign(event, { reason });
  window.dispatchEvent(event);
}

export function beginCorporateLogin() {
  clearCorporateAuth();
  invalidated = false;
  return generation;
}

export const isCorporateChallenge = (value: unknown): value is string =>
  typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

export function getCorporateChallenge() {
  const value = sessionStorage.getItem(keys.challenge);
  return isCorporateChallenge(value) ? value : null;
}

export function saveCorporateChallenge(value: string) {
  if (!isCorporateChallenge(value)) throw new Error("Invalid Corporate login challenge. Please login again.");
  sessionStorage.setItem(keys.challenge, value);
}

export const getCorporateAccessToken = () => sessionStorage.getItem(keys.access);
export const getCorporateRefreshToken = () => sessionStorage.getItem(keys.refresh);

interface TokenClaims { sub: string; sid: string; subjectType: string; tokenType: string; exp: number }
function readClaims(token: string | null, type: string): TokenClaims | null {
  try {
    if (!token || token.split(".").length !== 3) return null;
    const part = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const claims = JSON.parse(atob(part.padEnd(Math.ceil(part.length / 4) * 4, "="))) as Partial<TokenClaims>;
    if (claims.subjectType !== "CORPORATE_USER" || claims.tokenType !== type ||
        !isCorporateChallenge(claims.sub) || !isCorporateChallenge(claims.sid) ||
        typeof claims.exp !== "number" || !Number.isFinite(claims.exp)) return null;
    return claims as TokenClaims;
  } catch { return null; }
}

// Client routing checks only. Signature, revocation, idle and absolute expiry
// remain enforced by the backend on every protected API request.
export function corporateSessionDeadline() {
  const access = readClaims(getCorporateAccessToken(), "ACCESS");
  const refresh = readClaims(getCorporateRefreshToken(), "REFRESH");
  return access && refresh && access.sub === refresh.sub && access.sid === refresh.sid ? refresh.exp * 1000 : 0;
}
export const hasCorporateSession = () => corporateSessionDeadline() > Date.now();

export const CORPORATE_IDLE_MS = 5 * 60 * 1000;
export function corporateLastActivity() {
  const claims = readClaims(getCorporateRefreshToken(), "REFRESH");
  const value = Number(sessionStorage.getItem(keys.activity));
  return claims && sessionStorage.getItem(keys.activitySession) === claims.sid &&
    Number.isFinite(value) && value > 0 && value <= Date.now() ? value : 0;
}
export function recordCorporateActivity() {
  const claims = readClaims(getCorporateRefreshToken(), "REFRESH");
  if (!claims) return;
  sessionStorage.setItem(keys.activitySession, claims.sid);
  sessionStorage.setItem(keys.activity, String(Date.now()));
}
// Reserve before Axios dispatch so failures, route remounts and full reloads
// cannot open another request slot for this session within sixty seconds.
export function reserveCorporateKeepAlive() {
  const claims = readClaims(getCorporateRefreshToken(), "REFRESH");
  if (!claims) return false;
  const raw = sessionStorage.getItem(keys.keepAliveAt);
  const previous = Number(raw);
  if (sessionStorage.getItem(keys.keepAliveSession) === claims.sid && raw !== null &&
      Number.isFinite(previous) && Date.now() - previous < 60_000) return false;
  sessionStorage.setItem(keys.keepAliveSession, claims.sid);
  sessionStorage.setItem(keys.keepAliveAt, String(Date.now()));
  return true;
}

export function corporateExpirationReason(): CorporateSessionEndReason | null {
  if (corporateSessionDeadline() <= Date.now()) return "absolute";
  if (!corporateLastActivity() || Date.now() - corporateLastActivity() >= CORPORATE_IDLE_MS) return "idle";
  return null;
}
export function assertCorporateSessionActive(expectedGeneration: number) {
  assertCorporateGeneration(expectedGeneration);
  const reason = corporateExpirationReason();
  if (reason) {
    endCorporateSession(reason);
    throw new Error("Corporate session has expired. Please login again.");
  }
}


export function saveCorporateTokens(tokens: CorporateTokens, expectedGeneration: number, rotation = false) {
  assertCorporateGeneration(expectedGeneration);
  const access = readClaims(tokens.accessToken, "ACCESS");
  const refresh = readClaims(tokens.refreshToken, "REFRESH");
  if (!access || !refresh || access.exp * 1000 <= Date.now() || refresh.exp * 1000 <= Date.now() ||
      access.sub !== refresh.sub || access.sid !== refresh.sid) {
    throw new Error("Invalid Corporate authentication response. Please login again.");
  }
  if (rotation) {
    assertCorporateSessionActive(expectedGeneration);
    const deadline = corporateSessionDeadline();
    if (!deadline || refresh.exp * 1000 > deadline) throw new Error("Corporate session lifetime cannot be extended.");
  } else {
    generation++;
  }
  sessionStorage.setItem(keys.access, tokens.accessToken);
  sessionStorage.setItem(keys.refresh, tokens.refreshToken);
  if (!rotation) recordCorporateActivity();
}

export const getCorporateSetupExpiry = () => Number(sessionStorage.getItem(keys.setupExpiry)) || 0;
export const getCorporateSetupStep = (): CorporateSetupStep | null => {
  const step = sessionStorage.getItem(keys.setupStep);
  return step === "password" || step === "pin" || step === "complete" ? step : null;
};
export const setCorporateSetupStep = (step: CorporateSetupStep) => sessionStorage.setItem(keys.setupStep, step);
export function beginCorporateSetup(step: CorporateSetupStep, verificationStartedAt: number) {
  // Conservative local window; the backend's OTP consumption timestamp is authoritative.
  sessionStorage.setItem(keys.setupExpiry, String(verificationStartedAt + 10 * 60 * 1000));
  setCorporateSetupStep(step);
}
export const corporateSetupRoute = () => getCorporateSetupStep() === "password"
  ? "/corporate/first-login/change-password" : "/corporate/first-login/setup-pin";
