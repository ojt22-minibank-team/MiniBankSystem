import axios from 'axios';
import { API_BASE_URL, API_ENDPOINTS, STORAGE_KEYS } from '../config/api.config';
import { updateTokens, forceLogout, broadcastLogout } from '../features/auth/authSlice';
import { clearBankingMemoryCache } from '../hooks/useBankingData';

let store: any;

export const injectStore = (_store: any) => {
  store = _store;
};

// Queue system for concurrent refresh requests
let isRefreshing = false;
let failedQueue: Array<{ resolve: (value?: string) => void; reject: (reason?: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
  withCredentials: true,
});

// ============================================================
// Request interceptor — attach JWT access token from sessionStorage
// ============================================================

axiosInstance.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    const isPublicAuth =
      config.url?.includes('/api/auth/login') ||
      config.url?.includes('/api/auth/verify-otp') ||
      config.url?.includes('/api/auth/resend-otp');
    if (token && config.headers && !isPublicAuth) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Do not intercept or refresh tokens for auth endpoints (login, verify-otp, resend-otp, etc.)
    if (!originalRequest || originalRequest.url?.includes('/api/auth/')) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      // If a refresh is already in flight, queue incoming requests
      if (isRefreshing) {
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
            return axiosInstance(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = sessionStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);

        // Uses withCredentials: true so that the HttpOnly 'cb_refresh_token' cookie is transmitted
        const response = await axios.post(
          `${API_BASE_URL}${API_ENDPOINTS.AUTH.REFRESH}`,
          refreshToken ? { refreshToken } : {},
          { withCredentials: true }
        );

        const { accessToken, refreshToken: newRefreshToken } = response.data.data || response.data;

        if (store) {
          store.dispatch(
            updateTokens({
              accessToken,
              refreshToken: newRefreshToken || refreshToken || undefined,
            })
          );
        } else {
          sessionStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
        }

        processQueue(null, accessToken);

        originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        const currentUsername = sessionStorage.getItem(STORAGE_KEYS.USERNAME) || '';
        processQueue(refreshError, null);
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
        const pendingReason = sessionStorage.getItem('cb_logout_reason') || 'role_changed';
        window.location.href = `/login?reason=${encodeURIComponent(pendingReason)}`;
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
