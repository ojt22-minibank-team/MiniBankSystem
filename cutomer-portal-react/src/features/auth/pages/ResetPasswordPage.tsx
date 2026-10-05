import {
  useState,
  type FormEvent,
} from "react";

import { useNavigate } from "react-router-dom";

import {
  confirmPasswordReset,
} from "../../../services/authService";

import "./ResetPasswordPage.css";


function ResetPasswordPage() {

  // ======================================================
  // STATE
  // ======================================================

  const [newPassword, setNewPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [showNewPassword, setShowNewPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [loading, setLoading] =
    useState(false);


  const navigate = useNavigate();


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
      password.length < 8 ||
      password.length > 10
    ) {
      return false;
    }


    // At least one uppercase letter
    if (!/[A-Z]/.test(password)) {
      return false;
    }


    // At least one lowercase letter
    if (!/[a-z]/.test(password)) {
      return false;
    }


    // At least one number
    if (!/[0-9]/.test(password)) {
      return false;
    }


    // At least one special character
    if (
      !/[^A-Za-z0-9]/.test(password)
    ) {
      return false;
    }


    // No whitespace
    if (/\s/.test(password)) {
      return false;
    }


    return true;
  };


  // ======================================================
  // RESET PASSWORD
  // ======================================================

  const handleResetPassword = async (
    e: FormEvent
  ) => {

    e.preventDefault();

    setError("");
    setSuccess("");


    // ====================================================
    // 1. VERIFIED CHALLENGE ID CHECK
    // ====================================================

    if (
      !verifiedChallengeGroupId ||
      verifiedChallengeGroupId === "undefined" ||
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
      !newPassword ||
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
      newPassword !== confirmPassword
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
      !isValidPassword(newPassword)
    ) {

      setError(
        "Password must be between 8 and 10 characters and include at least one uppercase letter, one lowercase letter, one number, and one special character. Whitespace is not allowed."
      );

      return;
    }


    try {

      setLoading(true);


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
        response ||
        "Password reset successfully."
      );


    } catch (error: any) {

      setError(
        error.response?.data?.message ||
        "Unable to reset password. Please try again."
      );


    } finally {

      setLoading(false);

    }

  };


  // ======================================================
  // CANCEL RESET
  // ======================================================

  const handleCancel = () => {

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

  return (

    <div className="reset-password-page">

      <div className="reset-password-card">


        {/* ==========================================
            TITLE
        ========================================== */}

        <h2>
          Reset Password
        </h2>


        <p className="reset-password-description">
          Create a new password for your account.
        </p>


        {/* ==========================================
            SUCCESS SCREEN
        ========================================== */}

        {success ? (

          <div className="reset-success-section">

            <div className="success-message">

              {success}

            </div>


            <p>
              You can now login with your new password.
            </p>


            <button
              type="button"
              className="login-button"

              onClick={() =>
                navigate("/login")
              }
            >

              Back to Login

            </button>

          </div>

        ) : (

          <form
            onSubmit={
              handleResetPassword
            }
          >


            {/* ======================================
                NEW PASSWORD
            ====================================== */}

            <div className="form-group">

              <label>
                New Password
              </label>


              <div className="password-input-wrapper">

                <input
                  type={
                    showNewPassword
                      ? "text"
                      : "password"
                  }

                  value={
                    newPassword
                  }

                  onChange={(e) =>
                    setNewPassword(
                      e.target.value
                    )
                  }

                  placeholder="Enter new password"

                  autoComplete="new-password"

                  maxLength={10}

                  disabled={
                    loading
                  }
                />


                <button
                  type="button"
                  className="password-toggle"

                  onClick={() =>
                    setShowNewPassword(
                      (prev) => !prev
                    )
                  }

                  disabled={
                    loading
                  }

                  aria-label={
                    showNewPassword
                      ? "Hide password"
                      : "Show password"
                  }
                >

                  {
                    showNewPassword
                      ? "Hide"
                      : "Show"
                  }

                </button>

              </div>

            </div>


            {/* ======================================
                CONFIRM PASSWORD
            ====================================== */}

            <div className="form-group">

              <label>
                Confirm Password
              </label>


              <div className="password-input-wrapper">

                <input
                  type={
                    showConfirmPassword
                      ? "text"
                      : "password"
                  }

                  value={
                    confirmPassword
                  }

                  onChange={(e) =>
                    setConfirmPassword(
                      e.target.value
                    )
                  }

                  placeholder="Confirm new password"

                  autoComplete="new-password"

                  maxLength={10}

                  disabled={
                    loading
                  }
                />


                <button
                  type="button"
                  className="password-toggle"

                  onClick={() =>
                    setShowConfirmPassword(
                      (prev) => !prev
                    )
                  }

                  disabled={
                    loading
                  }

                  aria-label={
                    showConfirmPassword
                      ? "Hide confirm password"
                      : "Show confirm password"
                  }
                >

                  {
                    showConfirmPassword
                      ? "Hide"
                      : "Show"
                  }

                </button>

              </div>

            </div>


            {/* ======================================
                PASSWORD RULES
            ====================================== */}

            <div className="password-rule">

              Password must:

              <ul>

                <li>
                  Be 8 to 10 characters
                </li>

                <li>
                  Include at least one uppercase letter
                </li>

                <li>
                  Include at least one lowercase letter
                </li>

                <li>
                  Include at least one number
                </li>

                <li>
                  Include at least one special character
                </li>

                <li>
                  Not contain whitespace
                </li>

              </ul>

            </div>


            {/* ======================================
                ERROR MESSAGE
            ====================================== */}

            {error && (

              <div className="error-message">

                {error}

              </div>

            )}


            {/* ======================================
                RESET BUTTON
            ====================================== */}

            <button
              type="submit"
              className="reset-password-button"

              disabled={
                loading
              }
            >

              {
                loading
                  ? "Resetting Password..."
                  : "Reset Password"
              }

            </button>


            {/* ======================================
                CANCEL BUTTON
            ====================================== */}

            <button
              type="button"
              className="cancel-button"

              onClick={
                handleCancel
              }

              disabled={
                loading
              }
            >

              Cancel

            </button>

          </form>

        )}

      </div>

    </div>

  );

}


export default ResetPasswordPage;