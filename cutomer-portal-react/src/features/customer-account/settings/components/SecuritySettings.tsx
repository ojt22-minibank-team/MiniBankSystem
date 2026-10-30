import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { KeyRound, Loader2, ArrowRight, AlertCircle } from "lucide-react";
import SettingsSection from "./SettingsSection";
import { requestPinReset } from "../../../../services/authService";

export default function SecuritySettings() {
  const { t } = useTranslation("settings");
  const navigate = useNavigate();

  const [pinResetLoading, setPinResetLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleForgotPin = useCallback(async () => {
    if (pinResetLoading) {
      return;
    }

    try {
      setPinResetLoading(true);
      setError(null);

      sessionStorage.removeItem("pinResetChallengeGroupId");
      sessionStorage.removeItem("pinResetMaskedEmail");
      sessionStorage.removeItem("verifiedPinResetChallengeGroupId");

      const response = await requestPinReset();

      if (!response.challengeGroupId) {
        setError(t("pinResetFailed", { defaultValue: "Unable to initiate PIN reset. Please try again." }));
        return;
      }

      sessionStorage.setItem("pinResetChallengeGroupId", response.challengeGroupId);

      if (response.destinationMasked) {
        sessionStorage.setItem("pinResetMaskedEmail", response.destinationMasked);
      }

      navigate("/pin-reset/otp");
    } catch (err: unknown) {
      console.error("Failed to start PIN reset:", err);

      const axiosError = err as {
        response?: {
          data?: {
            message?: string;
          };
        };
      };

      setError(
        axiosError.response?.data?.message ??
          t("pinResetFailed", { defaultValue: "Failed to start PIN reset. Please try again." })
      );
    } finally {
      setPinResetLoading(false);
    }
  }, [pinResetLoading, navigate, t]);

  return (
    <SettingsSection
      title={t("security", { defaultValue: "Security" })}
      description={t("securityDescription", {
        defaultValue: "Manage your authorization PIN and account security.",
      })}
    >
      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 p-3.5 text-xs text-red-600 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-800/60">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-[#0f2445]/60 transition-all">
        <div className="flex items-start gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-100/80 dark:bg-cyan-500/20 text-[#00A3C4] dark:text-cyan-300 border border-cyan-200/60 dark:border-cyan-500/30 shadow-xs">
            <KeyRound size={20} />
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {t("transactionPin", { defaultValue: "Transaction PIN" })}
            </h3>

            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {t("pinDescription", {
                defaultValue: "Used to authorize fund transfers and sensitive account actions.",
              })}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleForgotPin}
          disabled={pinResetLoading}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold text-[#00A3C4] hover:text-[#0891B2] dark:text-cyan-300 dark:hover:text-cyan-200 bg-cyan-50 dark:bg-cyan-950/40 hover:bg-cyan-100/70 dark:hover:bg-cyan-900/40 border border-cyan-200/80 dark:border-cyan-500/30 rounded-xl transition-all shadow-xs disabled:cursor-not-allowed disabled:opacity-50 shrink-0 group cursor-pointer"
        >
          {pinResetLoading ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              <span>{t("sendingOtp", { defaultValue: "Sending OTP..." })}</span>
            </>
          ) : (
            <>
              <span>{t("forgotTransactionPin", { defaultValue: "Forgot Transaction PIN" })}</span>
              <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
            </>
          )}
        </button>
      </div>
    </SettingsSection>
  );
}
