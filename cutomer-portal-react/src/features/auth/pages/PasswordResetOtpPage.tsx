import {
  useState,
  type FormEvent,
} from "react";

import { useNavigate } from "react-router-dom";

import {
  verifyPasswordResetOtp,
  resendPasswordResetOtp,
} from "../../../services/authService";

import "./PasswordResetOtpPage.css";


function PasswordResetOtpPage() {

  // ======================================================
  // STATE
  // ======================================================

  const [otp, setOtp] =
    useState("");

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [resending, setResending] =
    useState(false);


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

    if (!challengeGroupId) {

      setError(
        "Password reset session is missing. Please start again."
      );

      return;
    }


    // ====================================================
    // 2. OTP MUST BE EXACTLY 6 DIGITS
    // ====================================================

    if (!/^\d{6}$/.test(otp)) {

      setError(
        "Please enter a valid 6-digit OTP."
      );

      return;
    }


    try {

      setLoading(true);


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

      if (!response.challengeGroupId) {

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
        "/password-reset/new-password"
      );


    } catch (error: any) {

      setError(
        error.response?.data?.message ||
        "OTP verification failed. Please try again."
      );


    } finally {

      setLoading(false);

    }

  };


  // ======================================================
  // RESEND PASSWORD RESET OTP
  // ======================================================

  const handleResendOtp = async () => {

    setError("");
    setMessage("");


    // ====================================================
    // 1. CHALLENGE GROUP ID CHECK
    // ====================================================

    if (!challengeGroupId) {

      setError(
        "Password reset session is missing. Please start again."
      );

      return;
    }


    try {

      setResending(true);


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

      if (response.challengeGroupId) {

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
        response.message ||
        "A new OTP has been sent to your registered email."
      );


    } catch (error: any) {

      setError(
        error.response?.data?.message ||
        "Unable to resend OTP. Please try again."
      );


    } finally {

      setResending(false);

    }

  };


  // ======================================================
  // BACK TO FORGOT PASSWORD
  // ======================================================

  const handleBack = () => {

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

  return (

    <div className="password-reset-otp-page">

      <div className="password-reset-otp-card">


        {/* ==========================================
            TITLE
        ========================================== */}

        <h2>
          Verify OTP
        </h2>


        {/* ==========================================
            DESCRIPTION
        ========================================== */}

        <p className="otp-description">

          Enter the 6-digit verification code
          sent to your registered email.

        </p>


        {/* ==========================================
            MASKED EMAIL
        ========================================== */}

        {maskedEmail && (

          <p className="masked-email">

            {maskedEmail}

          </p>

        )}


        {/* ==========================================
            OTP FORM
        ========================================== */}

        <form
          onSubmit={handleVerifyOtp}
        >


          {/* OTP INPUT */}

          <div className="form-group">

            <label>
              OTP Code
            </label>


            <input
              type="text"

              inputMode="numeric"

              maxLength={6}

              value={otp}

              placeholder="Enter 6-digit OTP"

              onChange={(e) => {

                const value =
                  e.target.value.replace(
                    /\D/g,
                    ""
                  );

                setOtp(value);

              }}

              disabled={
                loading ||
                resending
              }
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
              SUCCESS MESSAGE
          ========================================== */}

          {message && (

            <div className="success-message">

              {message}

            </div>

          )}


          {/* ==========================================
              VERIFY OTP BUTTON
          ========================================== */}

          <button
            type="submit"

            className="verify-button"

            disabled={
              loading ||
              resending
            }
          >

            {
              loading
                ? "Verifying..."
                : "Verify OTP"
            }

          </button>


          {/* ==========================================
              RESEND OTP BUTTON
          ========================================== */}

          <button
            type="button"

            className="resend-button"

            onClick={
              handleResendOtp
            }

            disabled={
              loading ||
              resending
            }
          >

            {
              resending
                ? "Sending..."
                : "Resend OTP"
            }

          </button>


          {/* ==========================================
              BACK BUTTON
          ========================================== */}

          <button
            type="button"

            className="back-button"

            onClick={
              handleBack
            }

            disabled={
              loading ||
              resending
            }
          >

            Back

          </button>


        </form>

      </div>

    </div>

  );

}


export default PasswordResetOtpPage;