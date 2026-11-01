import {
  useState,
  type FormEvent,
} from "react";

import {
  useNavigate,
} from "react-router-dom";


import {
  verifyPinResetOtp,
  resendPinResetOtp,
} from "../../../services/authService";


import { AuthHeading, AuthField, AuthCodeField, AuthNotice, AuthSecurityNote, AuthExpiryNote } from "../components/IndividualAuthUI";
import { authSecondaryButtonClass, authLinkButtonClass, authCodeInputClass } from "../components/IndividualAuthStyles";

function PinResetOtpPage() {

  // ======================================================
  // NAVIGATION
  // ======================================================

  const navigate =
    useNavigate();


  // ======================================================
  // STATE
  // ======================================================

  const [
    otp,
    setOtp,
  ] = useState("");


  const [
    error,
    setError,
  ] = useState("");


  const [
    message,
    setMessage,
  ] = useState("");


  const [
    loading,
    setLoading,
  ] = useState(false);


  const [
    resending,
    setResending,
  ] = useState(false);


  const [
    challengeGroupId,
    setChallengeGroupId,
  ] = useState<string | null>(
    () =>
      sessionStorage.getItem(
        "pinResetChallengeGroupId"
      )
  );


  const [
    maskedEmail,
    setMaskedEmail,
  ] = useState<string | null>(
    () =>
      sessionStorage.getItem(
        "pinResetMaskedEmail"
      )
  );


  // ======================================================
  // VERIFY PIN RESET OTP
  // ======================================================

  const handleVerifyOtp = async (
    e: FormEvent
  ) => {

    e.preventDefault();


    setError("");

    setMessage("");


    // ----------------------------------------------
    // 1. Challenge must exist
    // ----------------------------------------------

    if (
      !challengeGroupId
    ) {

      setError(
        "PIN reset session is missing. Please start again."
      );

      return;

    }


    // ----------------------------------------------
    // 2. OTP must be exactly 6 digits
    // ----------------------------------------------

    if (
      !/^\d{6}$/.test(
        otp
      )
    ) {

      setError(
        "Please enter a valid 6-digit OTP."
      );

      return;

    }


    try {

      setLoading(
        true
      );


      // ----------------------------------------------
      // 3. Verify OTP
      // ----------------------------------------------

      const response =
        await verifyPinResetOtp({

          challengeGroupId:
            challengeGroupId,

          otp:
            otp,

        });


      // ----------------------------------------------
      // 4. Backend must return verified challenge
      // ----------------------------------------------

      if (
        !response.verifiedChallengeGroupId
      ) {

        setError(
          "PIN reset verification information is missing."
        );

        return;

      }


      // ----------------------------------------------
      // 5. Save VERIFIED challenge
      // ----------------------------------------------

      sessionStorage.setItem(
        "verifiedPinResetChallengeGroupId",
        response.verifiedChallengeGroupId
      );


      // ----------------------------------------------
      // 6. Old OTP challenge no longer needed
      // ----------------------------------------------

      sessionStorage.removeItem(
        "pinResetChallengeGroupId"
      );


      // ----------------------------------------------
      // 7. Go to new PIN page
      // ----------------------------------------------

      navigate(
        "/pin-reset/new-pin"
      );


    } catch (
      err: any
    ) {

      setError(

        err.response?.data?.message
        ||
        "OTP verification failed. Please try again."

      );


    } finally {

      setLoading(
        false
      );

    }

  };


  // ======================================================
  // RESEND PIN RESET OTP
  // ======================================================

  const handleResendOtp =
    async () => {

      setError("");

      setMessage("");


      if (
        !challengeGroupId
      ) {

        setError(
          "PIN reset session is missing. Please start again."
        );

        return;

      }


      try {

        setResending(
          true
        );


        const response =
          await resendPinResetOtp({

            challengeGroupId:
              challengeGroupId,

          });


        // ----------------------------------------------
        // Backend normally keeps same challengeGroupId
        // but update it if backend returns one
        // ----------------------------------------------

        if (
          response.challengeGroupId
        ) {

          setChallengeGroupId(
            response.challengeGroupId
          );


          sessionStorage.setItem(
            "pinResetChallengeGroupId",
            response.challengeGroupId
          );

        }


        // ----------------------------------------------
        // Update masked email if returned
        // ----------------------------------------------

        if (
          response.maskedEmail
        ) {

          setMaskedEmail(
            response.maskedEmail
          );


          sessionStorage.setItem(
            "pinResetMaskedEmail",
            response.maskedEmail
          );

        }


        // Old OTP input must be cleared

        setOtp("");


        setMessage(

          response.message
          ||
          "A new Transaction PIN reset OTP has been sent to your registered email."

        );


      } catch (
        err: any
      ) {

        setError(

          err.response?.data?.message
          ||
          "Unable to resend OTP. Please try again."

        );


      } finally {

        setResending(
          false
        );

      }

    };


  // ======================================================
  // BACK TO PROFILE
  // ======================================================

  const handleBack =
    () => {

      sessionStorage.removeItem(
        "pinResetChallengeGroupId"
      );


      sessionStorage.removeItem(
        "pinResetMaskedEmail"
      );


      sessionStorage.removeItem(
        "verifiedPinResetChallengeGroupId"
      );


      navigate(
        "/profile"
      );

    };


  // ======================================================
  // UI
  // ======================================================

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-[#F3F7FB] p-4 md:static md:z-auto md:overflow-visible md:bg-transparent md:p-0">
      <div className="mx-auto flex min-h-[calc(100dvh-2rem)] w-full items-center justify-center md:min-h-[calc(100dvh-8rem)] lg:min-h-[calc(100dvh-9rem)]">
        <section aria-label="PIN reset OTP verification" className="w-full min-w-0 max-w-[520px] rounded-3xl border border-[#CDC0A8] bg-white p-5 shadow-[0_16px_48px_-24px_rgba(26,54,93,0.3)] sm:p-6 md:[@media(max-height:700px)]:p-4 md:[@media(max-height:700px)]:[&>div:first-child]:mb-1 md:[@media(max-height:700px)]:[&>div:first-child>span]:mb-0 md:[@media(max-height:700px)]:[&>div:last-child]:mt-2 md:[@media(max-height:700px)]:[&>div:last-child]:p-2">
          <AuthHeading
            title="OTP Verification"
            description={
              <>
                Enter the 6-digit code sent to{" "}
                <strong className="font-semibold text-[#08295C]">
                  {maskedEmail || "your registered email"}
                </strong>{" "}
                to reset your transaction PIN.
              </>
            }
            variant="otp"
          />
          <form onSubmit={handleVerifyOtp} className="space-y-3 md:[@media(max-height:700px)]:space-y-2 md:[@media(max-height:700px)]:[&>p]:my-2">
            <AuthField label="Verification code" htmlFor="individual-recovery-otp">
              <AuthCodeField value={otp}>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={otp}
                  placeholder="000000"
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "");

                    setOtp(value);
                  }}
                  disabled={loading || resending}
                  id="individual-recovery-otp"
                  className={authCodeInputClass}
                  aria-invalid={Boolean(error)}
                  aria-required={true}
                />
              </AuthCodeField>
            </AuthField>
            <AuthExpiryNote />
            <AuthNotice error={error} />
            <AuthNotice message={message} />
            <button
              type="submit"
              disabled={loading || resending}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#56ABC0] px-5 py-2.5 text-sm font-semibold text-[#122E52] shadow-[0_6px_16px_-6px_rgba(37,99,235,0.55)] transition hover:bg-[#4DA0B5] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#113E65] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none"
              aria-busy={loading || resending}
            >
              {loading ||
                (resending && (
                  <span
                    aria-hidden="true"
                    className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-[#122E52]/30 border-t-[#122E52] motion-reduce:animate-none"
                  />
                ))}{" "}
              {loading ? "Verifying..." : "Verify OTP"}
            </button>
          </form>
          <div className="mt-3 text-center md:[@media(max-height:700px)]:mt-2">
            <p className="mb-2 text-xs text-slate-500 md:[@media(max-height:700px)]:mb-1">Didn't receive the code?</p>
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={loading || resending}
              className={authSecondaryButtonClass}
            >
              {" "}
              {resending ? "Sending..." : "Resend OTP"}{" "}
            </button>
          </div>
          <div className="mt-3 text-center md:[@media(max-height:700px)]:mt-2">
            <button
              type="button"
              onClick={handleBack}
              disabled={loading || resending}
              className={authLinkButtonClass}
            >
              {" "}
               Back to Profile
            </button>
          </div>
          <AuthSecurityNote title="Secure verification">
            Your verification code is valid for 5 minutes. Do not share it with anyone.
          </AuthSecurityNote>
        </section>
      </div>
    </div>
  );

}


export default PinResetOtpPage;
