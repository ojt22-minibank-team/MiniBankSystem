import {
  useState,
  type FormEvent,
} from "react";

import { Eye, EyeOff } from "lucide-react";

import {
  useNavigate,
} from "react-router-dom";

import {
  confirmPinReset,
} from "../../../services/authService";


import { AuthRecoveryLayout, IndividualAuthCard, AuthHeading, AuthField, AuthCodeField, AuthNotice, AuthSecurityNote, AuthPinRules, AuthSuccess } from "../components/IndividualAuthUI";
import { authPrimaryButtonClass, authLinkButtonClass, authCodeInputClass, authCodeToggleClass } from "../components/IndividualAuthStyles";

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
        "/profile"
      );

    };


  // ======================================================
  // SUCCESS SCREEN
  // ======================================================

  if (
    completed
  ) {

    return (
      <AuthRecoveryLayout>
        <IndividualAuthCard variant="pin">
          <AuthSuccess title="Transaction PIN reset successful">
            <p>
              Your transaction PIN has been reset successfully. You can now use your new PIN for secure
              transactions.
            </p>
            <button
              type="button"
              onClick={() => navigate("/profile")}
              className={authPrimaryButtonClass}
            >
              Back to Profile
            </button>
            <AuthSecurityNote title="Keep your PIN private">
              Never share your transaction PIN with anyone, including bank staff.
            </AuthSecurityNote>
          </AuthSuccess>
        </IndividualAuthCard>
      </AuthRecoveryLayout>
    );

  }


  // ======================================================
  // MAIN UI
  // ======================================================

  return (
    <AuthRecoveryLayout>
      <IndividualAuthCard variant="pin">
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
            className={authPrimaryButtonClass}
            aria-busy={loading}
          >
            {loading && (
              <span
                aria-hidden="true"
                className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-white/30 border-t-white motion-reduce:animate-none"
              />
            )}{" "}
            {loading ? "Resetting PIN..." : "Reset Transaction PIN"}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            className={authLinkButtonClass}
          >
            {" "}
             Cancel and Back to Profile
          </button>
        </form>
        <AuthSecurityNote title="Keep your PIN private">
          Never share your transaction PIN with anyone, including bank staff.
        </AuthSecurityNote>
      </IndividualAuthCard>
    </AuthRecoveryLayout>
  );

}


export default PinResetNewPinPage;