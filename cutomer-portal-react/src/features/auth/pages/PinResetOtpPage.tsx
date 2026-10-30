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


import { AuthRecoveryLayout, IndividualAuthCard, AuthHeading, AuthField, AuthCodeField, AuthNotice, AuthSecurityNote, AuthExpiryNote } from "../components/IndividualAuthUI";
import { authPrimaryButtonClass, authSecondaryButtonClass, authLinkButtonClass, authCodeInputClass } from "../components/IndividualAuthStyles";

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
    <AuthRecoveryLayout>
      <IndividualAuthCard variant="otp">
        <AuthHeading
          title="Verify your email"
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
        <form onSubmit={handleVerifyOtp} className="space-y-3">
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
            className={authPrimaryButtonClass}
            aria-busy={loading || resending}
          >
            {loading ||
              (resending && (
                <span
                  aria-hidden="true"
                  className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-white/30 border-t-white motion-reduce:animate-none"
                />
              ))}{" "}
            {loading ? "Verifying..." : "Verify OTP"}
          </button>
        </form>
        <div className="mt-3 text-center">
          <p className="mb-2 text-xs text-slate-500">Didn't receive the code?</p>
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
        <div className="mt-3 text-center">
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
      </IndividualAuthCard>
    </AuthRecoveryLayout>
  );

}


export default PinResetOtpPage;