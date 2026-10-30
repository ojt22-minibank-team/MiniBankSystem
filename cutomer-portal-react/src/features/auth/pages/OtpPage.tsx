import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  Navigate,
  useNavigate,
} from "react-router-dom";



import {
  verifyOtp,
  resendOtp,
  testProtectedApi,
} from "../../../services/authService";

import {
  saveTokens,
  hasTokens,
} from "../../../utils/tokenStorage";

import { consumePendingPaymentRedirect } from "../utils/pendingPaymentRedirect";
import { beginIndividualSetupWindow, captureIndividualSetupRequest, clearIndividualSetupWindow, isIndividualSetupRequestCurrent } from "../utils/individualSetupWindow";


import { Clock3, ShieldCheck } from "lucide-react";
import { AuthField, AuthNotice } from "../components/IndividualAuthUI";
import { authCodeInputClass } from "../components/IndividualAuthStyles";

import { EkarajAuthLayout } from "../components/EkarajAuthLayout";
import { EkarajAuthCard } from "../components/EkarajAuthCard";
import { ekarajPrimaryButtonClass, ekarajSecondaryButtonClass } from "../components/EkarajAuthStyles";



function IndividualOtpCodeField({ value, children }: { value: string; children: ReactNode }) {
  return (
    <div className="group relative mx-auto w-full max-w-[298px] sm:max-w-[318px]">
      <div aria-hidden="true" className="pointer-events-none grid grid-cols-6 gap-0.5 sm:gap-1.5">
        {Array.from({ length: 6 }, (_, index) => (
          <span
            key={index}
            className={[
              "inline-flex h-13 min-w-0 items-center justify-center rounded-xl border border-[#CDD5DF] bg-white font-mono text-xl font-medium text-[#122E52] shadow-sm transition-colors motion-reduce:transition-none",
              index === Math.min(value.length, 5) ? "group-focus-within:border-[#113E65] group-focus-within:ring-2 group-focus-within:ring-[#113E65]" : "",
            ].join(" ")}
          >
            {value[index] || ""}
          </span>
        ))}
      </div>
      {children}
    </div>
  );
}

