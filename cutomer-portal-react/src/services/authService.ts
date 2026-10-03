import api from "../config/api";

import type {
  LoginRequest,
  LoginResponse,
  OtpVerifyRequest,
  OtpVerifyResponse,
  ChangePasswordRequest,
  SetupPinRequest,
  ResendOtpRequest,
  ResendOtpResponse,

  PasswordResetRequest,
  PasswordResetStartResponse,
  PasswordResetOtpVerifyRequest,
  PasswordResetOtpVerifyResponse,
  PasswordResetConfirmRequest,
} from "../types/auth";


// ======================================================
// LOGIN
// POST /api/customer/auth/login
// ======================================================

export const loginCustomer = async (
  data: LoginRequest
): Promise<LoginResponse> => {

  const response =
    await api.post<LoginResponse>(
      "/auth/login",
      data
    );

  return response.data;
};


// ======================================================
// VERIFY OTP
// POST /api/customer/auth/verify-otp
// ======================================================

export const verifyOtp = async (
  data: OtpVerifyRequest
): Promise<OtpVerifyResponse> => {

  const response =
    await api.post<OtpVerifyResponse>(
      "/auth/verify-otp",
      data
    );

  return response.data;
};


// ======================================================
// FIRST LOGIN - CHANGE PASSWORD
// POST /api/customer/auth/first-login/change-password
// ======================================================

export const changeFirstLoginPassword = async (
  data: ChangePasswordRequest
) => {

  const response =
    await api.post(
      "/auth/first-login/change-password",
      data
    );

  return response.data;
};


// ======================================================
// FIRST LOGIN - SETUP TRANSACTION PIN
// POST /api/customer/auth/first-login/setup-pin
// ======================================================

export const setupTransactionPin = async (
  data: SetupPinRequest
) => {

  const response =
    await api.post(
      "/auth/first-login/setup-pin",
      data
    );

  return response.data;
};


// ======================================================
// RESEND OTP
// POST /api/customer/auth/resend-otp
// ======================================================

export const resendOtp = async (
  data: ResendOtpRequest
): Promise<ResendOtpResponse> => {

  const response =
    await api.post<ResendOtpResponse>(
      "/auth/resend-otp",
      data
    );

  return response.data;
};


// ======================================================
// REFRESH TOKEN RESPONSE
// ======================================================

export interface RefreshTokenResponse {
  success: boolean;
  message: string;
  accessToken: string;
  refreshToken: string;
}


// ======================================================
// REFRESH TOKEN
// POST /api/customer/auth/refresh
// ======================================================

export const refreshCustomerToken = async (
  refreshToken: string
): Promise<RefreshTokenResponse> => {

  const response =
    await api.post<RefreshTokenResponse>(
      "/auth/refresh",
      {
        refreshToken: refreshToken,
      }
    );

  return response.data;
};


export const logoutCustomer = async (): Promise<string> => {

  const response =
    await api.post<string>(
      "/auth/logout"
    );

  return response.data;
};


// ======================================================
// PASSWORD RESET - REQUEST OTP
// POST /api/customer/auth/password-reset/request
// ======================================================

export const requestPasswordReset = async (
  data: PasswordResetRequest
): Promise<PasswordResetStartResponse> => {

  const response =
    await api.post<PasswordResetStartResponse>(
      "/auth/password-reset/request",
      data
    );

  return response.data;
};


// ======================================================
// PASSWORD RESET - RESEND OTP
// POST /api/customer/auth/password-reset/resend-otp
// ======================================================

export const resendPasswordResetOtp = async (
  data: ResendOtpRequest
): Promise<ResendOtpResponse> => {

  const response =
    await api.post<ResendOtpResponse>(
      "/auth/password-reset/resend-otp",
      data
    );

  return response.data;
};


// ======================================================
// PASSWORD RESET - VERIFY OTP
// POST /api/customer/auth/password-reset/verify-otp
// ======================================================

export const verifyPasswordResetOtp = async (
  data: PasswordResetOtpVerifyRequest
): Promise<PasswordResetOtpVerifyResponse> => {

  const response =
    await api.post<PasswordResetOtpVerifyResponse>(
      "/auth/password-reset/verify-otp",
      data
    );

  return response.data;
};


// ======================================================
// PASSWORD RESET - CONFIRM NEW PASSWORD
// POST /api/customer/auth/password-reset/confirm
// ======================================================

export const confirmPasswordReset = async (
  data: PasswordResetConfirmRequest
): Promise<string> => {

  const response =
    await api.post<string>(
      "/auth/password-reset/confirm",
      data
    );

  return response.data;
};
// ======================================================
// TEMPORARY PROTECTED API TEST
// GET /api/customer/auth/test
// Remove this after dashboard integration is completed.
// ======================================================

export const testProtectedApi = async () => {

  const response =
    await api.get(
      "/auth/test"
    );

  return response.data;
};