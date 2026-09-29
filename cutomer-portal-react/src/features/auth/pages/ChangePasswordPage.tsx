import { useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  changeFirstLoginPassword
} from "../../../services/authService";

import "./ChangePasswordPage.css";


function ChangePasswordPage() {

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

  const [loading, setLoading] =
    useState(false);

  const navigate = useNavigate();


  const handleChangePassword = async (
    e: React.FormEvent
  ) => {

    e.preventDefault();

    setError("");


    // =====================================
    // VALIDATION
    // =====================================

    if (!newPassword || !confirmPassword) {

      setError(
        "Please fill in all password fields."
      );

      return;
    }


    if (newPassword.length < 8) {

      setError(
        "Password must be at least 8 characters."
      );

      return;
    }


    if (!/[A-Z]/.test(newPassword)) {

      setError(
        "Password must contain at least one uppercase letter."
      );

      return;
    }


    if (!/[a-z]/.test(newPassword)) {

      setError(
        "Password must contain at least one lowercase letter."
      );

      return;
    }


    if (!/[0-9]/.test(newPassword)) {

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


    if (newPassword !== confirmPassword) {

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


      await changeFirstLoginPassword({

        challengeGroupId:
          challengeGroupId,

        newPassword:
          newPassword,

        confirmPassword:
          confirmPassword,

      });


      // Password change success
      // challengeGroupId ကို မဖျက်သေးပါ
      // Setup PIN မှာ ပြန်သုံးရမယ်

      navigate(
        "/first-login/setup-pin"
      );


    } catch (error: any) {

      setError(
        error.response?.data?.message ||
        "Unable to change password."
      );


    } finally {

      setLoading(false);

    }
  };


  return (

    <div className="change-password-page">

      <div className="change-password-card">


        {/* ================= LEFT SIDE ================= */}

        <div className="change-password-brand-panel">

          <div className="change-password-brand-content">

            <h1>
              MiniBank
            </h1>

            <h3>
              Secure Your Account
            </h3>

            <p>
              Create a strong password to protect
              your online banking account.
            </p>

          </div>


          <div className="password-security-box">

            <div className="lock-icon">
              🔒
            </div>

            <h2>
              Password Security
            </h2>

            <p>
              Use a strong password that you
              haven't used before.
            </p>

          </div>

        </div>


        {/* ================= RIGHT SIDE ================= */}

        <div className="change-password-form-panel">

          <div className="change-password-form-wrapper">


            <h2>
              Change Temporary Password
            </h2>

            <p className="change-password-subtitle">

              For your security, please create
              a new password before continuing.

            </p>


            <form
              onSubmit={handleChangePassword}
            >


              {/* NEW PASSWORD */}

              <div className="change-form-group">

                <label>
                  New Password
                </label>


                <div className="change-password-input-wrapper">

                  <input
                    type={
                      showNewPassword
                        ? "text"
                        : "password"
                    }
                    value={newPassword}
                    onChange={(e) =>
                      setNewPassword(
                        e.target.value
                      )
                    }
                    placeholder="Enter new password"
                    autoComplete="new-password"
                  />


                  <button
                    type="button"
                    className="change-password-toggle"
                    onClick={() =>
                      setShowNewPassword(
                        (prev) => !prev
                      )
                    }
                    aria-label="Show or hide new password"
                  >

                    {showNewPassword ? (

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


              {/* CONFIRM PASSWORD */}

              <div className="change-form-group">

                <label>
                  Confirm Password
                </label>


                <div className="change-password-input-wrapper">

                  <input
                    type={
                      showConfirmPassword
                        ? "text"
                        : "password"
                    }
                    value={confirmPassword}
                    onChange={(e) =>
                      setConfirmPassword(
                        e.target.value
                      )
                    }
                    placeholder="Confirm new password"
                    autoComplete="new-password"
                  />


                  <button
                    type="button"
                    className="change-password-toggle"
                    onClick={() =>
                      setShowConfirmPassword(
                        (prev) => !prev
                      )
                    }
                    aria-label="Show or hide confirm password"
                  >

                    {showConfirmPassword ? (

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


              {/* PASSWORD REQUIREMENTS */}

              <div className="password-rules">

                <p>
                  Password must contain:
                </p>

                <span>
                  • At least 8 characters
                </span>

                <span>
                  • Uppercase and lowercase letters
                </span>

                <span>
                  • At least one number
                </span>

                <span>
                  • At least one special character
                </span>

              </div>


              {/* ERROR */}

              {error && (

                <div className="change-password-error">

                  {error}

                </div>

              )}


              {/* BUTTON */}

              <button
                type="submit"
                className="change-password-button"
                disabled={loading}
              >

                {loading
                  ? "Changing Password..."
                  : "Change Password"}

              </button>


            </form>

          </div>

        </div>

      </div>

    </div>
  );
}


export default ChangePasswordPage;