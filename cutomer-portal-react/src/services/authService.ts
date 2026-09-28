import api from "../config/api";

import type {
  LoginRequest,
  LoginResponse,
  OtpVerifyRequest,
  OtpVerifyResponse,
} from "../types/auth";

export const loginCustomer = async (
  data: LoginRequest
): Promise<LoginResponse> => {

  const response =
    await api.post<LoginResponse>(
      "/login",
      data
    );

  return response.data;
};


export const verifyOtp = async (
  data: OtpVerifyRequest
): Promise<OtpVerifyResponse> => {

  const response =
    await api.post<OtpVerifyResponse>(
      "/verify-otp",
      data
    );

  return response.data;
};