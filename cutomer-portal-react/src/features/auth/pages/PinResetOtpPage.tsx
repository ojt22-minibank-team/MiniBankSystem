import {
  useState,
  type FormEvent,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  verifyPinResetOtp,
  resendPinResetOtp,
} from "../../../services/authService";

import "./PasswordResetOtpPage.css";


function PinResetOtpPage() {

  // ======================================================
  // NAVIGATION
  // ======================================================

  const navigate =
    useNavigate();


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


  const [
    challengeGroupId,
    setChallengeGroupId,
  ] = useState<string | null>(
    () =>
      sessionStorage.getItem(
        "pinResetChallengeGroupId"
      )
  );


  const [
    maskedEmail,
    setMaskedEmail,
  ] = useState<string | null>(
    () =>
      sessionStorage.getItem(
        "pinResetMaskedEmail"
      )
  );


  // ======================================================
  // VERIFY PIN RESET OTP
  // ======================================================

  const handleVerifyOtp = async (
    e: FormEvent
  ) => {

    e.preventDefault();


    setError("");
    setMessage("");


    // ----------------------------------------------
    // 1. Challenge must exist
    // ----------------------------------------------

    if (!challengeGroupId) {

      setError(
        "PIN reset session is missing. Please start again."
      );

      return;
    }


    // ----------------------------------------------
    // 2. OTP must be exactly 6 digits
    // ----------------------------------------------

    if (!/^\d{6}$/.test(otp)) {

      setError(
        "Please enter a valid 6-digit OTP."
      );

      return;
    }


    try {

      setLoading(true);


      // ----------------------------------------------
      // 3. Verify OTP
      // ----------------------------------------------

      const response =
        await verifyPinResetOtp({

          challengeGroupId:
            challengeGroupId,

          otp:
            otp,

        });


      // ----------------------------------------------
      // 4. Backend must return verified challenge
      // ----------------------------------------------

      if (
        !response.verifiedChallengeGroupId
      ) {

        setError(
          "PIN reset verification information is missing."
        );

        return;
      }


      // ----------------------------------------------
      // 5. Save VERIFIED challenge
      // ----------------------------------------------

      sessionStorage.setItem(
        "verifiedPinResetChallengeGroupId",
        response.verifiedChallengeGroupId
      );


      // ----------------------------------------------
      // 6. Old OTP challenge no longer needed
      // ----------------------------------------------

      sessionStorage.removeItem(
        "pinResetChallengeGroupId"
      );


      // ----------------------------------------------
      // 7. Go to new PIN page
      // ----------------------------------------------

      navigate(
        "/pin-reset/new-pin"
      );


    } catch (err: any) {

      setError(
        err.response?.data?.message
        ||
        "OTP verification failed. Please try again."
      );


    } finally {

      setLoading(
        false
      );

    }

  };


  // ======================================================
  // RESEND PIN RESET OTP
  // ======================================================

  const handleResendOtp =
    async () => {

      setError("");
      setMessage("");


      if (!challengeGroupId) {

        setError(
          "PIN reset session is missing. Please start again."
        );

        return;
      }


      try {

        setResending(
          true
        );


        const response =
          await resendPinResetOtp({

            challengeGroupId:
              challengeGroupId,

          });


        // ----------------------------------------------
        // Backend normally keeps same challengeGroupId
        // but update it if backend returns one
        // ----------------------------------------------

        if (
          response.challengeGroupId
        ) {

          setChallengeGroupId(
            response.challengeGroupId
          );


          sessionStorage.setItem(
            "pinResetChallengeGroupId",
            response.challengeGroupId
          );

        }


        // ----------------------------------------------
        // Update masked email if returned
        // ----------------------------------------------

        if (
          response.maskedEmail
        ) {

          setMaskedEmail(
            response.maskedEmail
          );


          sessionStorage.setItem(
            "pinResetMaskedEmail",
            response.maskedEmail
          );

        }


        // Old OTP input must be cleared
        setOtp("");


        setMessage(
          response.message
          ||
          "A new Transaction PIN reset OTP has been sent to your registered email."
        );


      } catch (err: any) {

        setError(
          err.response?.data?.message
          ||
          "Unable to resend OTP. Please try again."
        );


      } finally {

        setResending(
          false
        );

      }

    };


  // ======================================================
  // BACK TO PROFILE
  // ======================================================

  const handleBack =
    () => {

      sessionStorage.removeItem(
        "pinResetChallengeGroupId"
      );


      sessionStorage.removeItem(
        "pinResetMaskedEmail"
      );


      sessionStorage.removeItem(
        "verifiedPinResetChallengeGroupId"
      );


      navigate(
        "/profile"
      );

    };


  // ======================================================
  // UI
  // ======================================================

  return (

    <div className="password-reset-otp-page">

      <div className="password-reset-otp-card">


        <h2>
          Verify Transaction PIN Reset
        </h2>


        <p className="otp-description">

          Enter the 6-digit verification code
          sent to your registered email.

        </p>


        {maskedEmail && (

          <p className="masked-email">

            {maskedEmail}

          </p>

        )}


        <form
          onSubmit={handleVerifyOtp}
        >


          <div className="form-group">

            <label>
              OTP Code
            </label>


            <input

              type="text"

              inputMode="numeric"

              autoComplete="one-time-code"

              maxLength={6}

              value={otp}

              placeholder="Enter 6-digit OTP"

              onChange={(e) => {

                const value =
                  e.target.value
                    .replace(
                      /\D/g,
                      ""
                    );

                setOtp(
                  value
                );

              }}

              disabled={
                loading ||
                resending
              }

            />

          </div>


          {error && (

            <div className="error-message">

              {error}

            </div>

          )}


          {message && (

            <div className="success-message">

              {message}

            </div>

          )}


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

            Back to Profile

          </button>

        </form>

      </div>

    </div>

  );

}


export default PinResetOtpPage;