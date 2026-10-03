import {
  useState,
  type FormEvent,
} from "react";

import { useNavigate } from "react-router-dom";

import {
  requestPasswordReset,
} from "../../../services/authService";

import "./ForgotPasswordPage.css";


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

    if (!loginIdentifier.trim()) {

      setError(
        "Please enter your Customer ID or Account Number."
      );

      return;
    }


    try {

      setLoading(true);


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

      if (response.destinationMasked) {

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


    } catch (error: any) {

      setError(
        error.response?.data?.message ||
        "Unable to request password reset. Please try again."
      );


    } finally {

      setLoading(false);

    }

  };


  // ======================================================
  // UI
  // ======================================================

  return (

    <div className="forgot-password-page">

      <div className="forgot-password-card">

        <div className="forgot-password-header">

          <h2>
            Forgot Password
          </h2>

          <p>
            Enter your Customer ID or Account Number.
            We will send a verification OTP to your
            registered email.
          </p>

        </div>


        <form
          onSubmit={handleSubmit}
          className="forgot-password-form"
        >

          {/* ==========================================
              CUSTOMER ID / ACCOUNT NUMBER
          ========================================== */}

          <div className="form-group">

            <label>
              Customer ID or Account Number
            </label>

            <input
              type="text"
              value={loginIdentifier}
              onChange={(e) =>
                setLoginIdentifier(
                  e.target.value
                )
              }
              placeholder="Enter your ID or account number"
              autoComplete="username"
              disabled={loading}
            />

          </div>


          {/* ==========================================
              ERROR MESSAGE
          ========================================== */}

          {error && (

            <div className="error-message">

              {error}

            </div>

          )}


          {/* ==========================================
              CONTINUE BUTTON
          ========================================== */}

          <button
            type="submit"
            className="continue-button"
            disabled={loading}
          >

            {
              loading
                ? "Sending OTP..."
                : "Continue"
            }

          </button>


          {/* ==========================================
              BACK TO LOGIN
          ========================================== */}

          <button
            type="button"
            className="back-login-button"
            onClick={() =>
              navigate("/login")
            }
            disabled={loading}
          >

            Back to Login

          </button>

        </form>

      </div>

    </div>

  );

}


export default ForgotPasswordPage;