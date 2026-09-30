import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { AuthState, AuthUser } from '../../types/common.types';
import type { LoginRequest, LoginResponse } from '../../types/api.types';
import { STORAGE_KEYS } from '../../config/api.config';
import axiosInstance from '../../lib/axios';
import { API_ENDPOINTS } from '../../config/api.config';
import type { AxiosError } from 'axios';

// ============================================================
// Helpers — localStorage persistence
// ============================================================

function persistAuth(response: LoginResponse): void {
  localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, response.accessToken);
  localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, response.refreshToken);
  localStorage.setItem(STORAGE_KEYS.USERNAME, response.username);
  localStorage.setItem(STORAGE_KEYS.ROLES, JSON.stringify(response.roles));
}

function clearPersistedAuth(): void {
  localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.USERNAME);
  localStorage.removeItem(STORAGE_KEYS.ROLES);
}

function loadAuthFromStorage(): {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
} {
  const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  const username = localStorage.getItem(STORAGE_KEYS.USERNAME);
  const rolesRaw = localStorage.getItem(STORAGE_KEYS.ROLES);

  if (!accessToken || !username) {
    return { accessToken: null, refreshToken: null, user: null };
  }

  let roles: string[] = [];
  try {
    roles = rolesRaw ? (JSON.parse(rolesRaw) as string[]) : [];
  } catch {
    roles = [];
  }

  return {
    accessToken,
    refreshToken,
    user: { username, roles, permissions: [] },
  };
}

// ============================================================
// Async thunks
// ============================================================

export const loginThunk = createAsyncThunk<
  LoginResponse,
  LoginRequest,
  { rejectValue: string }
>('auth/login', async (credentials, { rejectWithValue }) => {
  try {
    const response = await axiosInstance.post<LoginResponse>(
      API_ENDPOINTS.AUTH.LOGIN,
      credentials,
    );
    return response.data;
  } catch (err) {
    const error = err as AxiosError<{ message?: string }>;
    if (error.response?.status === 401 || error.response?.status === 403) {
      return rejectWithValue('Invalid username or password.');
    }
    if (error.response?.data?.message) {
      return rejectWithValue(error.response.data.message);
    }
    if (error.code === 'ECONNABORTED' || !error.response) {
      return rejectWithValue(
        'Cannot connect to server. Please check your connection.',
      );
    }
    return rejectWithValue('Login failed. Please try again.');
  }
});

export const logoutThunk = createAsyncThunk<
  void,
  void,
  { rejectValue: string }
>('auth/logout', async (_, { rejectWithValue }) => {
  const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  try {
    // Call backend logout API — requires Authorization header (auto-attached) + refreshToken body
    await axiosInstance.post(API_ENDPOINTS.AUTH.LOGOUT, { refreshToken });
  } catch (err) {
    // Even if the backend call fails, we still clear the local auth state
    const error = err as AxiosError;
    if (error.response?.status !== 401) {
      return rejectWithValue('Logout request failed, but session has been cleared locally.');
    }
  }
});

// ============================================================
// Initial state — rehydrate from localStorage on page load
// ============================================================

const stored = loadAuthFromStorage();

const initialState: AuthState = {
  user: stored.user,
  accessToken: stored.accessToken,
  refreshToken: stored.refreshToken,
  isAuthenticated: !!stored.accessToken && !!stored.user,
  isLoading: false,
  error: null,
};

// ============================================================
// Auth slice
// ============================================================

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError(state) {
      state.error = null;
    },
    // Direct logout without API call (e.g., token expiry)
    forceLogout(state) {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.error = null;
      clearPersistedAuth();
    },
    updateTokens(
      state,
      action: PayloadAction<{ accessToken: string; refreshToken: string }>,
    ) {
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, action.payload.accessToken);
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, action.payload.refreshToken);
    },
  },
  extraReducers: (builder) => {
    // ---- Login ----
    builder.addCase(loginThunk.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(loginThunk.fulfilled, (state, action) => {
      const data = action.payload;
      state.isLoading = false;
      state.isAuthenticated = true;
      state.accessToken = data.accessToken;
      state.refreshToken = data.refreshToken;
      state.user = {
        username: data.username,
        roles: data.roles,
        permissions: data.permissions,
      };
      state.error = null;
      persistAuth(data);
    });
    builder.addCase(loginThunk.rejected, (state, action) => {
      state.isLoading = false;
      state.isAuthenticated = false;
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.error = action.payload ?? 'Login failed.';
    });

    // ---- Logout ----
    builder.addCase(logoutThunk.pending, (state) => {
      state.isLoading = true;
    });
    builder.addCase(logoutThunk.fulfilled, (state) => {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.isLoading = false;
      state.error = null;
      clearPersistedAuth();
    });
    builder.addCase(logoutThunk.rejected, (state) => {
      // Clear anyway even if backend call failed
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.isLoading = false;
      clearPersistedAuth();
    });
  },
});

export const { clearError, forceLogout, updateTokens } = authSlice.actions;
export default authSlice.reducer;
