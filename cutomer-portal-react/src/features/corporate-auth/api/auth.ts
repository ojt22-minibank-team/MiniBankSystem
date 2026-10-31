import corporateApi, { type CorporateRequestConfig } from "./client";
import type { CorporateLoginRequest, CorporateLoginResponse, CorporateOtpResponse, CorporateResendResponse } from "../types";
import {
  assertCorporateGeneration, assertCorporateSessionActive, beginCorporateLogin, beginCorporateSetup, endCorporateSession,
  clearCorporateChallenge, getCorporateAccessToken, getCorporateChallenge, getCorporateGeneration, invalidateCorporateGeneration,
  saveCorporateChallenge, saveCorporateTokens, setCorporateSetupStep, reserveCorporateKeepAlive,
} from "../utils/storage";

const challenge = () => {
  const value = getCorporateChallenge();
  if (!value) throw new Error("Corporate login challenge is missing. Please login again.");
  return value;
};

function acceptAuthentication(data: CorporateOtpResponse, generation: number, startedAt: number) {
  assertCorporateGeneration(generation);
  if (!data.success) throw new Error(data.message || "Corporate authentication failed.");
  if (data.firstLogin) {
    if (!data.passwordChangeRequired && !data.pinSetupRequired) throw new Error("Unable to determine Corporate first-login setup step.");
    beginCorporateSetup(data.passwordChangeRequired ? "password" : "pin", startedAt);
  } else {
    if (typeof data.accessToken !== "string" || typeof data.refreshToken !== "string") {
      throw new Error("Corporate authentication did not return valid tokens. Please login again.");
    }
    saveCorporateTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken }, generation);
    clearCorporateChallenge();
  }
  return data;
}

export async function loginCorporate(data: CorporateLoginRequest) {
  const generation = beginCorporateLogin();
  const response = await corporateApi.post<CorporateLoginResponse>(
    "/auth/login",
    data,
    { timeout: 60_000  }
  );
  assertCorporateGeneration(generation);
  if (!response.data.success || !response.data.otpRequired) throw new Error(response.data.message || "Corporate login did not return an OTP challenge.");
  saveCorporateChallenge(response.data.challengeGroupId);
  return response.data;
}

export async function verifyCorporateOtp(otp: string) {
  const generation = getCorporateGeneration();
  const startedAt = Date.now();
  const { data } = await corporateApi.post<CorporateOtpResponse>("/auth/verify-otp", { challengeGroupId: challenge(), otp });
  return acceptAuthentication(data, generation, startedAt);
}

export async function resendCorporateOtp() {
  const generation = getCorporateGeneration();
  const { data } = await corporateApi.post<CorporateResendResponse>("/auth/resend-otp", { challengeGroupId: challenge() });
  assertCorporateGeneration(generation);
  if (!data.success) throw new Error(data.message || "Unable to resend Corporate OTP.");
  saveCorporateChallenge(data.challengeGroupId);
  return data;
}

export async function changeCorporatePassword(newPassword: string, confirmPassword: string) {
  const generation = getCorporateGeneration();
  const { data } = await corporateApi.post<{ success: boolean; message: string; pinSetupRequired: boolean }>(
    "/auth/first-login/change-password", { challengeGroupId: challenge(), newPassword, confirmPassword });
  assertCorporateGeneration(generation);
  if (!data.success || typeof data.pinSetupRequired !== "boolean") throw new Error(data.message || "Unable to change Corporate password.");
  setCorporateSetupStep(data.pinSetupRequired ? "pin" : "complete");
  return data;
}

export async function setupCorporatePin(transactionPin: string, confirmTransactionPin: string) {
  const generation = getCorporateGeneration();
  await corporateApi.post<string>("/auth/first-login/setup-pin", { challengeGroupId: challenge(), transactionPin, confirmTransactionPin });
  assertCorporateGeneration(generation);
  setCorporateSetupStep("complete");
}

export async function completeCorporateLogin() {
  const generation = getCorporateGeneration();
  const { data } = await corporateApi.post<CorporateOtpResponse>("/auth/first-login/complete", undefined,
    { params: { challengeGroupId: challenge() } });
  if (data.firstLogin) throw new Error("Corporate first-login setup is not complete.");
  return acceptAuthentication(data, generation, Date.now());
}

let logoutLock: { generation: number; promise: Promise<boolean> } | null = null;
export function logoutCorporate(): Promise<boolean> {
  if (logoutLock?.generation === getCorporateGeneration()) return logoutLock.promise;
  const token = getCorporateAccessToken();
  const generation = invalidateCorporateGeneration();
  const promise = (async () => {
    try {
      if (token) await corporateApi.post("/auth/logout", undefined, { headers: { Authorization: `Bearer ${token}` } });
    }
    catch { /* Backend revocation is best effort; always end this local session. */ }
    if (getCorporateGeneration() !== generation) return false;
    endCorporateSession();
    return true;
  })().finally(() => {
    // An older operation must never release a newer session's logout lock.
    if (logoutLock?.promise === promise) logoutLock = null;
  });
  // Store the invalidated generation so repeated calls during this logout join it.
  logoutLock = { generation, promise };
  return promise;
}

// Survives route remounts; deduplication and throttling are scoped to the session generation.
let keepAliveLock: { generation: number; startedAt: number; pending: boolean; promise: Promise<void> } | null = null;
export function keepAliveCorporate(): Promise<void> {
  const generation = getCorporateGeneration();
  try { assertCorporateSessionActive(generation); }
  catch (error) { return Promise.reject(error); }
  if (keepAliveLock?.generation === generation &&
      (keepAliveLock.pending || Date.now() - keepAliveLock.startedAt < 60_000)) return keepAliveLock.promise;
  if (!reserveCorporateKeepAlive()) return Promise.resolve();
  const operation = { generation, startedAt: Date.now(), pending: true, promise: Promise.resolve() };
  const config: CorporateRequestConfig = { corporateGeneration: generation };
  operation.promise = corporateApi.get("/auth/session/keep-alive", config).then(() => {
    assertCorporateSessionActive(generation);
  }).finally(() => {
    operation.pending = false;
  });
  keepAliveLock = operation;
  return operation.promise;
}
