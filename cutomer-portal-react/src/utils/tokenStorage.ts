const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";


export const saveTokens = (
  accessToken: string,
  refreshToken: string
) => {

  sessionStorage.setItem(
    ACCESS_TOKEN_KEY,
    accessToken
  );

  sessionStorage.setItem(
    REFRESH_TOKEN_KEY,
    refreshToken
  );
};


export const getAccessToken = () => {

  return sessionStorage.getItem(
    ACCESS_TOKEN_KEY
  );
};


export const getRefreshToken = () => {

  return sessionStorage.getItem(
    REFRESH_TOKEN_KEY
  );
};


export const clearTokens = () => {

  sessionStorage.removeItem(
    ACCESS_TOKEN_KEY
  );

  sessionStorage.removeItem(
    REFRESH_TOKEN_KEY
  );
};


export const hasTokens = () => {

  return Boolean(
    getAccessToken() &&
    getRefreshToken()
  );
};