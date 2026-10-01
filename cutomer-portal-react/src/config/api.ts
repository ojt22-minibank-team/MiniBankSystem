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

const refreshClient =
  axios.create({

    baseURL: BASE_URL,

    headers: {
      "Content-Type": "application/json",
    },

  });


// ======================================================
// SINGLE REFRESH LOCK
// ======================================================

// refresh request တစ်ခုပဲ run လုပ်စေဖို့
// shared Promise သုံးထားတာပါ

let refreshPromise:
  Promise<string> | null = null;


// ======================================================
// GET NEW ACCESS TOKEN
// ======================================================

const refreshAccessToken =
  async (): Promise<string> => {

    // ----------------------------------------------
    // Refresh request run နေပြီးသားဆို
    // အသစ်ထပ်မခေါ်ဘဲ existing Promise ကို await
    // ----------------------------------------------

    if (refreshPromise) {

      return refreshPromise;

    }


    // ----------------------------------------------
    // Refresh request တစ်ခုပဲ create
    // ----------------------------------------------

    refreshPromise =
      (async () => {

        const refreshToken =
          getRefreshToken();


        if (!refreshToken) {

          throw new Error(
            "Refresh token is missing."
          );

        }


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


        // ------------------------------------------
        // REFRESH TOKEN ROTATION
        // ------------------------------------------

        saveTokens(
          newAccessToken,
          newRefreshToken
        );


        return newAccessToken;

      })();


    try {

      return await refreshPromise;

    } finally {

      // --------------------------------------------
      // Refresh ပြီးသွားရင် lock release
      // --------------------------------------------

      refreshPromise = null;

    }

  };


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
    // 401 မဟုတ်ရင် refresh မလုပ်
    // ==================================================

    if (status !== 401) {

      return Promise.reject(error);

    }


    // ==================================================
    // PUBLIC AUTH ENDPOINT 401
    // ==================================================

    if (
      isPublicEndpoint(
        originalRequest.url
      )
    ) {

      return Promise.reject(error);

    }


    // ==================================================
    // REQUEST RETRY ALREADY DONE ?
    // ==================================================

    if (originalRequest._retry) {

      return Promise.reject(error);

    }


    originalRequest._retry = true;


    // ==================================================
    // REFRESH TOKEN ရှိလား
    // ==================================================

    const refreshToken =
      getRefreshToken();


    if (!refreshToken) {

      clearAuthData();

      window.location.href = "/";

      return Promise.reject(error);

    }


    // ==================================================
    // SINGLE REFRESH FLOW
    // ==================================================

    try {

      const newAccessToken =
        await refreshAccessToken();


      // =================================================
      // ORIGINAL FAILED REQUEST မှာ
      // NEW ACCESS TOKEN ထည့်
      // =================================================

      originalRequest.headers.Authorization =
        `Bearer ${newAccessToken}`;


      // =================================================
      // ORIGINAL REQUEST AUTO RETRY
      // =================================================

      return api(
        originalRequest
      );


    } catch (refreshError) {


      clearAuthData();


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