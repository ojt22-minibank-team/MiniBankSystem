import {
  useState,
  type FormEvent,
} from "react";

import {
  Navigate,
  useNavigate,
} from "react-router-dom";


import {
  verifyPasswordResetOtp,
  resendPasswordResetOtp,
} from "../../../services/authService";

import { Clock3, Mail, ShieldCheck } from "lucide-react";
import { AuthField, AuthCodeField, AuthNotice } from "../components/IndividualAuthUI";
import { authCodeInputClass } from "../components/IndividualAuthStyles";

import { EkarajAuthLayout } from "../components/EkarajAuthLayout";
import { EkarajAuthCard } from "../components/EkarajAuthCard";
import { ekarajPrimaryButtonClass, ekarajSecondaryButtonClass, ekarajLinkButtonClass } from "../components/EkarajAuthStyles";



// Keep shared field defaults intact; scope the recovery page's cell styling here.
const resetOtpCodeClass =
  "mx-auto w-full max-w-[298px] sm:max-w-[318px] [&>div]:max-w-none [&_[aria-hidden=true]]:gap-0.5 sm:[&_[aria-hidden=true]]:gap-1.5 [&_[aria-hidden=true]>span]:rounded-xl [&_[aria-hidden=true]>span]:border-[#CDD5DF] [&_[aria-hidden=true]>span]:font-medium [&_[aria-hidden=true]>span]:text-[#122E52] [&_[aria-hidden=true]>span]:shadow-sm [&_.group:focus-within_span[class*='group-focus-within']]:border-[#113E65] [&_.group:focus-within_span[class*='group-focus-within']]:ring-2 [&_.group:focus-within_span[class*='group-focus-within']]:ring-[#113E65]";

