import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { logoutCustomer } from "../../../services/authService";
import { clearPendingPaymentRedirect } from "../utils/pendingPaymentRedirect";
import {
  clearTokens,
  getAccessToken,
  getAuthenticationGeneration,
  invalidateAuthenticationGeneration,
} from "../../../utils/tokenStorage";

// Only consumers ending the same authentication generation share an operation.
let logoutLock: { generation: number; promise: Promise<number | null> } | null = null;

export const isIndividualLogoutInProgress = () =>
  logoutLock?.generation === getAuthenticationGeneration();

function logoutIndividualCustomer(): Promise<number | null> {
  if (logoutLock?.generation === getAuthenticationGeneration()) return logoutLock.promise;

  const accessToken = getAccessToken();
  // End the old intent immediately, even while backend revocation is pending.
  clearPendingPaymentRedirect();
  // Invalidate synchronously, while retaining credentials for backend revocation.
  const generation = invalidateAuthenticationGeneration();

  const promise = (async () => {
    try {
      // Bind revocation to this session even if Axios dispatch runs after a new login.
      if (accessToken) {
        await logoutCustomer(accessToken);
      }
    } catch {
      // Expired credentials or an unavailable backend must not block local logout.
    }

    // A late logout must not clear a newer login's credentials or OTP data.
    if (getAuthenticationGeneration() === generation) {
      clearTokens();
      // Only keys used by the Individual login and recovery flows.
      for (const key of [
        "challengeGroupId",
        "maskedEmail",
        "passwordResetChallengeGroupId",
        "passwordResetMaskedEmail",
        "verifiedPasswordResetChallengeGroupId",
        "pinResetChallengeGroupId",
        "pinResetMaskedEmail",
        "verifiedPinResetChallengeGroupId",
      ]) {
        sessionStorage.removeItem(key);
      }
      return getAuthenticationGeneration();
    }
    return null;
  })().finally(() => {
    if (logoutLock?.promise === promise) logoutLock = null;
  });

  // Invalidation increments the generation; subsequent clicks must join that value.
  logoutLock = { generation, promise };
  return promise;
}

export function useIndividualLogout() {
  const navigate = useNavigate();

  return useCallback(async () => {
    const completedGeneration = await logoutIndividualCustomer();
    // A login can finish between cleanup and this caller's continuation.
    if (completedGeneration !== null && getAuthenticationGeneration() === completedGeneration) {
      await navigate("/login", { replace: true });
    }
  }, [navigate]);
}
