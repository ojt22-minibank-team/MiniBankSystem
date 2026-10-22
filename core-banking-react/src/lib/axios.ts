import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = 'http://localhost:8080';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 30000,
});

// Request Interceptor: Attach Bearer Token & Staff Identifier
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Default Staff ID header required by some backend endpoints
    if (!config.headers['X-Staff-Id']) {
      const storedUser = localStorage.getItem('staff_user');
      if (storedUser) {
        try {
          const userObj = JSON.parse(storedUser);
          if (userObj.id || userObj.staffId) {
            config.headers['X-Staff-Id'] = String(userObj.id || userObj.staffId);
          }
        } catch {
          config.headers['X-Staff-Id'] = '1';
        }
      } else {
        config.headers['X-Staff-Id'] = '1';
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Handle unauthenticated responses or structured backend errors
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: AxiosError<{ message?: string; error?: string; status?: string }>) => {
    if (error.response?.status === 401) {
      console.warn('Authentication expired or unauthorized access.');
    }
    return Promise.reject(error);
  }
);

export default apiClient;
