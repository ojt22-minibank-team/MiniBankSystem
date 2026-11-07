import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { AuthState, AuthUser } from '../../types/common.types';
import type { LoginRequest, LoginResponse, CoreApiResponse, OtpResendResponse } from '../../types/api.types';
import { STORAGE_KEYS, API_BASE_URL } from '../../config/api.config';
import axiosInstance from '../../lib/axios';
import { API_ENDPOINTS } from '../../config/api.config';
import type { AxiosError } from 'axios';

// ============================================================
// Helpers — sessionStorage persistence & role normalization
// ============================================================

export function normalizeRoles(roles: string[] = []): string[] {
  const normalizedSet = new Set<string>();
  for (const r of roles) {
    normalizedSet.add(r);
    // If 'ROLE_ADMIN', also add 'ADMIN'. If 'ADMIN', also add 'ROLE_ADMIN'
    if (r.startsWith('ROLE_')) {
      normalizedSet.add(r.replace(/^ROLE_/, ''));
    } else {
      normalizedSet.add(`ROLE_${r}`);
    }
  }
  return Array.from(normalizedSet);
}

function persistAuth(response: LoginResponse): void {
  const normalized = normalizeRoles(response.roles);
  sessionStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, response.accessToken);
  sessionStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, response.refreshToken);
  sessionStorage.setItem(STORAGE_KEYS.USERNAME, response.username);
  sessionStorage.setItem(STORAGE_KEYS.ROLES, JSON.stringify(normalized));
}

export function broadcastLogout(): void {
  try {
    const channel = new BroadcastChannel('staff_auth_sync');
    channel.postMessage('LOGOUT');
    channel.close();
  } catch {
    // ignore
  }
  try {
    localStorage.setItem('staff_auth_logout_trigger', Date.now().toString());
  } catch {
    // ignore
  }
}

function clearPersistedAuth(): void {
  sessionStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
  sessionStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  sessionStorage.removeItem(STORAGE_KEYS.USERNAME);
  sessionStorage.removeItem(STORAGE_KEYS.ROLES);
  sessionStorage.removeItem(STORAGE_KEYS.STAFF_PROFILE);
}

function loadAuthFromStorage(): {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
} {
  const accessToken = sessionStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  const refreshToken = sessionStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  const username = sessionStorage.getItem(STORAGE_KEYS.USERNAME);
  const rolesRaw = sessionStorage.getItem(STORAGE_KEYS.ROLES);

  if (!accessToken || !username) {
    return { accessToken: null, refreshToken: null, user: null };
  }

  let roles: string[];
  try {
    roles = rolesRaw ? normalizeRoles(JSON.parse(rolesRaw) as string[]) : [];
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
    const response = await axiosInstance.post<CoreApiResponse<LoginResponse> | LoginResponse>(
      API_ENDPOINTS.AUTH.LOGIN,
      credentials,
    );

    // Backend Spring Boot wraps payload in CoreApiResponse<CoreLoginResponse>:
    // { success: true, message: "...", data: { otpRequired: true, challengeGroupId, ... } }
    const rawData = response.data as unknown as Record<string, unknown>;
    const payload = (
      rawData?.data && typeof rawData.data === 'object'
        ? rawData.data
        : rawData
    ) as LoginResponse;

    if (!payload?.accessToken && !payload?.otpRequired) {
      return rejectWithValue('Invalid authentication response from server.');
    }

    return payload;
  } catch (err) {
    const error = err as AxiosError<{ message?: string; error?: string }>;
    const responseData = error.response?.data as any;
    const backendMessage =
      (typeof responseData === 'string' && responseData) ||
      responseData?.message ||
      responseData?.error ||
      responseData?.detail;

    if (backendMessage) {
      return rejectWithValue(backendMessage);
    }
    if (error.response?.status === 401 || error.response?.status === 403) {
      return rejectWithValue('Invalid username or password.');
    }
    if (error.code === 'ECONNABORTED' || !error.response) {
      return rejectWithValue(
        `Cannot connect to server (${API_BASE_URL}). Please verify the backend is running.`,
      );
    }
    return rejectWithValue('Login failed. Please try again.');
  }
});

