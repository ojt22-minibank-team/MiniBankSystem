import {
  useState,
  type FormEvent,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import { Check, Clock3, Eye, EyeOff, LockKeyhole, ShieldCheck, WalletCards } from "lucide-react";

import {
  changeFirstLoginPassword,
} from "../../../services/authService";

import { AuthField, AuthNotice, AuthPasswordRules } from "../components/IndividualAuthUI";
import { EkarajAuthLayout } from "../components/EkarajAuthLayout";
import { ekarajPrimaryButtonClass } from "../components/EkarajAuthStyles";
import { IndividualSetupExpiredCard } from "../components/IndividualSetupExpiredCard";
import { useIndividualSetupWindow } from "../utils/individualSetupWindow";

const changePasswordInputClass =
  "block min-h-11 w-full rounded-xl border border-[#CDD5DF] bg-white py-2.5 pl-11 pr-12 text-sm text-[#111418] shadow-sm outline-none transition-colors placeholder:text-[#757575] hover:border-[#C6A15B] focus:border-[#113E65] focus:ring-4 focus:ring-[#113E65]/15 disabled:cursor-not-allowed disabled:bg-[#E5EAF0] disabled:text-[#757575] motion-reduce:transition-none";
const changePasswordToggleClass =
  "absolute inset-y-0 right-1 inline-flex w-11 items-center justify-center rounded-lg text-[#757575] transition-colors hover:text-[#122E52] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#113E65] disabled:opacity-50 motion-reduce:transition-none";

// Only presentation is overridden; the shared checklist keeps its original live rules.
const changePasswordRulesClass =
  "rounded-xl border border-[#C6D5E3] bg-[#EAF2FA] [&>div]:border-0 [&>div]:bg-transparent [&>div]:p-2.5 [&>div>p]:mb-1.5 [&>div>p]:text-[#1A365D] [&_li.text-slate-500]:text-[#59697D]";

function ChangePasswordPage() {
  const setupWindow = useIndividualSetupWindow();

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
    loading,
    setLoading,
  ] = useState(false);


  const navigate =
    useNavigate();


  // ======================================================
  // CHANGE FIRST LOGIN PASSWORD
  // ======================================================

  const handleChangePassword = async (
    e: FormEvent
  ) => {

    e.preventDefault();

    setError("");


    // =====================================
    // VALIDATION
    // =====================================

    if (
      !newPassword
      ||
      !confirmPassword
    ) {

      setError(
        "Please fill in all password fields."
      );

      return;

    }


    if (
      newPassword.length < 8
    ) {

      setError(
        "Password must be at least 8 characters."
      );

      return;

    }


    if (
      !/[A-Z]/.test(
        newPassword
      )
    ) {

      setError(
        "Password must contain at least one uppercase letter."
      );

      return;

    }


    if (
      !/[a-z]/.test(
        newPassword
      )
    ) {

      setError(
        "Password must contain at least one lowercase letter."
      );

      return;

    }


    if (
      !/[0-9]/.test(
        newPassword
      )
    ) {

      setError(
        "Password must contain at least one number."
      );

      return;

    }


    if (
      !/[!@#$%^&*(),.?":{}|<>]/.test(
        newPassword
      )
    ) {

      setError(
        "Password must contain at least one special character."
      );

      return;

    }


    if (
      newPassword !==
      confirmPassword
    ) {

      setError(
        "Passwords do not match."
      );

      return;

    }


    // =====================================
    // CHALLENGE ID
    // =====================================

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


    // =====================================
    // API CALL
    // =====================================

    const setupRequest = setupWindow.capture(challengeGroupId);
    if (!setupRequest) return;

    try {

      setLoading(
        true
      );


      await changeFirstLoginPassword({

        challengeGroupId:
          challengeGroupId,

        newPassword:
          newPassword,

        confirmPassword:
          confirmPassword,

      });


      if (!setupWindow.canProceed(setupRequest)) return;

      // Password change success
      // challengeGroupId ကို မဖျက်သေးပါ
      // Setup PIN မှာ ပြန်သုံးရမယ်

      navigate(
        "/first-login/setup-pin"
      );


    } catch (
      error: any
    ) {

      if (!setupWindow.canProceed(setupRequest) || setupWindow.handleExpiry(error, setupRequest)) return;

      setError(

        error.response?.data?.message
        ||
        "Unable to change password."

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

  if (setupWindow.expired) return <IndividualSetupExpiredCard />;

  return (
    <EkarajAuthLayout title="EKARAJ BANK | First Login — Change Password">
      <section aria-label="First login change password card" className="grid w-full max-w-[976px] rounded-3xl border border-[#CDC0A8] bg-[#F5F3EF] shadow-[0_18px_50px_-26px_rgba(18,46,82,0.3)] md:grid-cols-[0.92fr_1.08fr]">
        <aside className="relative hidden flex-col justify-between overflow-hidden rounded-l-[23px] bg-[#E5EAF0] text-[#1A365D] md:flex">
          <img src="/assets/ekaraj-building-reference.jpg" alt="" aria-hidden="true" className="pointer-events-none absolute bottom-0 right-0 h-[85%] w-[85%] object-cover object-[60%_70%] opacity-[0.1] [mask-image:radial-gradient(ellipse_at_75%_65%,#000_10%,transparent_80%)]" />
          <svg aria-hidden="true" focusable="false" viewBox="0 0 450 470" preserveAspectRatio="none" fill="none" className="pointer-events-none absolute inset-0 h-full w-full">
            <path d="M-70 85C95 35 120 300 330 285S500 215 520 150" stroke="#C6A15B" strokeWidth="0.8" strokeOpacity="0.35" />
            <path d="M-80 105C80 55 135 325 340 305S510 235 530 175" stroke="#C6A15B" strokeWidth="0.8" strokeOpacity="0.2" />
          </svg>
          <div className="relative px-6 pt-4 lg:px-7">
            <h2 className="font-serif text-2xl font-medium leading-8 tracking-tight">Your Security<br />Starts Here.</h2>
            <p className="mt-2 text-sm leading-5 text-[#59697D]">A strong password helps protect your account and keeps your banking services safe and secure.</p>
          </div>
          <div aria-hidden="true" className="relative flex min-h-0 flex-1 items-center justify-center px-6 py-2">
            <img src="/assets/ekaraj-crown-transparent.png" alt="" width={375} height={340} className="h-auto w-40 max-w-full object-contain" />
          </div>
          <div className="relative space-y-2.5 px-6 pb-4 pt-2 lg:px-7">
            {[
              { icon: ShieldCheck, title: "Secure Verification", description: "Your safety is our priority" },
              { icon: WalletCards, title: "Safe Transactions", description: "Bank with confidence" },
              { icon: Clock3, title: "Your Trusted Banking Partner", description: "Always by your side" },
            ].map(({ icon: Icon, title, description }) => (
              <div key={title} className="flex items-start gap-3">
                <Icon aria-hidden="true" size={20} className="mt-0.5 shrink-0 text-[#C6A15B]" />
                <div>
                  <p className="text-xs font-semibold leading-4">{title}</p>
                  <p className="mt-0.5 text-[11px] leading-4 text-[#627084]">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </aside>
        <section aria-label="First login password setup" className="flex min-w-0 items-center px-5 py-3 sm:px-8 md:px-7 lg:px-9">
          <div className="mx-auto w-full max-w-[392px]">
            <ol aria-label="Account security setup" className="mb-2 grid grid-cols-3">
              {["OTP Verification", "Change Password", "Set PIN"].map((label, index) => (
                <li key={label} aria-current={index === 1 ? "step" : undefined} className="relative text-center">
                  {index < 2 && <span aria-hidden="true" className="absolute left-1/2 top-3.5 h-px w-full bg-[#C6D5E3]" />}
                  <span className={`relative mx-auto flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${index === 1 ? "bg-[#113E65] text-white" : index === 0 ? "bg-[#EAF2FA] text-[#113E65] ring-1 ring-inset ring-[#C6D5E3]" : "bg-[#E5EAF0] text-[#59697D]"}`}>
                    {index === 0 ? <Check aria-hidden="true" size={14} /> : index + 1}
                  </span>
                  <span className={`relative mt-1 block text-[10px] leading-4 sm:text-[11px] ${index === 1 ? "font-semibold text-[#1A365D]" : "text-[#59697D]"}`}>
                    {label}{index === 0 && <span className="sr-only"> — Completed</span>}{index === 2 && <span className="sr-only"> — Upcoming</span>}
                  </span>
                </li>
              ))}
            </ol>
            <div className="mb-2 text-center">
              <span aria-hidden="true" className="mx-auto mb-1 flex h-9 w-9 items-center justify-center rounded-full border border-[#C6D5E3] bg-[#EAF2FA] text-[#113E65]">
                <LockKeyhole size={20} strokeWidth={1.8} />
              </span>
              <h1 className="font-serif text-2xl font-medium leading-8 tracking-tight text-[#1A365D]">Create a New Password</h1>
              <p className="mt-0.5 text-sm leading-5 text-[#59697D]">Choose a strong password to secure your Ekaraj Bank account.</p>
            </div>
            <form onSubmit={handleChangePassword} className="space-y-2 [&_label]:text-[#1A365D] [&>[role=alert]]:my-1 [&>[role=alert]]:py-1.5">
              <AuthField label="New Password" htmlFor="individual-new-password">
                <LockKeyhole aria-hidden="true" size={18} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-[#757575]" />
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  autoComplete="new-password"
                  disabled={loading}
                  id="individual-new-password"
                  className={changePasswordInputClass}
                  aria-invalid={Boolean(error)}
                  aria-required={true}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((prev) => !prev)}
                  disabled={loading}
                  aria-label={showNewPassword ? "Hide new password" : "Show new password"}
                  className={changePasswordToggleClass}
                >
                  {" "}
                  {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}{" "}
                </button>
              </AuthField>
              <AuthField label="Confirm New Password" htmlFor="individual-confirm-password">
                <LockKeyhole aria-hidden="true" size={18} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-[#757575]" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                  disabled={loading}
                  id="individual-confirm-password"
                  className={changePasswordInputClass}
                  aria-invalid={Boolean(error)}
                  aria-required={true}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  disabled={loading}
                  aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                  className={changePasswordToggleClass}
                >
                  {" "}
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}{" "}
                </button>
              </AuthField>
              <div className={changePasswordRulesClass}>
                <AuthPasswordRules password={newPassword} confirmPassword={confirmPassword} />
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
                {loading ? (
                  "Changing Password..."
                ) : (
                  <>
                    Continue to PIN Setup
                  </>
                )}{" "}
              </button>
            </form>
          </div>
        </section>
      </section>
    </EkarajAuthLayout>
  );

}


export default ChangePasswordPage;
