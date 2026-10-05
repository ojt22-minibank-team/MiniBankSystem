import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { loginCustomer } from "../../../services/authService";

import "./LoginPage.css";

function LoginPage() {
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setError("");

    // Empty field validation
    if (!loginIdentifier || !password) {
      setError(
        "Please enter Customer ID / Account Number and password."
      );
      return;
    }

    try {
      setLoading(true);

      const response = await loginCustomer({
        loginIdentifier: loginIdentifier,
        password: password,
      });

      // Password correct → OTP required
     if (response.otpRequired) {
  sessionStorage.setItem(
    "challengeGroupId",
    response.challengeGroupId
  );

  if (response.maskedEmail) {
    sessionStorage.setItem(
      "maskedEmail",
      response.maskedEmail
    );
  }

  navigate("/otp");
}

    } catch (error: any) {
      setError(
        error.response?.data?.message ||
        "Login failed. Please try again."
      );

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">

      <div className="login-card">

        {/* ================= LEFT SIDE ================= */}

        <div className="login-brand-panel">

          <div className="brand-content">

  <h1>MiniBank</h1>

  <h3>
    Your Trust, Our Priority
  </h3>

  <p>
    Secure • Simple • Convenient
  </p>

</div>

          <div className="building-image">

            <img
              src="/images.jfif"
              alt="MiniBank Building"
              className="bank-building"
            />

          </div>

        </div>


        {/* ================= RIGHT SIDE ================= */}

        <div className="login-form-panel">

          <div className="login-form-wrapper">

            <h2>
              Welcome!
            </h2>

            <p className="subtitle">
              Login to your account
            </p>


            <form onSubmit={handleLogin}>

              {/* LOGIN IDENTIFIER */}

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
                />

              </div>


              {/* PASSWORD */}
                  {/* PASSWORD */}

<div className="form-group">

  <label>
    Password
  </label>

  <div className="password-input-wrapper">

    <input
      type={showPassword ? "text" : "password"}
      value={password}
      onChange={(e) =>
        setPassword(e.target.value)
      }
      placeholder="Enter your password"
      autoComplete="current-password"
    />

    <button
      type="button"
      className="password-toggle"
      onClick={() =>
        setShowPassword((prev) => !prev)
      }
      aria-label={
        showPassword
          ? "Hide password"
          : "Show password"
      }
    >

      {showPassword ? (
        /* EYE OFF */
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
        /* EYE */
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


      


              {/* ERROR MESSAGE */}

              {error && (
                <div className="error-message">
                  {error}
                </div>
              )}


              {/* LOGIN OPTIONS */}

              <div className="login-options">

                <label className="remember-me">

                  <input
                    type="checkbox"
                  />

                  <span>
                    Remember me
                  </span>

                </label>


                <button
                 type="button"
                    className="forgot-password"
                    onClick={() => navigate("/forgot-password")}
                  >
                    Forgot password?
          </button>

              </div>


              {/* LOGIN BUTTON */}

              <button
                type="submit"
                className="login-button"
                disabled={loading}
              >

                {loading
                  ? "Sending OTP..."
                  : "Login"}

              </button>

            </form>


            <p className="contact-bank">

              Don't have an account?

              <span>
                Contact your bank
              </span>

            </p>

          </div>

        </div>

      </div>

    </div>
  );
}

export default LoginPage;