export const verifyOtpThunk = createAsyncThunk<
  LoginResponse,
  { challengeGroupId: string; otp: string },
  { rejectValue: string }
>('auth/verifyOtp', async ({ challengeGroupId, otp }, { rejectWithValue }) => {
  try {
    const response = await axiosInstance.post<CoreApiResponse<LoginResponse> | LoginResponse>(
      API_ENDPOINTS.AUTH.VERIFY_OTP,
      { challengeGroupId, otp },
    );

    const rawData = response.data as unknown as Record<string, unknown>;
    const payload = (
      rawData?.data && typeof rawData.data === 'object'
        ? rawData.data
        : rawData
    ) as LoginResponse;

    if (!payload?.accessToken) {
      return rejectWithValue('Invalid authentication response from server.');
    }

    return payload;
  } catch (err) {
    const error = err as AxiosError<{ message?: string; error?: string }>;
    const responseData = error.response?.data as any;
    const backendMessage =
      (typeof responseData === 'string' && responseData) ||
      responseData?.message ||
      responseData?.error ||
      responseData?.detail;

    if (backendMessage) {
      return rejectWithValue(backendMessage);
    }
    if (error.response?.status === 401 || error.response?.status === 403) {
      return rejectWithValue('Invalid OTP code.');
    }
    return rejectWithValue('OTP verification failed. Please try again.');
  }
});

export const resendOtpApi = async (challengeGroupId: string): Promise<OtpResendResponse> => {
  const response = await axiosInstance.post<CoreApiResponse<OtpResendResponse> | OtpResendResponse>(
    API_ENDPOINTS.AUTH.RESEND_OTP,
    { challengeGroupId },
  );
  const rawData = response.data as any;
  return (rawData?.data || rawData) as OtpResendResponse;
};

export const logoutThunk = createAsyncThunk<
  void,
  void,
  { rejectValue: string }
>('auth/logout', async (_, { rejectWithValue }) => {
  const refreshToken = sessionStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  try {
    await axiosInstance.post(API_ENDPOINTS.AUTH.LOGOUT, { refreshToken });
  } catch (err) {
    const error = err as AxiosError;
    if (error.response?.status !== 401) {
      return rejectWithValue('Logout request failed, but session has been cleared locally.');
    }
  }
});

// ============================================================
// Initial state — rehydrate from sessionStorage on page load
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
      sessionStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, action.payload.accessToken);
      sessionStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, action.payload.refreshToken);
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
      if (data.otpRequired) {
        state.isAuthenticated = false;
        state.error = null;
        return;
      }
      const normalizedRoles = normalizeRoles(data.roles);
      state.isAuthenticated = true;
      state.accessToken = data.accessToken;
      state.refreshToken = data.refreshToken;
      state.user = {
        username: data.username,
        roles: normalizedRoles,
        permissions: data.permissions ?? [],
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

    // ---- Verify OTP ----
    builder.addCase(verifyOtpThunk.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(verifyOtpThunk.fulfilled, (state, action) => {
      const data = action.payload;
      const normalizedRoles = normalizeRoles(data.roles);
      state.isLoading = false;
      state.isAuthenticated = true;
      state.accessToken = data.accessToken;
      state.refreshToken = data.refreshToken;
      state.user = {
        username: data.username,
        roles: normalizedRoles,
        permissions: data.permissions ?? [],
      };
      state.error = null;
      persistAuth(data);
    });
    builder.addCase(verifyOtpThunk.rejected, (state, action) => {
      state.isLoading = false;
      state.isAuthenticated = false;
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.error = action.payload ?? 'OTP verification failed.';
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
