import {
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import { Eye, EyeOff } from "lucide-react";

import {
  useNavigate,
} from "react-router-dom";

import {
  confirmPinReset,
} from "../../../services/authService";


import { AuthHeading, AuthField, AuthCodeField, AuthNotice, AuthSecurityNote, AuthPinRules, AuthSuccess } from "../components/IndividualAuthUI";
import { authLinkButtonClass, authCodeInputClass, authCodeToggleClass } from "../components/IndividualAuthStyles";

function PinResetCard({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-[#F3F7FB] p-4 md:static md:z-auto md:overflow-visible md:bg-transparent md:p-0">
      <div className="mx-auto flex min-h-[calc(100dvh-2rem)] w-full items-center justify-center md:min-h-[calc(100dvh-8rem)] lg:min-h-[calc(100dvh-9rem)]">
        <section aria-label="Transaction PIN reset" className="w-full min-w-0 max-w-[520px] rounded-3xl border border-[#CDC0A8] bg-white p-5 shadow-[0_16px_48px_-24px_rgba(26,54,93,0.3)] sm:p-6 md:[@media(max-height:700px)]:p-4 md:[@media(max-height:700px)]:[&>div:first-child]:mb-1 md:[@media(max-height:700px)]:[&>div:first-child>span]:mb-0 md:[@media(max-height:700px)]:[&>div:last-child]:mt-2 md:[@media(max-height:700px)]:[&>div:last-child]:p-2">
          {children}
        </section>
      </div>
    </div>
  );
}

function PinResetNewPinPage() {

  const navigate =
    useNavigate();


  // ======================================================
  // STATE
  // ======================================================

  const [
    newPin,
    setNewPin,
  ] = useState("");


  const [
    confirmPin,
    setConfirmPin,
  ] = useState("");


  const [
    showNewPin,
    setShowNewPin,
  ] = useState(false);


  const [
    showConfirmPin,
    setShowConfirmPin,
  ] = useState(false);


  const [
    error,
    setError,
  ] = useState("");


  const [
    loading,
    setLoading,
  ] = useState(false);


  const [
    completed,
    setCompleted,
  ] = useState(false);


  // ======================================================
  // GET VERIFIED PIN RESET CHALLENGE
  // ======================================================

  const verifiedChallengeGroupId =
    sessionStorage.getItem(
      "verifiedPinResetChallengeGroupId"
    );


  // ======================================================
  // RESET PIN
  // ======================================================

  const handleResetPin = async (
    e: FormEvent
  ) => {

    e.preventDefault();


    setError("");


    // ----------------------------------------------
    // 1. VERIFIED CHALLENGE REQUIRED
    // ----------------------------------------------

    if (
      !verifiedChallengeGroupId
      ||
      verifiedChallengeGroupId === "undefined"
      ||
      verifiedChallengeGroupId === "null"
    ) {

      setError(
        "PIN reset authorization is missing. Please start again."
      );

      return;
    }


    // ----------------------------------------------
    // 2. REQUIRED FIELDS
    // ----------------------------------------------

    if (
      !newPin
      ||
      !confirmPin
    ) {

      setError(
        "Please enter the new PIN and confirm PIN."
      );

      return;
    }


    // ----------------------------------------------
    // 3. EXACTLY 6 DIGITS
    // ----------------------------------------------

    if (
      !/^\d{6}$/.test(
        newPin
      )
    ) {

      setError(
        "Transaction PIN must be exactly 6 digits."
      );

      return;
    }


    // ----------------------------------------------
    // 4. CONFIRM PIN MUST MATCH
    // ----------------------------------------------

    if (
      newPin !==
      confirmPin
    ) {

      setError(
        "New PIN and confirm PIN do not match."
      );

      return;
    }


    try {

      setLoading(
        true
      );


      // ----------------------------------------------
      // 5. CALL BACKEND
      // POST /auth/pin-reset/confirm
      // ----------------------------------------------

      await confirmPinReset({

        verifiedChallengeGroupId:
          verifiedChallengeGroupId,

        newPin:
          newPin,

        confirmPin:
          confirmPin,

      });


      // ----------------------------------------------
      // 6. CLEAR RESET DATA
      // ----------------------------------------------

      sessionStorage.removeItem(
        "verifiedPinResetChallengeGroupId"
      );


      sessionStorage.removeItem(
        "pinResetChallengeGroupId"
      );


      sessionStorage.removeItem(
        "pinResetMaskedEmail"
      );


      // ----------------------------------------------
      // 7. CLEAR FORM
      // ----------------------------------------------

      setNewPin("");

      setConfirmPin("");


      // ----------------------------------------------
      // 8. SHOW SUCCESS PAGE
      // ----------------------------------------------

      setCompleted(
        true
      );


    } catch (
      err: any
    ) {

      setError(

        err.response?.data?.message
        ||
        "Unable to reset Transaction PIN. Please try again."

      );


    } finally {

      setLoading(
        false
      );

    }

  };


  // ======================================================
  // CANCEL
  // ======================================================

  const handleCancel =
    () => {

      sessionStorage.removeItem(
        "verifiedPinResetChallengeGroupId"
      );


      sessionStorage.removeItem(
        "pinResetChallengeGroupId"
      );


      sessionStorage.removeItem(
        "pinResetMaskedEmail"
      );


      navigate(
        "/settings"
      );

    };


  // ======================================================
  // SUCCESS SCREEN
  // ======================================================

  if (
    completed
  ) {

    return (
      <PinResetCard>
        <AuthSuccess title="Transaction PIN reset successful">
          <p>
            Your transaction PIN has been reset successfully. You can now use your new PIN for secure
            transactions.
          </p>
          <button
            type="button"
            onClick={() => navigate("/settings")}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#56ABC0] px-5 py-2.5 text-sm font-semibold text-[#122E52] shadow-[0_6px_16px_-6px_rgba(37,99,235,0.55)] transition hover:bg-[#4DA0B5] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none"
          >
            Back to Settings
          </button>
          <AuthSecurityNote title="Keep your PIN private">
            Never share your transaction PIN with anyone, including bank staff.
          </AuthSecurityNote>
        </AuthSuccess>
      </PinResetCard>
    );

  }


  // ======================================================
  // MAIN UI
  // ======================================================

  return (
    <PinResetCard>
      <AuthHeading
        title="Create new transaction PIN"
        description={"Choose a new 6-digit PIN to keep your transactions secure."}
        variant="pin"
      />
      <form onSubmit={handleResetPin} className="space-y-3">
        <AuthField label="New PIN" htmlFor="individual-reset-pin">
          <div className="flex items-center gap-2">
            <AuthCodeField value={newPin} masked={!showNewPin}>
              <input
                type={showNewPin ? "text" : "password"}
                inputMode="numeric"
                autoComplete="new-password"
                maxLength={6}
                value={newPin}
                placeholder="Enter 6-digit PIN"
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "");

                  setNewPin(value);
                }}
                disabled={loading}
                id="individual-reset-pin"
                className={authCodeInputClass}
                aria-invalid={Boolean(error)}
                aria-required={true}
              />
            </AuthCodeField>
            <button
              type="button"
              onClick={() => setShowNewPin((prev) => !prev)}
              disabled={loading}
              aria-label={showNewPin ? "Hide PIN" : "Show PIN"}
              className={authCodeToggleClass}
            >
              {" "}
              {showNewPin ? <EyeOff size={20} /> : <Eye size={20} />}{" "}
            </button>
          </div>
        </AuthField>
        <AuthField label="Confirm PIN" htmlFor="individual-reset-confirm-pin">
          <div className="flex items-center gap-2">
            <AuthCodeField value={confirmPin} masked={!showConfirmPin}>
              <input
                type={showConfirmPin ? "text" : "password"}
                inputMode="numeric"
                autoComplete="new-password"
                maxLength={6}
                value={confirmPin}
                placeholder="Re-enter 6-digit PIN"
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "");

                  setConfirmPin(value);
                }}
                disabled={loading}
                id="individual-reset-confirm-pin"
                className={authCodeInputClass}
                aria-invalid={Boolean(error)}
                aria-required={true}
              />
            </AuthCodeField>
            <button
              type="button"
              onClick={() => setShowConfirmPin((prev) => !prev)}
              disabled={loading}
              aria-label={showConfirmPin ? "Hide confirm PIN" : "Show confirm PIN"}
              className={authCodeToggleClass}
            >
              {" "}
              {showConfirmPin ? <EyeOff size={20} /> : <Eye size={20} />}{" "}
            </button>
          </div>
        </AuthField>
        <AuthPinRules pin={newPin} confirmPin={confirmPin} />
        <AuthNotice error={error} />
        <button
          type="submit"
          disabled={loading}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#56ABC0] px-5 py-2.5 text-sm font-semibold text-[#122E52] shadow-[0_6px_16px_-6px_rgba(37,99,235,0.55)] transition hover:bg-[#4DA0B5] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#113E65] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none"
          aria-busy={loading}
        >
          {loading && (
            <span
              aria-hidden="true"
              className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-[#122E52]/30 border-t-[#122E52] motion-reduce:animate-none"
            />
          )}{" "}
          {loading ? "Resetting PIN..." : "Reset Transaction PIN"}
        </button>
        <div className="text-center">
          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            className={authLinkButtonClass}
          >
            {" "}
             Cancel and Back to Settings
          </button>
        </div>
      </form>
      <AuthSecurityNote title="Keep your PIN private">
        Never share your transaction PIN with anyone, including bank staff.
      </AuthSecurityNote>
    </PinResetCard>
  );

}


export default PinResetNewPinPage;
