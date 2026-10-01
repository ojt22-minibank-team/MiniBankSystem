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

// IMPORTANT:
//
// Content-Type ကို globally မသတ်မှတ်ပါ.
//
// JSON request ဖြစ်ရင်
// Axios က application/json auto handle လုပ်မယ်.
//
// FormData / image upload ဖြစ်ရင်
// browser က multipart/form-data + boundary
// ကို automatically ထည့်ပေးမယ်.

const api = axios.create({
  baseURL: BASE_URL,
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

// ဒီ client ကို refresh token request အတွက်ပဲသုံးမယ်.
//
// Main api interceptor မသုံးတာကြောင့်
// refresh request 401 ဖြစ်ရင်
// infinite refresh loop မဖြစ်ဘူး.
//
// Refresh endpoint က JSON request ပဲဖြစ်လို့
// application/json ကို ဒီနေရာမှာထားလို့ရပါတယ်.

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

// Protected API requests အများကြီး
// 401 တစ်ပြိုင်နက်ရလာရင်
//
// refresh API ကို request တစ်ခုချင်းစီက
// ထပ်ခေါ်မနေစေဖို့ shared Promise သုံးထားပါတယ်.

let refreshPromise:
  Promise<string> | null = null;


// ======================================================
// REFRESH ACCESS TOKEN
// ======================================================

const refreshAccessToken =
  async (): Promise<string> => {


    // ==================================================
    // Refresh request run နေပြီးသားလား
    // ==================================================

    if (refreshPromise) {

      // အသစ်ထပ်မခေါ်ဘဲ
      // existing refresh request ကို wait လုပ်မယ်.

      return refreshPromise;

    }


    // ==================================================
    // CREATE ONE REFRESH REQUEST
    // ==================================================

    refreshPromise =
      (async () => {

        const refreshToken =
          getRefreshToken();


        // ----------------------------------------------
        // Refresh Token မရှိ
        // ----------------------------------------------

        if (!refreshToken) {

          throw new Error(
            "Refresh token is missing."
          );

        }


        // ----------------------------------------------
        // POST /auth/refresh
        // ----------------------------------------------

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


        // ----------------------------------------------
        // RESPONSE VALIDATION
        // ----------------------------------------------

        if (
          !newAccessToken ||
          !newRefreshToken
        ) {

          throw new Error(
            "Invalid refresh response."
          );

        }


        // ==================================================
        // REFRESH TOKEN ROTATION
        // ==================================================
        //
        // Access A + Refresh A
        //
        // Refresh A successfully used
        //
        // ↓
        //
        // Access B + Refresh B
        //
        // sessionStorage ထဲမှာ
        // new tokens နဲ့ replace လုပ်မယ်.

        saveTokens(
          newAccessToken,
          newRefreshToken
        );


        return newAccessToken;

      })();


    try {

      return await refreshPromise;

    } finally {

      // ==================================================
      // RELEASE SINGLE REFRESH LOCK
      // ==================================================

      refreshPromise = null;

    }

  };


// ======================================================
// RESPONSE INTERCEPTOR
// ======================================================

api.interceptors.response.use(

  // ====================================================
  // SUCCESS RESPONSE
  // ====================================================

  (response) => {

    return response;

  },


  // ====================================================
  // ERROR RESPONSE
  // ====================================================

  async (
    error: AxiosError
  ) => {

    const originalRequest =
      error.config as
        RetryableRequestConfig | undefined;


    // Request config မရှိရင်
    // retry မလုပ်နိုင်.

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
    //
    // ဥပမာ:
    //
    // Wrong password login → 401
    //
    // ဒီလို error ကို refresh token နဲ့
    // refresh မလုပ်ရပါ.

    if (
      isPublicEndpoint(
        originalRequest.url
      )
    ) {

      return Promise.reject(error);

    }


    // ==================================================
    // ORIGINAL REQUEST RETRIED ALREADY ?
    // ==================================================

    if (originalRequest._retry) {

      return Promise.reject(error);

    }


    originalRequest._retry = true;


    // ==================================================
    // REFRESH TOKEN EXISTS ?
    // ==================================================

    const refreshToken =
      getRefreshToken();


    if (!refreshToken) {

      clearAuthData();

      window.location.href =
        "/login";

      return Promise.reject(error);

    }


    // ==================================================
    // SINGLE REFRESH FLOW
    // ==================================================

    try {

      const newAccessToken =
        await refreshAccessToken();


      // ==================================================
      // ORIGINAL FAILED REQUEST
      // NEW ACCESS TOKEN ATTACH
      // ==================================================

      originalRequest.headers.Authorization =
        `Bearer ${newAccessToken}`;


      // ==================================================
      // RETRY ORIGINAL REQUEST
      // ==================================================
      //
      // Dashboard request ဖြစ်လည်း retry
      // Accounts request ဖြစ်လည်း retry
      // Image upload request ဖြစ်လည်း retry
      //
      // FormData ဖြစ်ရင် Content-Type ကို
      // globally force မထားတော့တဲ့အတွက်
      // multipart request ကို handle လုပ်နိုင်မယ်.

      return api(
        originalRequest
      );


    } catch (refreshError) {


      // ==================================================
      // REFRESH TOKEN INVALID / EXPIRED / REVOKED
      // ==================================================

      clearAuthData();


      // Login page ပြန်ပို့

      window.location.href =
        "/login";


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

  // Access Token + Refresh Token

  clearTokens();


  // Temporary OTP / login flow data

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