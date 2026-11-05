import {
  useState,
  type FormEvent,
} from "react";

import {
  useNavigate,
} from "react-router-dom";


import {
  requestPasswordReset,
} from "../../../services/authService";

import { KeyRound, ShieldCheck, UserRound } from "lucide-react";
import { AuthField, AuthNotice } from "../components/IndividualAuthUI";

import { EkarajAuthLayout } from "../components/EkarajAuthLayout";
import { EkarajAuthCard } from "../components/EkarajAuthCard";
import { ekarajPrimaryButtonClass, ekarajLinkButtonClass } from "../components/EkarajAuthStyles";


const recoveryInputClass =
  "block min-h-11 w-full rounded-xl border border-[#CDD5DF] bg-white py-2.5 pl-11 pr-4 text-sm text-[#111418] shadow-sm outline-none transition-colors placeholder:text-[#757575] hover:border-[#C6A15B] focus:border-[#113E65] focus:ring-2 focus:ring-[#113E65] disabled:cursor-not-allowed disabled:bg-[#E5EAF0] disabled:text-[#757575] motion-reduce:transition-none";

function ForgotPasswordPage() {

  // ======================================================
  // STATE
  // ======================================================

  const [
    loginIdentifier,
    setLoginIdentifier,
  ] = useState("");


  const [
    error,
    setError,
  ] = useState("");


  const [
    loading,
    setLoading,
  ] = useState(false);


  const navigate =
    useNavigate();


  // ======================================================
  // REQUEST PASSWORD RESET OTP
  // ======================================================

  const handleSubmit = async (
    e: FormEvent
  ) => {

    e.preventDefault();

    setError("");


    // ----------------------------------------------
    // 1. EMPTY FIELD CHECK
    // ----------------------------------------------

    if (
      !loginIdentifier.trim()
    ) {

      setError(
        "Please enter your Customer ID or Account Number."
      );

      return;
    }


    try {

      setLoading(
        true
      );


      // ----------------------------------------------
      // 2. CALL BACKEND
      // ----------------------------------------------

      const response =
        await requestPasswordReset({

          loginIdentifier:
            loginIdentifier.trim(),

        });


      // ----------------------------------------------
      // 3. SAVE PASSWORD RESET CHALLENGE
      // ----------------------------------------------

      sessionStorage.setItem(
        "passwordResetChallengeGroupId",
        response.challengeGroupId
      );


      // Backend returns destinationMasked
      // Example: su****@gmail.com

      if (
        response.destinationMasked
      ) {

        sessionStorage.setItem(
          "passwordResetMaskedEmail",
          response.destinationMasked
        );

      }


      // ----------------------------------------------
      // 4. GO TO PASSWORD RESET OTP PAGE
      // ----------------------------------------------

      navigate(
        "/password-reset/otp"
      );


    } catch (
      error: any
    ) {

      setError(

        error.response?.data?.message
        ||
        "Unable to request password reset. Please try again."

      );


    } finally {

      setLoading(
        false
      );

    }

  };


  // ======================================================
  // UI
  // ======================================================

  return (
    <EkarajAuthLayout title="EKARAJ BANK | Password Recovery">
      <EkarajAuthCard
        ariaLabel="Individual password recovery card"
        formLabel="Password recovery"
        variant="recovery"
        leftHeading={<>Reset Your Password.<br />Restore Your Access.</>}
      >
              <div className="mb-4 text-center">
                <span aria-hidden="true" className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full border border-[#C6D5E3] bg-[#EAF2FA] text-[#113E65]">
                  <KeyRound size={24} strokeWidth={1.8} />
                </span>
                <h1 className="font-serif text-2xl font-medium leading-8 tracking-tight text-[#1A365D]">Forgot your password?</h1>
                <p className="mt-1 text-sm leading-5 text-[#59697D]">Enter your Customer ID or Account Number. We will send a verification code to your registered email.</p>
              </div>
        <form onSubmit={handleSubmit} autoComplete="off" className="space-y-3 [&_label]:text-[#1A365D]">
          <AuthField label="Customer ID / Account Number" htmlFor="individual-recovery-id">
            <UserRound aria-hidden="true" size={18} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-[#757575]" />
            <input
              type="text"
              value={loginIdentifier}
              onChange={(e) => setLoginIdentifier(e.target.value)}
              placeholder="Enter Customer ID or Account Number"
              autoComplete="off"
              disabled={loading}
              id="individual-recovery-id"
              className={recoveryInputClass}
              aria-invalid={Boolean(error)}
              aria-required={true}
            />
          </AuthField>
          <AuthNotice error={error} />
          <button
            type="submit"
            disabled={loading}
            className={ekarajPrimaryButtonClass}
            aria-busy={loading}
          >
            {loading && (
              <span
                aria-hidden="true"
                className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-[#122E52]/25 border-t-[#122E52] motion-reduce:animate-none"
              />
            )}{" "}
            {loading ? "Sending OTP..." : "Continue"}
          </button>
          <div className="relative pt-3 text-center">
            <span aria-hidden="true" className="pointer-events-none absolute left-1/2 top-0 h-px w-10 -translate-x-1/2 bg-[#CDD5DF]" />
            <p className="mb-1 text-xs leading-4 text-[#59697D]">Remember your password?</p>
            <button
              type="button"
              onClick={() => navigate("/login")}
              disabled={loading}
              className={ekarajLinkButtonClass}
            >
              {" "}
               Back to Login
            </button>
          </div>
        </form>
              <div className="mt-3 flex items-start gap-3 rounded-xl border border-[#C6D5E3] bg-[#EAF2FA] p-2.5">
                <ShieldCheck aria-hidden="true" size={20} className="mt-0.5 shrink-0 text-[#113E65]" />
                <div>
                  <p className="text-xs font-semibold leading-4 text-[#1A365D]">Secure account recovery</p>
                  <p className="mt-0.5 text-xs leading-4 text-[#59697D]">Verification codes are sent only to the email address registered with your Ekaraj Bank account.</p>
                </div>
              </div>
      </EkarajAuthCard>
    </EkarajAuthLayout>
  );

}


export default ForgotPasswordPage;
