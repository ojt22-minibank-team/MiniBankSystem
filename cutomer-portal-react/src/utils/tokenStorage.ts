export const saveTokens = (
  accessToken: string,
  refreshToken: string
) => {
  localStorage.setItem(
    "accessToken",
    accessToken
  );

  localStorage.setItem(
    "refreshToken",
    refreshToken
  );
};