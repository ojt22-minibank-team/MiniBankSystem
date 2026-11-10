import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL, API_ENDPOINTS, STORAGE_KEYS } from '../config/api.config';
import { updateTokens, forceLogout, broadcastLogout } from '../features/auth/authSlice';
import { clearBankingMemoryCache } from '../hooks/useBankingData';

let store: any;

export const injectStore = (_store: any) => {
  store = _store;
};

const AUTH_LOCK_NAME = 'auth_token_refresh_lock';
const SHARED_ACCESS_TOKEN_KEY = 'cb_shared_access_token';
const SHARED_TOKEN_TIME_KEY = 'cb_shared_token_time';

// Single-tab fallback queue & state
let isRefreshingFallback = false;
let refreshPromiseFallback: Promise<string> | null = null;

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
  withCredentials: true,
});

// ============================================================
// Core refresh token caller
// ============================================================
const performTokenRefresh = async (): Promise<string> => {
  try {
    const refreshToken = sessionStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);

    // withCredentials: true transmits the secure HttpOnly 'cb_refresh_token' cookie
    const response = await axios.post(
      `${API_BASE_URL}${API_ENDPOINTS.AUTH.REFRESH}`,
      refreshToken ? { refreshToken } : {},
      { withCredentials: true }
    );

    const { accessToken, refreshToken: newRefreshToken } =
      response.data.data || response.data;

    if (!accessToken) {
      throw new Error('Refresh response did not return an access token');
    }

    // 1. Sync to current tab's sessionStorage
    sessionStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);

    // 2. Broadcast / share across other browser tabs via localStorage
    localStorage.setItem(SHARED_ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(SHARED_TOKEN_TIME_KEY, Date.now().toString());

    // 3. Sync to Redux store
    if (store) {
      store.dispatch(
        updateTokens({
          accessToken,
          refreshToken: newRefreshToken || refreshToken || undefined,
        })
      );
    }

    return accessToken;
  } catch (refreshError) {
    // Clear tokens across all tabs and force logout
    localStorage.removeItem(SHARED_ACCESS_TOKEN_KEY);
    localStorage.removeItem(SHARED_TOKEN_TIME_KEY);

    const currentUsername = sessionStorage.getItem(STORAGE_KEYS.USERNAME) || '';
    clearBankingMemoryCache();
    if (currentUsername) {
      broadcastLogout(currentUsername);
    }

    if (store) {
      store.dispatch(forceLogout());
    } else {
      sessionStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      sessionStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      sessionStorage.removeItem(STORAGE_KEYS.USERNAME);
      sessionStorage.removeItem(STORAGE_KEYS.ROLES);
    }

    const pendingReason = sessionStorage.getItem('cb_logout_reason') || 'session_expired';
    window.location.href = `/login?reason=${encodeURIComponent(pendingReason)}`;
    throw refreshError;
  }
};

// ============================================================
// Cross-tab lock orchestrator (navigator.locks)
// ============================================================
const requestTokenRefreshWithLock = async (tokenThatFailed: string): Promise<string> => {
  // Check if browser supports native Web Locks API
  if (typeof navigator !== 'undefined' && 'locks' in navigator) {
    return await navigator.locks.request(AUTH_LOCK_NAME, async () => {
      // 1. Double-check: did another tab already refresh the token while we were queued for the lock?
      const sharedToken = localStorage.getItem(SHARED_ACCESS_TOKEN_KEY);
      const sessionToken = sessionStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const latestCandidateToken = sharedToken || sessionToken;

      if (latestCandidateToken && latestCandidateToken !== tokenThatFailed) {
        // Another tab has successfully rotated & refreshed the token.
        // Adopt the newly obtained token without calling /api/auth/refresh again.
        sessionStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, latestCandidateToken);
        if (store) {
          store.dispatch(updateTokens({ accessToken: latestCandidateToken }));
        }
        return latestCandidateToken;
      }

      // 2. We are the active lock holder — perform the actual refresh API call
      return await performTokenRefresh();
    });
  }

  // Fallback for non-Web-Locks environments (single-tab in-memory promise)
  if (isRefreshingFallback && refreshPromiseFallback) {
    return await refreshPromiseFallback;
  }

  isRefreshingFallback = true;
  refreshPromiseFallback = performTokenRefresh().finally(() => {
    isRefreshingFallback = false;
    refreshPromiseFallback = null;
  });

  return await refreshPromiseFallback;
};

// ============================================================
// Request interceptor — attach JWT access token from sessionStorage / localStorage
// ============================================================
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token =
      sessionStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN) ||
      localStorage.getItem(SHARED_ACCESS_TOKEN_KEY);

    const isPublicAuth =
      config.url?.includes('/api/auth/login') ||
      config.url?.includes('/api/auth/verify-otp') ||
      config.url?.includes('/api/auth/resend-otp');

    if (token && config.headers && !isPublicAuth) {
      if (typeof config.headers.set === 'function') {
        config.headers.set('Authorization', `Bearer ${token}`);
      } else {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ============================================================
// Response interceptor — handle 401 with navigator.locks
// ============================================================
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    // Do not intercept or refresh tokens for auth endpoints (login, verify-otp, resend-otp, etc.)
    if (!originalRequest || originalRequest.url?.includes('/api/auth/')) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // Extract the exact token that resulted in the 401
      const rawAuth =
        (originalRequest.headers &&
          (typeof originalRequest.headers.get === 'function'
            ? originalRequest.headers.get('Authorization')
            : originalRequest.headers['Authorization'] || originalRequest.headers['authorization'])) ||
        '';

      const failedToken = typeof rawAuth === 'string'
        ? rawAuth.replace(/^Bearer\s+/i, '').trim()
        : (sessionStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN) || '');

      try {
        // Wait for lock or acquire lock to get the new access token
        const newAccessToken = await requestTokenRefreshWithLock(failedToken);

        // Update headers for the retry request
        if (originalRequest.headers) {
          if (typeof originalRequest.headers.set === 'function') {
            originalRequest.headers.set('Authorization', `Bearer ${newAccessToken}`);
          } else {
            originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
          }
        }

        // Retry the original failed request silently with the newly obtained token
        return axiosInstance(originalRequest);
      } catch (refreshErr) {
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