function PasswordResetOtpPage() {

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


  const navigate =
    useNavigate();


  // ======================================================
  // GET PASSWORD RESET DATA FROM SESSION STORAGE
  // ======================================================

  const challengeGroupId =
    sessionStorage.getItem(
      "passwordResetChallengeGroupId"
    );


  const maskedEmail =
    sessionStorage.getItem(
      "passwordResetMaskedEmail"
    );


  // ======================================================
  // VERIFY PASSWORD RESET OTP
  // ======================================================

  const handleVerifyOtp = async (
    e: FormEvent
  ) => {

    e.preventDefault();


    setError("");

    setMessage("");


    // ====================================================
    // 1. CHALLENGE GROUP ID CHECK
    // ====================================================

    if (
      !challengeGroupId
    ) {

      setError(
        "Password reset session is missing. Please start again."
      );

      return;

    }


    // ====================================================
    // 2. OTP MUST BE EXACTLY 6 DIGITS
    // ====================================================

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


      // ==================================================
      // 3. CALL VERIFY OTP API
      // ==================================================

      const response =
        await verifyPasswordResetOtp({

          challengeGroupId:
            challengeGroupId,

          otp:
            otp,

        });


      // ==================================================
      // 4. DEVELOPMENT LOG
      // ==================================================

      console.log(
        "PASSWORD RESET VERIFY RESPONSE:",
        response
      );


      console.log(
        "verified challenge id:",
        response.challengeGroupId
      );


      // ==================================================
      // 5. BACKEND RESPONSE CHECK
      // ==================================================

      if (
        !response.challengeGroupId
      ) {

        setError(
          "Password reset verification information is missing."
        );

        return;

      }


      // ==================================================
      // 6. SAVE VERIFIED CHALLENGE ID
      //
      // Backend property name = challengeGroupId
      // But this value is the NEW verified challenge ID.
      // ==================================================

      sessionStorage.setItem(
        "verifiedPasswordResetChallengeGroupId",
        response.challengeGroupId
      );


      // ==================================================
      // 7. REMOVE OLD OTP CHALLENGE
      // ==================================================

      sessionStorage.removeItem(
        "passwordResetChallengeGroupId"
      );


      // ==================================================
      // 8. GO TO NEW PASSWORD PAGE
      // ==================================================

      navigate(
        "/password-reset/new-password",
        // Leave this page before its cleared challenge can trigger the guard.
        { replace: true, flushSync: true }
      );


    } catch (
      error: any
    ) {

      setError(

        error.response?.data?.message
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
  // RESEND PASSWORD RESET OTP
  // ======================================================

  const handleResendOtp =
    async () => {

      setError("");

      setMessage("");


      // ====================================================
      // 1. CHALLENGE GROUP ID CHECK
      // ====================================================

      if (
        !challengeGroupId
      ) {

        setError(
          "Password reset session is missing. Please start again."
        );

        return;

      }


      try {

        setResending(
          true
        );


        // ==================================================
        // 2. CALL RESEND OTP API
        // ==================================================

        const response =
          await resendPasswordResetOtp({

            challengeGroupId:
              challengeGroupId,

          });


        // ==================================================
        // 3. SAVE RETURNED CHALLENGE GROUP ID
        // ==================================================

        if (
          response.challengeGroupId
        ) {

          sessionStorage.setItem(
            "passwordResetChallengeGroupId",
            response.challengeGroupId
          );

        }


        // ==================================================
        // 4. CLEAR OLD OTP INPUT
        // ==================================================

        setOtp("");


        // ==================================================
        // 5. SUCCESS MESSAGE
        // ==================================================

        setMessage(

          response.message
          ||
          "A new OTP has been sent to your registered email."

        );


      } catch (
        error: any
      ) {

        setError(

          error.response?.data?.message
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
  // BACK TO FORGOT PASSWORD
  // ======================================================

  const handleBack =
    () => {

      sessionStorage.removeItem(
        "passwordResetChallengeGroupId"
      );


      sessionStorage.removeItem(
        "passwordResetMaskedEmail"
      );


      sessionStorage.removeItem(
        "verifiedPasswordResetChallengeGroupId"
      );


      navigate(
        "/forgot-password"
      );

    };


  // ======================================================
  // UI
  // ======================================================

  if (
    !challengeGroupId ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(challengeGroupId)
  ) {
    return <Navigate to="/forgot-password" replace />;
  }

  return (
    <EkarajAuthLayout title="EKARAJ BANK | Password Reset Verification">
      <EkarajAuthCard
        ariaLabel="Password reset OTP card"
        formLabel="Password reset verification"
        variant="recovery"
        leftHeading={<>Verify Your Identity.<br />Complete Your Password Reset.</>}
      >
              <div className="mb-3 text-center">
                <span aria-hidden="true" className="mx-auto mb-1.5 flex h-10 w-10 items-center justify-center rounded-full border border-[#C6D5E3] bg-[#EAF2FA] text-[#113E65]">
                  <Mail size={21} strokeWidth={1.8} />
                </span>
                <h1 className="font-serif text-2xl font-medium leading-8 tracking-tight text-[#1A365D]">OTP Verification</h1>
                <p className="mt-1 break-words text-sm leading-5 text-[#59697D]">
              Enter the 6-digit code sent to{" "}
              <strong className="font-semibold text-[#1A365D]">
                {maskedEmail || "your registered email"}
              </strong>{" "}
              to reset your password.
                </p>
              </div>
        <form onSubmit={handleVerifyOtp} className="space-y-2.5 [&_label]:text-[#1A365D]">
          <AuthField label="Verification code" htmlFor="individual-recovery-otp">
            <div className="-mx-3 sm:mx-0">
            <div className={resetOtpCodeClass}>
            <AuthCodeField value={otp}>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                placeholder="000000"
                autoComplete="one-time-code"
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
            </div>
            </div>
          </AuthField>
          <p className="flex items-center justify-center gap-1.5 text-xs leading-4 text-[#59697D]"><Clock3 aria-hidden="true" size={14} />Your verification code is valid for 5 minutes.</p>
          <AuthNotice error={error} />
          <AuthNotice message={message} />
          <button
            type="submit"
            disabled={loading || resending}
            className={ekarajPrimaryButtonClass}
            aria-busy={loading || resending}
          >
            {loading ||
              (resending && (
                <span
                  aria-hidden="true"
                  className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-[#122E52]/25 border-t-[#122E52] motion-reduce:animate-none"
                />
              ))}{" "}
            {loading ? "Verifying..." : "Verify OTP"}
          </button>
        </form>
        <div className="mt-2.5 text-center">
          <p className="mb-1.5 text-xs leading-4 text-[#59697D]">Didn't receive the code?</p>
          <button
            type="button"
            onClick={handleResendOtp}
            disabled={loading || resending}
            className={ekarajSecondaryButtonClass}
          >
            {" "}
            {resending ? "Sending..." : "Resend OTP"}{" "}
          </button>
        </div>
        <div className="mt-1.5 text-center">
          <button
            type="button"
            onClick={handleBack}
            disabled={loading || resending}
            className={ekarajLinkButtonClass}
          >
            {" "}
             Back to Password Recovery
          </button>
        </div>
              <div className="mt-2.5 flex items-start gap-3 rounded-xl border border-[#C6D5E3] bg-[#EAF2FA] p-2.5">
                <ShieldCheck aria-hidden="true" size={20} className="mt-0.5 shrink-0 text-[#113E65]" />
                <div>
                  <p className="text-xs font-semibold leading-4 text-[#1A365D]">Secure verification</p>
                  <p className="mt-0.5 text-xs leading-4 text-[#59697D]">Your verification code is valid for 5 minutes. Do not share it with anyone.</p>
                </div>
              </div>
      </EkarajAuthCard>
    </EkarajAuthLayout>
  );

}


export default PasswordResetOtpPage;
