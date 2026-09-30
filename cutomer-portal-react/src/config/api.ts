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


const BASE_URL =
  "http://localhost:8080/api/customer/auth";


// =====================================
// MAIN AXIOS INSTANCE
// =====================================

const api = axios.create({
  baseURL: BASE_URL,

  headers: {
    "Content-Type": "application/json",
  },
});


// =====================================
// REFRESH RESPONSE TYPE
// =====================================

interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}


// =====================================
// RETRY REQUEST TYPE
// =====================================

interface RetryableRequestConfig
  extends InternalAxiosRequestConfig {

  _retry?: boolean;

}


// =====================================
// PUBLIC ENDPOINT CHECK
// =====================================

const isPublicEndpoint = (
  url?: string
) => {

  if (!url) {
    return false;
  }

  return (
    url.includes("/login") ||
    url.includes("/verify-otp") ||
    url.includes("/resend-otp") ||
    url.includes(
      "/first-login/change-password"
    ) ||
    url.includes(
      "/first-login/setup-pin"
    ) ||
    url.includes("/refresh")
  );
};


// =====================================
// REQUEST INTERCEPTOR
// =====================================

api.interceptors.request.use(

  (config) => {

    const accessToken =
      getAccessToken();


    // Public API တွေမှာ
    // Access Token မပို့ပါ
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


// =====================================
// SEPARATE CLIENT FOR REFRESH
// =====================================

// ဒီ client မှာ interceptor မရှိပါ
// infinite refresh loop မဖြစ်စေရန်

const refreshClient =
  axios.create({

    baseURL: BASE_URL,

    headers: {
      "Content-Type": "application/json",
    },

  });


// =====================================
// RESPONSE INTERCEPTOR
// =====================================

api.interceptors.response.use(

  // Request success
  (response) => {

    return response;

  },


  // Request error
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


    // =================================
    // NOT 401
    // =================================

    if (status !== 401) {

      return Promise.reject(error);

    }


    // =================================
    // PUBLIC ENDPOINT 401
    // =================================

    // Wrong password login → 401
    // Wrong login ကို refresh မလုပ်ရပါ

    if (
      isPublicEndpoint(
        originalRequest.url
      )
    ) {

      return Promise.reject(error);

    }


    // =================================
    // ALREADY RETRIED
    // =================================

    if (originalRequest._retry) {

      return Promise.reject(error);

    }


    originalRequest._retry = true;


    // =================================
    // GET REFRESH TOKEN
    // =================================

    const refreshToken =
      getRefreshToken();


    if (!refreshToken) {

      clearTokens();

      sessionStorage.removeItem(
        "challengeGroupId"
      );

      sessionStorage.removeItem(
        "maskedEmail"
      );

      window.location.href = "/";

      return Promise.reject(error);

    }


    // =================================
    // REFRESH ACCESS TOKEN
    // =================================

    try {

      const response =
        await refreshClient.post<
          RefreshTokenResponse
        >(
          "/refresh",
          {
            refreshToken:
              refreshToken,
          }
        );


      const newAccessToken =
        response.data.accessToken;

      const newRefreshToken =
        response.data.refreshToken;


      // =================================
      // REFRESH TOKEN ROTATION
      // =================================

      saveTokens(
        newAccessToken,
        newRefreshToken
      );


      // =================================
      // UPDATE FAILED REQUEST
      // =================================

      originalRequest.headers.Authorization =
        `Bearer ${newAccessToken}`;


      // =================================
      // RETRY ORIGINAL REQUEST
      // =================================

      return api(
        originalRequest
      );


    } catch (refreshError) {


      // Refresh Token ကိုပါ
      // backend က reject လုပ်လိုက်ပြီ

      clearTokens();

      sessionStorage.removeItem(
        "challengeGroupId"
      );

      sessionStorage.removeItem(
        "maskedEmail"
      );


      // Login Page ပြန်ပို့
      window.location.href = "/";


      return Promise.reject(
        refreshError
      );

    }

  }

);


export default api;