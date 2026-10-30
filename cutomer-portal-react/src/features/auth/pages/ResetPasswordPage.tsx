import {
  useState,
  type FormEvent,
} from "react";

import {
  Navigate,
  useNavigate,
} from "react-router-dom";

import { Eye, EyeOff, KeyRound } from "lucide-react";

import {
  confirmPasswordReset,
} from "../../../services/authService";

import { AuthField, AuthNotice, AuthPasswordRules, AuthSuccess } from "../components/IndividualAuthUI";

import { EkarajAuthLayout } from "../components/EkarajAuthLayout";
import { EkarajAuthCard } from "../components/EkarajAuthCard";
import { ekarajPrimaryButtonClass, ekarajLinkButtonClass } from "../components/EkarajAuthStyles";


const resetPasswordInputClass =
  "block min-h-11 w-full rounded-xl border border-[#CDD5DF] bg-white py-2.5 pl-4 pr-12 text-sm text-[#111418] shadow-sm outline-none transition-colors placeholder:text-[#757575] hover:border-[#C6A15B] focus:border-[#113E65] focus:ring-2 focus:ring-[#113E65] disabled:cursor-not-allowed disabled:bg-[#E5EAF0] disabled:text-[#757575] motion-reduce:transition-none";
const resetPasswordToggleClass =
  "absolute inset-y-0 right-1 inline-flex w-11 items-center justify-center rounded-lg text-[#757575] transition-colors hover:text-[#122E52] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#113E65] disabled:opacity-50 motion-reduce:transition-none";

// Presentation overrides stay local; the shared rules and their live checks are unchanged.
const resetPasswordRulesClass =
  "rounded-xl border border-[#C6D5E3] bg-[#EAF2FA] [&>div]:border-0 [&>div]:bg-transparent [&>div]:p-2.5 [&>div>p]:mb-1.5 [&>div>p]:text-[#1A365D] [&_ul]:gap-y-0.5 [&_li]:text-xs [&_li.text-slate-500]:text-[#59697D]";
const resetPasswordSuccessClass =
  "[&_h1]:font-serif [&_h1]:font-medium [&_h1]:text-[#1A365D] [&>div>svg]:bg-[#EAF2FA] [&>div>svg]:text-[#113E65] [&>div>div]:space-y-3 [&>div>div]:text-[#59697D]";

