import { clearPendingPaymentRedirect } from "../features/auth/utils/pendingPaymentRedirect";

const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";

// Individual authentication lifecycle; refresh rotation keeps the same generation.
let authenticationGeneration = 0;
let authenticationInvalidated = false;

// Observers receive lifecycle changes without participating in authentication decisions.
const authenticationListeners = new Set<() => void>();
export const subscribeToAuthenticationChanges = (listener: () => void) => {
  authenticationListeners.add(listener);
  return () => { authenticationListeners.delete(listener); };
};
const notifyAuthenticationChanged = () => {
  for (const listener of [...authenticationListeners]) {
    try { listener(); } catch { /* Observers must never interrupt login, rotation or logout. */ }
  }
};

export const getAuthenticationGeneration = () => authenticationGeneration;

export const isAuthenticationGenerationCurrent = (generation: number) =>
  generation === authenticationGeneration && !authenticationInvalidated;

export const invalidateAuthenticationGeneration = () => {
  authenticationInvalidated = true;
  const invalidatedGeneration = ++authenticationGeneration;
  notifyAuthenticationChanged();
  return invalidatedGeneration;
};


export const saveTokens = (
  accessToken: string,
  refreshToken: string,
  expectedGeneration?: number
) => {

  if (expectedGeneration === undefined) {
    // Login/OTP establishes a new session, distinct from any pending refresh.
    authenticationGeneration++;
    authenticationInvalidated = false;
  } else if (!isAuthenticationGenerationCurrent(expectedGeneration)) {
    throw new Error("Authentication changed while refreshing the session.");
  }

  sessionStorage.setItem(
    ACCESS_TOKEN_KEY,
    accessToken
  );

  sessionStorage.setItem(
    REFRESH_TOKEN_KEY,
    refreshToken
  );
  notifyAuthenticationChanged();
};


export const getAccessToken = () => {

  return sessionStorage.getItem(
    ACCESS_TOKEN_KEY
  );
};


export const getRefreshToken = () => {

  return sessionStorage.getItem(
    REFRESH_TOKEN_KEY
  );
};


export const clearTokens = () => {

  invalidateAuthenticationGeneration();
  clearPendingPaymentRedirect();

  sessionStorage.removeItem(
    ACCESS_TOKEN_KEY
  );

  sessionStorage.removeItem(
    REFRESH_TOKEN_KEY
  );
};


export const hasTokens = () => {

  return Boolean(
    getAccessToken() &&
    getRefreshToken()
  );
};
