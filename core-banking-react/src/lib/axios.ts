import axios from 'axios';
import { API_BASE_URL, API_ENDPOINTS, STORAGE_KEYS } from '../config/api.config';
import { updateTokens, forceLogout } from '../features/auth/authSlice';

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
});

// ============================================================++++
// Request interceptor — attach JWT access token from localStorage
// ============================================================++++

axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    if (token && config.headers) {
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

    // Do not intercept or refresh tokens for the login endpoint
    if (!originalRequest || originalRequest.url?.includes(API_ENDPOINTS.AUTH.LOGIN)) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      
      // တကယ်လို့ Refresh လုပ်နေတုန်း တခြား API တွေ 401 တက်လာရင် Queue ထဲမှာ စောင့်ခိုင်းထားမယ်
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
        const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);

        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        const response = await axios.post(
          `${API_BASE_URL}${API_ENDPOINTS.AUTH.REFRESH}`,
          { refreshToken }
        );

        const { accessToken, refreshToken: newRefreshToken } = response.data.data || response.data;

        if (store) {
          store.dispatch(
            updateTokens({
              accessToken,
              refreshToken: newRefreshToken || refreshToken,
            })
          );
        } else {
          localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
          if (newRefreshToken) {
            localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, newRefreshToken);
          }
        }

        // စောင့်နေတဲ့ Queue တွေအားလုံးကို Token အသစ်ပေးပြီး ဆက်အလုပ်လုပ်ခိုင်းမယ်
        processQueue(null, accessToken);

        originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        // Refresh ပါ Fail သွားရင် Queue ထဲက ကောင်တွေပါ အကုန် Reject လုပ်ပြီး Logout လုပ်မယ်
        processQueue(refreshError, null);
        
        if (store) {
          store.dispatch(forceLogout());
        } else {
          localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
          localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
          localStorage.removeItem(STORAGE_KEYS.USERNAME);
          localStorage.removeItem(STORAGE_KEYS.ROLES);
        }
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false; // အားလုံးပြီးသွားရင် ဖွင့်ပေးလိုက်မယ်
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
