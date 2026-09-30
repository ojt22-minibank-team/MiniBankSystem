import axios from 'axios';
import { API_BASE_URL, STORAGE_KEYS } from '../config/api.config';

// ============================================================
// Axios instance configured for the Core Banking backend
// ============================================================

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// ============================================================
// Request interceptor — attach JWT access token from localStorage
// ============================================================

axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ============================================================
// Response interceptor — normalize errors
// ============================================================

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear stale auth data and force re-login
      localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.USERNAME);
      localStorage.removeItem(STORAGE_KEYS.ROLES);
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export default axiosInstance;