function ResetPasswordPage() {

  // ======================================================
  // STATE
  // ======================================================

  const [
    newPassword,
    setNewPassword,
  ] = useState("");


  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");


  const [
    showNewPassword,
    setShowNewPassword,
  ] = useState(false);


  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);


  const [
    error,
    setError,
  ] = useState("");


  const [
    success,
    setSuccess,
  ] = useState("");


  const [
    loading,
    setLoading,
  ] = useState(false);


  const navigate =
    useNavigate();


  // ======================================================
  // GET VERIFIED CHALLENGE GROUP ID
  // ======================================================

  const verifiedChallengeGroupId =
    sessionStorage.getItem(
      "verifiedPasswordResetChallengeGroupId"
    );


  // ======================================================
  // PASSWORD VALIDATION
  // ======================================================

  const isValidPassword = (
    password: string
  ) => {

    // Minimum 8, Maximum 10

    if (
      password.length < 8
      ||
      password.length > 10
    ) {

      return false;

    }


    // At least one uppercase letter

    if (
      !/[A-Z]/.test(
        password
      )
    ) {

      return false;

    }


    // At least one lowercase letter

    if (
      !/[a-z]/.test(
        password
      )
    ) {

      return false;

    }


    // At least one number

    if (
      !/[0-9]/.test(
        password
      )
    ) {

      return false;

    }


    // At least one special character

    if (
      !/[^A-Za-z0-9]/.test(
        password
      )
    ) {

      return false;

    }


    // No whitespace

    if (
      /\s/.test(
        password
      )
    ) {

      return false;

    }


    return true;

  };


  // ======================================================
  // RESET PASSWORD
  // ======================================================

  const handleResetPassword =
    async (
      e: FormEvent
    ) => {

      e.preventDefault();


      setError("");

      setSuccess("");


      // ====================================================
      // 1. VERIFIED CHALLENGE ID CHECK
      // ====================================================

      if (
        !verifiedChallengeGroupId
        ||
        verifiedChallengeGroupId === "undefined"
        ||
        verifiedChallengeGroupId === "null"
      ) {

        setError(
          "Password reset authorization is missing. Please start again."
        );

        return;

      }


      // Temporary development log

      console.log(
        "verifiedChallengeGroupId sent to backend:",
        verifiedChallengeGroupId
      );


      // ====================================================
      // 2. EMPTY FIELD CHECK
      // ====================================================

      if (
        !newPassword
        ||
        !confirmPassword
      ) {

        setError(
          "Please enter new password and confirm password."
        );

        return;

      }


      // ====================================================
      // 3. PASSWORDS MUST MATCH
      // ====================================================

      if (
        newPassword !==
        confirmPassword
      ) {

        setError(
          "New password and confirm password do not match."
        );

        return;

      }


      // ====================================================
      // 4. PASSWORD POLICY CHECK
      // ====================================================

      if (
        !isValidPassword(
          newPassword
        )
      ) {

        setError(
          "Password must be between 8 and 10 characters and include at least one uppercase letter, one lowercase letter, one number, and one special character. Whitespace is not allowed."
        );

        return;

      }


      try {

        setLoading(
          true
        );


        // ==================================================
        // 5. CALL PASSWORD RESET API
        // ==================================================

        const response =
          await confirmPasswordReset({

            verifiedChallengeGroupId:
              verifiedChallengeGroupId,

            newPassword:
              newPassword,

            confirmPassword:
              confirmPassword,

          });


        // ==================================================
        // 6. CLEAR RESET SESSION DATA
        // ==================================================

        sessionStorage.removeItem(
          "verifiedPasswordResetChallengeGroupId"
        );


        sessionStorage.removeItem(
          "passwordResetChallengeGroupId"
        );


        sessionStorage.removeItem(
          "passwordResetMaskedEmail"
        );


        // ==================================================
        // 7. CLEAR PASSWORD INPUTS
        // ==================================================

        setNewPassword("");

        setConfirmPassword("");


        // ==================================================
        // 8. SUCCESS MESSAGE
        // ==================================================

        setSuccess(

          response
          ||
          "Password reset successfully."

        );


      } catch (
        error: any
      ) {

        setError(

          error.response?.data?.message
          ||
          "Unable to reset password. Please try again."

        );


      } finally {

        setLoading(
          false
        );

      }

    };


  // ======================================================
  // CANCEL RESET
  // ======================================================

  const handleCancel =
    () => {

      sessionStorage.removeItem(
        "verifiedPasswordResetChallengeGroupId"
      );


      sessionStorage.removeItem(
        "passwordResetChallengeGroupId"
      );


      sessionStorage.removeItem(
        "passwordResetMaskedEmail"
      );


      navigate(
        "/forgot-password"
      );

    };


  // ======================================================
  // UI
  // ======================================================

  // A completed reset clears its authorization before showing the success screen.
  if (
    !success &&
    (!verifiedChallengeGroupId ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(verifiedChallengeGroupId))
  ) {
    return <Navigate to="/forgot-password" replace />;
  }

  return (
    <EkarajAuthLayout title="EKARAJ BANK | Create New Password">
      <EkarajAuthCard
        ariaLabel="Individual password reset card"
        formLabel="Create a new password"
        variant="password"
        leftHeading={<>Create a New Password.<br />Secure Your Account.</>}
      >
        {success ? (
          <div className={resetPasswordSuccessClass}>
          <AuthSuccess title="Password reset successful">
            <p role="status">{success}</p>
            <p>You can now sign in to your Ekaraj Bank account using your new password.</p>
            <button
              type="button"
              onClick={() => navigate("/login", { replace: true })}
              className={ekarajPrimaryButtonClass}
            >
              Back to Login
            </button>
          </AuthSuccess>
          </div>
        ) : (
          <>
            <div className="mb-1.5 text-center">
              <span aria-hidden="true" className="mx-auto mb-1 flex h-9 w-9 items-center justify-center rounded-full border border-[#C6D5E3] bg-[#EAF2FA] text-[#113E65]">
                <KeyRound size={20} strokeWidth={1.8} />
              </span>
              <h1 className="font-serif text-2xl font-medium leading-8 tracking-tight text-[#1A365D]">Create New Password</h1>
              <p className="mt-0.5 text-sm leading-5 text-[#59697D]">Choose a new password to restore secure access to your account.</p>
            </div>
            <form onSubmit={handleResetPassword} className="space-y-2 [&_label]:text-[#1A365D] [&>[role=alert]]:my-1 [&>[role=alert]]:py-1.5">
              <AuthField label="New password" htmlFor="individual-reset-password">
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  autoComplete="new-password"
                  maxLength={10}
                  disabled={loading}
                  id="individual-reset-password"
                  className={resetPasswordInputClass}
                  aria-invalid={Boolean(error)}
                  aria-required={true}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((prev) => !prev)}
                  disabled={loading}
                  aria-label={showNewPassword ? "Hide password" : "Show password"}
                  className={resetPasswordToggleClass}
                >
                  {" "}
                  {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}{" "}
                </button>
              </AuthField>
              <AuthField label="Confirm password" htmlFor="individual-reset-confirm-password">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                  maxLength={10}
                  disabled={loading}
                  id="individual-reset-confirm-password"
                  className={resetPasswordInputClass}
                  aria-invalid={Boolean(error)}
                  aria-required={true}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  disabled={loading}
                  aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                  className={resetPasswordToggleClass}
                >
                  {" "}
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}{" "}
                </button>
              </AuthField>
              <div className={resetPasswordRulesClass}>
                <AuthPasswordRules password={newPassword} confirmPassword={confirmPassword} reset />
              </div>
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
                {loading ? "Resetting Password..." : "Reset Password"}
              </button>
              <div className="text-center">
              <button
                type="button"
                onClick={handleCancel}
                disabled={loading}
                className={ekarajLinkButtonClass}
              >
                {" "}
                 Cancel Password Reset
              </button>
              </div>
            </form>
          </>
        )}
      </EkarajAuthCard>
    </EkarajAuthLayout>
  );

}


export default ResetPasswordPage;
