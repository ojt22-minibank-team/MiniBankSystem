import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { logoutCustomer } from "../../../services/authService";
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  getAuthenticationGeneration,
  invalidateAuthenticationGeneration,
} from "../../../utils/tokenStorage";

// Shared across consumers so repeated clicks cannot revoke the same session twice.
let logoutPromise: Promise<boolean> | null = null;

export const isIndividualLogoutInProgress = () => logoutPromise !== null;

function logoutIndividualCustomer(): Promise<boolean> {
  if (logoutPromise) return logoutPromise;

  // Invalidate synchronously, while retaining credentials for backend revocation.
  const generation = invalidateAuthenticationGeneration();

  logoutPromise = (async () => {
    try {
      // Keep credentials available until the backend revocation attempt finishes.
      if (getAccessToken() || getRefreshToken()) {
        await logoutCustomer();
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
      return true;
    }
    return false;
  })().finally(() => {
    logoutPromise = null;
  });

  return logoutPromise;
}

export function useIndividualLogout() {
  const navigate = useNavigate();

  return useCallback(async () => {
    if (await logoutIndividualCustomer()) {
      await navigate("/login", { replace: true });
    }
  }, [navigate]);
}
