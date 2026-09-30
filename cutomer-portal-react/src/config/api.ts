import axios, {
  type AxiosError,
  type InternalAxiosRequestConfig,
} from "axios";

import {
  getAccessToken,
  getRefreshToken,
  saveTokens,
  clearTokens,
} from "../utils/tokenStorage";


// ======================================================
// BASE URL
// ======================================================

const BASE_URL =
  "http://localhost:8080/api/customer";


// ======================================================
// MAIN AXIOS INSTANCE
// ======================================================

const api = axios.create({

  baseURL: BASE_URL,

  headers: {
    "Content-Type": "application/json",
  },

});


// ======================================================
// REFRESH RESPONSE TYPE
// ======================================================

interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}


// ======================================================
// RETRY REQUEST TYPE
// ======================================================

interface RetryableRequestConfig
  extends InternalAxiosRequestConfig {

  _retry?: boolean;

}


// ======================================================
// PUBLIC ENDPOINT CHECK
// ======================================================

const isPublicEndpoint = (
  url?: string
): boolean => {

  if (!url) {
    return false;
  }

  return (
    url.includes("/auth/login") ||
    url.includes("/auth/verify-otp") ||
    url.includes("/auth/resend-otp") ||
    url.includes(
      "/auth/first-login/change-password"
    ) ||
    url.includes(
      "/auth/first-login/setup-pin"
    ) ||
    url.includes("/auth/refresh")
  );

};


// ======================================================
// REQUEST INTERCEPTOR
// ======================================================

api.interceptors.request.use(

  (config) => {

    const accessToken =
      getAccessToken();


    // ==================================================
    // Protected API ဖြစ်မှ Access Token ပို့မယ်
    // ==================================================

    if (
      accessToken &&
      !isPublicEndpoint(config.url)
    ) {

      config.headers.Authorization =
        `Bearer ${accessToken}`;

    }


    return config;

  },


  (error) => {

    return Promise.reject(error);

  }

);


// ======================================================
// SEPARATE AXIOS CLIENT FOR REFRESH TOKEN
// ======================================================

// ဒီ client မှာ interceptor မရှိပါ
// Refresh request က 401 ဖြစ်ရင်
// infinite refresh loop မဖြစ်စေရန်

const refreshClient =
  axios.create({

    baseURL: BASE_URL,

    headers: {
      "Content-Type": "application/json",
    },

  });


// ======================================================
// RESPONSE INTERCEPTOR
// ======================================================

api.interceptors.response.use(

  // ====================================================
  // REQUEST SUCCESS
  // ====================================================

  (response) => {

    return response;

  },


  // ====================================================
  // REQUEST ERROR
  // ====================================================

  async (
    error: AxiosError
  ) => {

    const originalRequest =
      error.config as
        RetryableRequestConfig | undefined;


    if (!originalRequest) {

      return Promise.reject(error);

    }


    const status =
      error.response?.status;


    // ==================================================
    // ERROR က 401 မဟုတ်ရင်
    // refresh မလုပ်ပါ
    // ==================================================

    if (status !== 401) {

      return Promise.reject(error);

    }


    // ==================================================
    // PUBLIC AUTH ENDPOINT 401
    // ==================================================

    // ဥပမာ:
    // Wrong password login → 401
    //
    // ဒီလို Login error ကို
    // Refresh Token သုံးပြီး refresh မလုပ်ရပါ

    if (
      isPublicEndpoint(
        originalRequest.url
      )
    ) {

      return Promise.reject(error);

    }


    // ==================================================
    // REQUEST ကို တစ်ခါ retry လုပ်ပြီးသားလား
    // ==================================================

    if (originalRequest._retry) {

      return Promise.reject(error);

    }


    originalRequest._retry = true;


    // ==================================================
    // GET CURRENT REFRESH TOKEN
    // ==================================================

    const refreshToken =
      getRefreshToken();


    // Refresh Token မရှိတော့ရင်
    // Login Page ပြန်ပို့မယ်

    if (!refreshToken) {

      clearAuthData();

      window.location.href = "/";

      return Promise.reject(error);

    }


    // ==================================================
    // REFRESH ACCESS TOKEN
    // ==================================================

    try {

      const response =
        await refreshClient.post<
          RefreshTokenResponse
        >(
          "/auth/refresh",
          {
            refreshToken:
              refreshToken,
          }
        );


      const newAccessToken =
        response.data.accessToken;


      const newRefreshToken =
        response.data.refreshToken;


      // =================================================
      // REFRESH TOKEN ROTATION
      // =================================================

      // Access A + Refresh A
      //
      // Refresh A သုံးပြီးနောက်
      //
      // Access B + Refresh B
      //
      // ကို sessionStorage ထဲ save

      saveTokens(
        newAccessToken,
        newRefreshToken
      );


      // =================================================
      // FAILED REQUEST ထဲ
      // NEW ACCESS TOKEN ထည့်
      // =================================================

      originalRequest.headers.Authorization =
        `Bearer ${newAccessToken}`;


      // =================================================
      // ORIGINAL REQUEST ကို AUTO RETRY
      // =================================================

      return api(
        originalRequest
      );


    } catch (refreshError) {


      // =================================================
      // REFRESH TOKEN INVALID / EXPIRED / REVOKED
      // =================================================

      clearAuthData();


      // Login Page ပြန်ပို့

      window.location.href = "/";


      return Promise.reject(
        refreshError
      );

    }

  }

);


// ======================================================
// CLEAR AUTH DATA
// ======================================================

const clearAuthData = () => {

  clearTokens();

  sessionStorage.removeItem(
    "challengeGroupId"
  );

  sessionStorage.removeItem(
    "maskedEmail"
  );

};


// ======================================================
// EXPORT
// ======================================================

export default api;