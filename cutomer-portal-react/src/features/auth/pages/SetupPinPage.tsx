import { useState } from "react";

import {
  setupTransactionPin
} from "../../../services/authService";

import {
  saveTokens
} from "../../../utils/tokenStorage";

import "./SetupPinPage.css";


function SetupPinPage() {

  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  const [showPin, setShowPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);


  const handleSetupPin = async (
    e: React.FormEvent
  ) => {

    e.preventDefault();

    setError("");
    setMessage("");


    // =====================================
    // VALIDATION
    // =====================================

    if (!pin || !confirmPin) {

      setError(
        "Please fill in all PIN fields."
      );

      return;
    }


    if (!/^\d{6}$/.test(pin)) {

      setError(
        "Transaction PIN must be exactly 6 digits."
      );

      return;
    }


    if (pin !== confirmPin) {

      setError(
        "PINs do not match."
      );

      return;
    }


    // =====================================
    // CHALLENGE GROUP ID
    // =====================================

    const challengeGroupId =
      sessionStorage.getItem(
        "challengeGroupId"
      );


    if (!challengeGroupId) {

      setError(
        "Login session is missing. Please login again."
      );

      return;
    }


    // =====================================
    // API CALL
    // =====================================

    try {

      setLoading(true);


      const response =
        await setupTransactionPin({

          challengeGroupId:
            challengeGroupId,

          pin:
            pin,

          confirmPin:
            confirmPin,

        });


      // =====================================
      // SAVE JWT TOKENS
      // =====================================

      if (
        response.accessToken &&
        response.refreshToken
      ) {

        saveTokens(
          response.accessToken,
          response.refreshToken
        );

      }


      // First-login flow finished
      sessionStorage.removeItem(
        "challengeGroupId"
      );

      sessionStorage.removeItem(
        "maskedEmail"
      );


      setCompleted(true);

      setMessage(
        response.message ||
        "First login security setup completed successfully."
      );


      // Clear PIN fields
      setPin("");
      setConfirmPin("");


    } catch (error: any) {

      setError(
        error.response?.data?.message ||
        "Transaction PIN setup failed."
      );


    } finally {

      setLoading(false);

    }
  };


  return (

    <div className="setup-pin-page">

      <div className="setup-pin-card">


        {/* ================= LEFT SIDE ================= */}

        <div className="setup-pin-brand-panel">

          <div className="setup-pin-brand-content">

            <h1>
              MiniBank
            </h1>

            <h3>
              Transaction Security
            </h3>

            <p>
              Set up your secure transaction PIN
              to protect your banking transactions.
            </p>

          </div>


          <div className="pin-security-box">

            <div className="pin-shield-icon">
              ✓
            </div>

            <h2>
              Secure PIN
            </h2>

            <p>
              Your transaction PIN must contain
              exactly 6 digits.
            </p>

            <p>
              Never share your PIN with anyone.
            </p>

          </div>

        </div>


        {/* ================= RIGHT SIDE ================= */}

        <div className="setup-pin-form-panel">

          <div className="setup-pin-form-wrapper">


            <h2>
              Setup Transaction PIN
            </h2>


            <p className="setup-pin-subtitle">

              Create your personal 6-digit PIN
              before continuing.

            </p>


            <form
              onSubmit={handleSetupPin}
            >


              {/* TRANSACTION PIN */}

              <div className="pin-form-group">

                <label>
                  Transaction PIN
                </label>


                <div className="pin-input-wrapper">

                  <input
                    type={
                      showPin
                        ? "text"
                        : "password"
                    }
                    inputMode="numeric"
                    maxLength={6}
                    value={pin}
                    disabled={completed}
                    onChange={(e) =>
                      setPin(
                        e.target.value.replace(
                          /\D/g,
                          ""
                        )
                      )
                    }
                    placeholder="Enter 6-digit PIN"
                  />


                  <button
                    type="button"
                    className="pin-toggle"
                    disabled={completed}
                    onClick={() =>
                      setShowPin(
                        (prev) => !prev
                      )
                    }
                    aria-label={
                      showPin
                        ? "Hide PIN"
                        : "Show PIN"
                    }
                  >

                    {showPin ? (

                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M3 3l18 18" />
                        <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                        <path d="M9.9 4.2A10.7 10.7 0 0 1 12 4c5 0 9 5 9 8a10.2 10.2 0 0 1-2.1 3.5" />
                        <path d="M6.6 6.6C4.4 8 3 10.2 3 12c0 3 4 8 9 8a9.8 9.8 0 0 0 3.4-.6" />
                      </svg>

                    ) : (

                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
                        <circle
                          cx="12"
                          cy="12"
                          r="3"
                        />
                      </svg>

                    )}

                  </button>

                </div>

              </div>


              {/* CONFIRM PIN */}

              <div className="pin-form-group">

                <label>
                  Confirm PIN
                </label>


                <div className="pin-input-wrapper">

                  <input
                    type={
                      showConfirmPin
                        ? "text"
                        : "password"
                    }
                    inputMode="numeric"
                    maxLength={6}
                    value={confirmPin}
                    disabled={completed}
                    onChange={(e) =>
                      setConfirmPin(
                        e.target.value.replace(
                          /\D/g,
                          ""
                        )
                      )
                    }
                    placeholder="Confirm 6-digit PIN"
                  />


                  <button
                    type="button"
                    className="pin-toggle"
                    disabled={completed}
                    onClick={() =>
                      setShowConfirmPin(
                        (prev) => !prev
                      )
                    }
                    aria-label={
                      showConfirmPin
                        ? "Hide confirm PIN"
                        : "Show confirm PIN"
                    }
                  >

                    {showConfirmPin ? (

                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M3 3l18 18" />
                        <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                        <path d="M9.9 4.2A10.7 10.7 0 0 1 12 4c5 0 9 5 9 8a10.2 10.2 0 0 1-2.1 3.5" />
                        <path d="M6.6 6.6C4.4 8 3 10.2 3 12c0 3 4 8 9 8a9.8 9.8 0 0 0 3.4-.6" />
                      </svg>

                    ) : (

                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
                        <circle
                          cx="12"
                          cy="12"
                          r="3"
                        />
                      </svg>

                    )}

                  </button>

                </div>

              </div>


              {/* PIN RULE */}

              <div className="pin-rule-box">

                <p>
                  PIN requirements
                </p>

                <span>
                  • Exactly 6 digits
                </span>

                <span>
                  • Numbers only
                </span>

                <span>
                  • PIN and Confirm PIN must match
                </span>

              </div>


              {/* ERROR */}

              {error && (

                <div className="setup-pin-error">

                  {error}

                </div>

              )}


              {/* SUCCESS */}

              {message && (

                <div className="setup-pin-success">

                  {message}

                </div>

              )}


              {/* BUTTON */}

              <button
                type="submit"
                className="setup-pin-button"
                disabled={
                  loading ||
                  completed
                }
              >

                {loading
                  ? "Setting PIN..."
                  : completed
                  ? "PIN Setup Completed"
                  : "Setup PIN"}

              </button>


            </form>

          </div>

        </div>

      </div>

    </div>
  );
}


export default SetupPinPage;