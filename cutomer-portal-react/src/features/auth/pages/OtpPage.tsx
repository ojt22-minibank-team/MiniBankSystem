import { useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  verifyOtp,
  resendOtp,
} from "../../../services/authService";

import {
  saveTokens
} from "../../../utils/tokenStorage";

import "./OtpPage.css";


function OtpPage() {
  const [otp, setOtp] = useState("");

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);

  const [completed, setCompleted] = useState(false);

  const navigate = useNavigate();

  const maskedEmail =
    sessionStorage.getItem("maskedEmail");


  // =========================================
  // VERIFY OTP
  // =========================================

  const handleVerifyOtp = async () => {
    setError("");
    setMessage("");

    const challengeGroupId =
      sessionStorage.getItem("challengeGroupId");

    if (!challengeGroupId) {
      setError(
        "Login session is missing. Please login again."
      );
      return;
    }

    if (!otp) {
      setError("Please enter OTP.");
      return;
    }

    if (!/^\d{6}$/.test(otp)) {
      setError(
        "OTP must be exactly 6 digits."
      );
      return;
    }

    try {
      setVerifying(true);

      const response = await verifyOtp({
        challengeGroupId,
        otp,
      });


      // =====================================
      // FIRST LOGIN
      // =====================================

      if (response.firstLoginSetupRequired) {

        if (response.passwordChangeRequired) {
          navigate(
            "/first-login/change-password"
          );
          return;
        }

        if (response.pinSetupRequired) {
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
        response.accessToken &&
        response.refreshToken
      ) {

        saveTokens(
          response.accessToken,
          response.refreshToken
        );

        sessionStorage.removeItem(
          "challengeGroupId"
        );

        sessionStorage.removeItem(
          "maskedEmail"
        );

        setCompleted(true);

        setMessage(
          "Login completed successfully."
        );

        navigate("/dashboard");

        return;
      }


      setError(
        "Login could not be completed."
      );

    } catch (error: any) {

      setError(
        error.response?.data?.message ||
        "OTP verification failed."
      );

    } finally {

      setVerifying(false);

    }
  };


  // =========================================
  // RESEND OTP
  // =========================================

  const handleResendOtp = async () => {
    setError("");
    setMessage("");

    const challengeGroupId =
      sessionStorage.getItem("challengeGroupId");

    if (!challengeGroupId) {
      setError(
        "Login session is missing. Please login again."
      );
      return;
    }

    try {
      setResending(true);

      const response = await resendOtp({
        challengeGroupId,
      });


      // Backend returns challengeGroupId
      if (response.challengeGroupId) {

        sessionStorage.setItem(
          "challengeGroupId",
          response.challengeGroupId
        );

      }


      setOtp("");


      setMessage(
        response.message ||
        "A new OTP has been sent to your registered email."
      );

    } catch (error: any) {

      setError(
        error.response?.data?.message ||
        "Unable to resend OTP."
      );

    } finally {

      setResending(false);

    }
  };


  return (
    <div className="otp-page">

      <div className="otp-card">

        {/* LEFT SIDE */}

        <div className="otp-brand-panel">

          <div className="otp-brand-content">

            <h1>
              MiniBank
            </h1>

            <h3>
              Secure Verification
            </h3>

            <p>
              Protecting your account,
              every step of the way.
            </p>

          </div>


          <div className="otp-security-box">

            <div className="shield-icon">
              ✓
            </div>

            <h2>
              Two-Step Security
            </h2>

            <p>
              Never share your OTP
              with anyone.
            </p>

          </div>

        </div>


        {/* RIGHT SIDE */}

        <div className="otp-form-panel">

          <div className="otp-form-wrapper">

            <div className="otp-icon">
              ✉
            </div>

            <h2>
              Verify OTP
            </h2>

            <p className="otp-subtitle">
              Enter the 6-digit verification code
              sent to your registered email.
            </p>


            {maskedEmail && (
              <p className="masked-email">
                {maskedEmail}
              </p>
            )}


            <input
              className="otp-input"
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              disabled={completed}
              onChange={(e) =>
                setOtp(
                  e.target.value.replace(
                    /\D/g,
                    ""
                  )
                )
              }
              placeholder="000000"
            />


            {error && (
              <div className="otp-error">
                {error}
              </div>
            )}


            {message && (
              <div className="otp-success">
                {message}
              </div>
            )}


            <button
              className="verify-otp-button"
              onClick={handleVerifyOtp}
              disabled={
                verifying ||
                resending ||
                completed
              }
            >
              {verifying
                ? "Verifying..."
                : "Verify OTP"}
            </button>


            {!completed && (
              <div className="resend-section">

                <span>
                  Didn't receive the code?
                </span>

                <button
                  type="button"
                  className="resend-button"
                  onClick={handleResendOtp}
                  disabled={
                    verifying ||
                    resending
                  }
                >
                  {resending
                    ? "Sending..."
                    : "Resend OTP"}
                </button>

              </div>
            )}

          </div>

        </div>

      </div>

    </div>
  );
}


export default OtpPage;