function OtpPage() {
  const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);

  // =========================================
  // STATE
  // =========================================

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
    verifying,
    setVerifying,
  ] = useState(false);


  const [
    resending,
    setResending,
  ] = useState(false);


  const [
    completed,
    setCompleted,
  ] = useState(false);

  const [completedDestination, setCompletedDestination] = useState("/dashboard");


  const [
    testMessage,
    setTestMessage,
  ] = useState("");


  const navigate =
    useNavigate();


  const maskedEmail =
    sessionStorage.getItem(
      "maskedEmail"
    );


  // =========================================
  // VERIFY OTP
  // =========================================

  const handleVerifyOtp =
    async () => {

      setError("");

      setMessage("");

      setTestMessage("");


      const challengeGroupId =
        sessionStorage.getItem(
          "challengeGroupId"
        );


      if (
        !challengeGroupId
      ) {

        setError(
          "Login session is missing. Please login again."
        );

        return;

      }


      if (
        !otp
      ) {

        setError(
          "Please enter OTP."
        );

        return;

      }


      if (
        !/^\d{6}$/.test(
          otp
        )
      ) {

        setError(
          "OTP must be exactly 6 digits."
        );

        return;

      }


      const setupRequest = captureIndividualSetupRequest(challengeGroupId);
      try {

        setVerifying(
          true
        );


        const verificationStartedAt = Date.now();
        const response =
          await verifyOtp({

            challengeGroupId,

            otp,

          });


        if (!active.current || !isIndividualSetupRequestCurrent(setupRequest)) return;

        // =====================================
        // FIRST LOGIN
        // =====================================

        if (
          response.firstLoginSetupRequired
        ) {

          beginIndividualSetupWindow(setupRequest, verificationStartedAt);

          if (
            response.passwordChangeRequired
          ) {

            navigate(
              "/first-login/change-password"
            );

            return;

          }


          if (
            response.pinSetupRequired
          ) {

            navigate(
              "/first-login/setup-pin"
            );

            return;

          }


          setError(
            "Unable to determine first-login setup step."
          );

          return;

        }


        // =====================================
        // NORMAL LOGIN
        // =====================================

        if (
          response.accessToken
          &&
          response.refreshToken
        ) {

          clearIndividualSetupWindow(setupRequest);
          saveTokens(
            response.accessToken,
            response.refreshToken
          );

          const destination = consumePendingPaymentRedirect();
          setCompletedDestination(destination);


          sessionStorage.removeItem(
            "challengeGroupId"
          );


          sessionStorage.removeItem(
            "maskedEmail"
          );


          setCompleted(
            true
          );


          setMessage(
            "Login completed successfully."
          );


          navigate(
            destination,
            { replace: true }
          );

          return;

        }


        setError(
          "Login could not be completed."
        );


      } catch (
        error: any
      ) {

        if (!active.current || !isIndividualSetupRequestCurrent(setupRequest)) return;

        setError(

          error.response?.data?.message
          ||
          "OTP verification failed."

        );


      } finally {

        setVerifying(
          false
        );

      }

    };


  // =========================================
  // RESEND OTP
  // =========================================

  const handleResendOtp =
    async () => {

      setError("");

      setMessage("");


      const challengeGroupId =
        sessionStorage.getItem(
          "challengeGroupId"
        );


      if (
        !challengeGroupId
      ) {

        setError(
          "Login session is missing. Please login again."
        );

        return;

      }


      const resendRequest = captureIndividualSetupRequest(challengeGroupId);
      try {

        setResending(
          true
        );


        const response =
          await resendOtp({

            challengeGroupId,

          });


        if (!active.current || !isIndividualSetupRequestCurrent(resendRequest)) return;

        // Backend returns new challengeGroupId

        if (
          response.challengeGroupId
        ) {

          sessionStorage.setItem(
            "challengeGroupId",
            response.challengeGroupId
          );

        }


        setOtp("");


        setMessage(

          response.message
          ||
          "A new OTP has been sent to your registered email."

        );


      } catch (
        error: any
      ) {

        if (!active.current || !isIndividualSetupRequestCurrent(resendRequest)) return;

        setError(

          error.response?.data?.message
          ||
          "Unable to resend OTP."

        );


      } finally {

        setResending(
          false
        );

      }

    };


  // =========================================
  // TEST PROTECTED API
  // KEEP CURRENT LOGIC
  // UI IS HIDDEN
  // =========================================

  const handleTestProtectedApi =
    async () => {

      setTestMessage("");


      try {

        const response =
          await testProtectedApi();


        console.log(
          "Protected API success:",
          response
        );


        setTestMessage(
          "Protected API success."
        );


      } catch (
        error: any
      ) {

        console.log(
          "Protected API failed:",
          error.response?.data
        );


        setTestMessage(

          error.response?.data?.message
          ||
          "Protected API failed."

        );

      }

    };


  // =========================================
  // UI
  // =========================================

  // Verification removes the challenge before the destination transition commits.
  // Completed verification must never compete with that transition; after logout,
  // cleared tokens still send any restored completed page to Login.
  if (completed) {
    return <Navigate to={hasTokens() ? completedDestination : "/login"} replace />;
  }

  // Login challenges are UUIDs. Never restore the form from browser history
  // after successful verification or logout has removed the challenge.
  const challengeGroupId = sessionStorage.getItem("challengeGroupId");
  if (
    !challengeGroupId ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(challengeGroupId)
  ) {
    return <Navigate to="/login" replace />;
  }

  return (
    <EkarajAuthLayout title="EKARAJ BANK | Email Verification">
      <EkarajAuthCard
        ariaLabel="Individual OTP verification card"
        formLabel="Email verification"
        variant="otp"
        leftHeading={<>Secure Verification<br />for a Safer Tomorrow.</>}
      >
              <div className="mb-4">
                <h1 className="font-serif text-2xl font-medium leading-8 tracking-tight text-[#1A365D]">OTP Verification</h1>
                <p className="mt-0.5 text-sm leading-5 text-[#111418]">
              We've sent a 6-digit verification code to{" "}
              <strong className="font-semibold text-[#122E52]">
                {maskedEmail || "your registered email"}
              </strong>
              .
                </p>
                <div aria-hidden="true" className="mt-1 h-px w-10 bg-[#C6A15B]" />
              </div>
        <AuthField label="Verification code" htmlFor="individual-login-otp">
          <div className="-mx-3 sm:mx-0">
          <IndividualOtpCodeField value={otp}>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              disabled={completed || verifying || resending}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              autoComplete="one-time-code"
              id="individual-login-otp"
              className={authCodeInputClass}
              aria-invalid={Boolean(error)}
              aria-required={true}
            />
          </IndividualOtpCodeField>
          </div>
        </AuthField>
        <p className="mt-2.5 flex items-center justify-center gap-1.5 text-xs leading-4 text-[#627084]"><Clock3 aria-hidden="true" size={14} />Your verification code is valid for 5 minutes.</p>
        <AuthNotice error={error} />
        <AuthNotice message={message} />
        <div className="mt-3">
        <button
          type="button"
          onClick={handleVerifyOtp}
          disabled={verifying || resending || completed}
          className={ekarajPrimaryButtonClass}
          aria-busy={verifying || resending || completed}
        >
          {(verifying ||
            resending ||
            completed) && (
              <span
                aria-hidden="true"
                className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-[#122E52]/25 border-t-[#122E52] motion-reduce:animate-none"
              />
            )}{" "}
          {verifying ? "Verifying..." : "Verify OTP"}
        </button>
        </div>
        {!completed && (
          <div className="mt-3 text-center">
            <p className="mb-1.5 text-xs leading-4 text-[#627084]">Didn't receive the code?</p>
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={verifying || resending}
              className={ekarajSecondaryButtonClass}
              aria-busy={resending}
            >
              {resending && <span aria-hidden="true" className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-[#1A365D]/25 border-t-[#1A365D] motion-reduce:animate-none" />}
              {" "}
              {resending ? "Sending..." : "Resend OTP"}{" "}
            </button>
          </div>
        )}
        <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-[#C6D5E3] bg-[#EAF2FA] p-2">
          <ShieldCheck aria-hidden="true" size={20} className="mt-0.5 shrink-0 text-[#113E65]" />
          <div>
            <p className="text-xs font-semibold leading-4 text-[#1A365D]">Your security comes first.</p>
            <p className="mt-0.5 text-xs leading-4 text-[#59697D]">Never share your OTP with anyone.</p>
          </div>
        </div>
        {completed && (
          <div className="mt-4">
            <button
              type="button"
              onClick={handleTestProtectedApi}
              className={ekarajSecondaryButtonClass}
            >
              Test Protected API
            </button>
            <AuthNotice message={testMessage} />
          </div>
        )}
      </EkarajAuthCard>
    </EkarajAuthLayout>
  );

}


export default OtpPage;
