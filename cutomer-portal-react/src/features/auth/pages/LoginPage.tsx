import {
  useState,
  type FormEvent,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import { Eye, EyeOff, LockKeyhole, ShieldCheck, UserRound } from "lucide-react";

import {
  loginCustomer,
} from "../../../services/authService";

import { AuthField, AuthNotice } from "../components/IndividualAuthUI";

import { EkarajAuthLayout } from "../components/EkarajAuthLayout";
import { EkarajAuthCard } from "../components/EkarajAuthCard";

const loginInputClass =
  "block min-h-11 w-full rounded-xl border border-[#CDD5DF] bg-white py-2.5 text-sm text-[#111418] shadow-sm outline-none transition-colors placeholder:text-[#757575] hover:border-[#C6A15B] focus:border-[#113E65] focus:ring-4 focus:ring-[#113E65]/15 disabled:cursor-not-allowed disabled:bg-[#E5EAF0] disabled:text-[#757575] motion-reduce:transition-none";
const loginLinkClass =
  "rounded-md font-semibold text-[#122E52] underline-offset-4 transition-colors hover:text-[#122E52] hover:underline decoration-[#B89146] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#56ABC0]/30 motion-reduce:transition-none";

function LoginPage() {

  // =====================================================
  // STATE
  // =====================================================

  const [
    loginIdentifier,
    setLoginIdentifier,
  ] = useState("");

  const [
    password,
    setPassword,
  ] = useState("");

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(false);


  // =====================================================
  // AUTOFILL CONTROL
  // =====================================================

  const [
    loginFieldEditable,
    setLoginFieldEditable,
  ] = useState(false);

  const [
    passwordFieldEditable,
    setPasswordFieldEditable,
  ] = useState(false);


  const navigate =
    useNavigate();


  // =====================================================
  // LOGIN
  // =====================================================

  const handleLogin = async (
    e: FormEvent
  ) => {

    e.preventDefault();

    setError("");


    // Empty field validation

    if (
      !loginIdentifier ||
      !password
    ) {

      setError(
        "Please enter Customer ID / Account Number and password."
      );

      return;
    }


    try {

      setLoading(true);


      const response =
        await loginCustomer({

          loginIdentifier:
            loginIdentifier,

          password:
            password,

        });


      // Password correct → OTP required

      if (
        response.otpRequired
      ) {

        sessionStorage.setItem(
          "challengeGroupId",
          response.challengeGroupId
        );


        if (
          response.maskedEmail
        ) {

          sessionStorage.setItem(
            "maskedEmail",
            response.maskedEmail
          );

        }


        navigate(
          "/otp"
        );

      }


    } catch (error: any) {

      setError(

        error.response?.data?.message
        ||
        "Login failed. Please try again."

      );

    } finally {

      setLoading(false);

    }

  };


  // =====================================================
  // UI
  // =====================================================

  return (
    <EkarajAuthLayout title="EKARAJ BANK | Personal Banking">
      <EkarajAuthCard
        ariaLabel="Individual login card"
        formLabel="Individual banking login"
        variant="login"
        leftHeading={<>Your Trust.<br />Our Commitment.</>}
      >
            <div className="mb-4">
              <h1 className="font-serif text-2xl font-medium leading-8 tracking-tight text-[#1A365D]">Welcome to EKARAJ Banking</h1>
              <p className="mt-0.5 text-sm leading-5 text-[#111418]">Login securely using your Customer ID or Account Number.</p>
              <div aria-hidden="true" className="mt-1 h-px w-10 bg-[#C6A15B]" />
            </div>
        <form onSubmit={handleLogin} autoComplete="off" className="space-y-2 [&_label]:text-[#111418] [&>div:first-child]:mb-4 [&>div:nth-child(2)]:mb-0.5 [&>div:nth-child(3)]:mb-0 [&>[role=alert]]:mt-1">
          <AuthField label="Customer ID / Account Number" htmlFor="individual-login-id">
            <UserRound aria-hidden="true" size={18} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-[#757575]" />
            <input
              type="text"
              name="customerLookupValue"
              value={loginIdentifier}
              onChange={(e) => setLoginIdentifier(e.target.value)}
              onFocus={() => setLoginFieldEditable(true)}
              readOnly={!loginFieldEditable}
              placeholder="Enter Customer ID or Account Number"
              autoComplete="off"
              disabled={loading}
              id="individual-login-id"
              className={`${loginInputClass} pl-11 pr-4`}
              aria-invalid={Boolean(error)}
              aria-required={true}
            />
          </AuthField>
          <AuthField label="Password" htmlFor="individual-login-password">
            <LockKeyhole aria-hidden="true" size={18} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-[#757575]" />
            <input
              type={showPassword ? "text" : "password"}
              name="customerSecretValue"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setPasswordFieldEditable(true)}
              readOnly={!passwordFieldEditable}
              placeholder="Enter your password"
              autoComplete="new-password"
              disabled={loading}
              id="individual-login-password"
              className={`${loginInputClass} pl-11 pr-12`}
              aria-invalid={Boolean(error)}
              aria-required={true}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute inset-y-0 right-1 inline-flex w-11 items-center justify-center rounded-lg text-[#757575] hover:text-[#122E52] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#122E52]"
            >
              {" "}
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}{" "}
            </button>
          </AuthField>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => navigate("/forgot-password")}
              className={`${loginLinkClass} inline-flex min-h-9 items-start px-1 pt-1 text-sm`}
            >
              Forgot password?
            </button>
          </div>
          <AuthNotice error={error} />
          <button
            type="submit"
            disabled={loading}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#56ABC0] bg-[#56ABC0] px-5 py-3 text-sm font-semibold text-[#122E52] shadow-sm transition-[background-color,box-shadow] hover:bg-[#4DA0B5] hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#56ABC0]/30 disabled:cursor-not-allowed disabled:saturate-50 disabled:opacity-70 disabled:hover:bg-[#56ABC0] motion-reduce:transition-none"
            aria-busy={loading}
          >
            {loading && (
              <span
                aria-hidden="true"
                className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-[#122E52]/25 border-t-[#122E52] motion-reduce:animate-none"
              />
            )}{" "}
            {loading ? "Sending OTP..." : "Login"}
          </button>
        </form>

        <div className="mt-2 space-y-1 text-center text-xs leading-5 text-[#111418]">
          <p>
            Corporate Banking?{" "}
            <Link
              to="/corporate/login"
              className={loginLinkClass}
            >
              Corporate Login
            </Link>
          </p>
          <p>
            Don't have an account?{" "}
            <span className="font-semibold text-[#111418]">Contact your bank</span>
          </p>
        </div>
        <div className="mt-2 flex items-start gap-2.5 rounded-xl border border-[#C6D5E3] bg-[#EAF2FA] p-2">
          <ShieldCheck aria-hidden="true" size={20} className="mt-0.5 shrink-0 text-[#113E65]" />
          <div>
            <p className="text-xs font-semibold leading-4 text-[#1A365D]">Your security comes first.</p>
            <p className="mt-0.5 text-xs leading-4 text-[#627084]">For your security, never share your password or OTP with anyone.</p>
          </div>
        </div>
      </EkarajAuthCard>
    </EkarajAuthLayout>
  );
}


export default LoginPage;
