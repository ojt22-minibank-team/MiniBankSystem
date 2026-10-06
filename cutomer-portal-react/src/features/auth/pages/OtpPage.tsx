import {
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  Check,
  Clock3,
  KeyRound,
  Mail,
  ShieldCheck,
} from "lucide-react";

import {
  verifyOtp,
  resendOtp,
  testProtectedApi,
} from "../../../services/authService";

import {
  saveTokens,
} from "../../../utils/tokenStorage";

import PublicAuthLayout
  from "../components/PublicAuthLayout";


function OtpPage() {

  // =========================================
  // STATE
  // =========================================

  const [
    otp,
    setOtp,
  ] = useState("");


  const [
    error,
    setError,
  ] = useState("");


  const [
    message,
    setMessage,
  ] = useState("");


  const [
    verifying,
    setVerifying,
  ] = useState(false);


  const [
    resending,
    setResending,
  ] = useState(false);


  const [
    completed,
    setCompleted,
  ] = useState(false);


  const [
    testMessage,
    setTestMessage,
  ] = useState("");


  const navigate =
    useNavigate();


  const maskedEmail =
    sessionStorage.getItem(
      "maskedEmail"
    );


  // =========================================
  // VERIFY OTP
  // =========================================

  const handleVerifyOtp =
    async () => {

      setError("");

      setMessage("");

      setTestMessage("");


      const challengeGroupId =
        sessionStorage.getItem(
          "challengeGroupId"
        );


      if (
        !challengeGroupId
      ) {

        setError(
          "Login session is missing. Please login again."
        );

        return;

      }


      if (
        !otp
      ) {

        setError(
          "Please enter OTP."
        );

        return;

      }


      if (
        !/^\d{6}$/.test(
          otp
        )
      ) {

        setError(
          "OTP must be exactly 6 digits."
        );

        return;

      }


      try {

        setVerifying(
          true
        );


        const response =
          await verifyOtp({

            challengeGroupId,

            otp,

          });


        // =====================================
        // FIRST LOGIN
        // =====================================

        if (
          response.firstLoginSetupRequired
        ) {

          if (
            response.passwordChangeRequired
          ) {

            navigate(
              "/first-login/change-password"
            );

            return;

          }


          if (
            response.pinSetupRequired
          ) {

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
          response.accessToken
          &&
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


          setCompleted(
            true
          );


          setMessage(
            "Login completed successfully."
          );


          navigate(
            "/dashboard"
          );

          return;

        }


        setError(
          "Login could not be completed."
        );


      } catch (
        error: any
      ) {

        setError(

          error.response?.data?.message
          ||
          "OTP verification failed."

        );


      } finally {

        setVerifying(
          false
        );

      }

    };


  // =========================================
  // RESEND OTP
  // =========================================

  const handleResendOtp =
    async () => {

      setError("");

      setMessage("");


      const challengeGroupId =
        sessionStorage.getItem(
          "challengeGroupId"
        );


      if (
        !challengeGroupId
      ) {

        setError(
          "Login session is missing. Please login again."
        );

        return;

      }


      try {

        setResending(
          true
        );


        const response =
          await resendOtp({

            challengeGroupId,

          });


        // Backend returns new challengeGroupId

        if (
          response.challengeGroupId
        ) {

          sessionStorage.setItem(
            "challengeGroupId",
            response.challengeGroupId
          );

        }


        setOtp("");


        setMessage(

          response.message
          ||
          "A new OTP has been sent to your registered email."

        );


      } catch (
        error: any
      ) {

        setError(

          error.response?.data?.message
          ||
          "Unable to resend OTP."

        );


      } finally {

        setResending(
          false
        );

      }

    };


  // =========================================
  // TEST PROTECTED API
  // KEEP CURRENT LOGIC
  // UI IS HIDDEN
  // =========================================

  const handleTestProtectedApi =
    async () => {

      setTestMessage("");


      try {

        const response =
          await testProtectedApi();


        console.log(
          "Protected API success:",
          response
        );


        setTestMessage(
          "Protected API success."
        );


      } catch (
        error: any
      ) {

        console.log(
          "Protected API failed:",
          error.response?.data
        );


        setTestMessage(

          error.response?.data?.message
          ||
          "Protected API failed."

        );

      }

    };


  // =========================================
  // UI
  // =========================================

  return (

    <PublicAuthLayout>

      <div
        className="
          w-full
          max-w-6xl
          overflow-hidden
          rounded-3xl
          border
          border-slate-200
          bg-white
          shadow-xl
          shadow-slate-200/70
        "
      >

        <div
          className="
            grid
            min-h-[610px]
            md:grid-cols-[0.9fr_1.1fr]
          "
        >


          {/* =====================================
              LEFT SECURITY PANEL
          ====================================== */}

          <div
            className="
              relative
              hidden
              overflow-hidden
              bg-gradient-to-br
              from-[#08295C]
              via-[#0B3A78]
              to-[#125AA3]
              p-10
              text-white
              md:flex
              md:flex-col
              md:justify-between
              lg:p-12
            "
          >


            {/* DECORATIVE BACKGROUND */}

            <div
              className="
                absolute
                -right-24
                -top-24
                h-72
                w-72
                rounded-full
                bg-white/5
              "
            />


            <div
              className="
                absolute
                -bottom-28
                -left-20
                h-72
                w-72
                rounded-full
                bg-white/5
              "
            />


            {/* TOP */}

            <div
              className="
                relative
                z-10
              "
            >

              <div
                className="
                  mb-8
                  flex
                  items-center
                  gap-3
                "
              >

                <div
                  className="
                    flex
                    h-12
                    w-12
                    items-center
                    justify-center
                    rounded-2xl
                    bg-white/15
                    backdrop-blur
                  "
                >

                  <ShieldCheck
                    size={27}
                  />

                </div>


                <div>

                  <h1
                    className="
                      text-2xl
                      font-bold
                    "
                  >

                    MiniBank

                  </h1>


                  <p
                    className="
                      mt-0.5
                      text-xs
                      text-blue-100
                    "
                  >

                    Secure Verification

                  </p>

                </div>

              </div>


              <h2
                className="
                  max-w-md
                  text-3xl
                  font-bold
                  leading-tight
                  lg:text-4xl
                "
              >

                Protecting your account,
                every step of the way.

              </h2>


              <p
                className="
                  mt-5
                  max-w-md
                  text-sm
                  leading-7
                  text-blue-100
                  lg:text-base
                "
              >

                Email verification adds an
                additional security layer before
                you access your MiniBank account.

              </p>

            </div>


            {/* SECURITY BOX */}

            <div
              className="
                relative
                z-10
                mt-8
                rounded-2xl
                border
                border-white/15
                bg-white/10
                p-6
                backdrop-blur-sm
              "
            >

              <div
                className="
                  mb-5
                  flex
                  items-center
                  gap-3
                "
              >

                <div
                  className="
                    flex
                    h-11
                    w-11
                    shrink-0
                    items-center
                    justify-center
                    rounded-full
                    bg-white/15
                  "
                >

                  <KeyRound
                    size={22}
                  />

                </div>


                <div>

                  <h3
                    className="
                      text-lg
                      font-bold
                    "
                  >

                    Two-Step Security

                  </h3>


                  <p
                    className="
                      mt-1
                      text-xs
                      text-blue-100
                    "
                  >

                    Verify your identity securely

                  </p>

                </div>

              </div>


              <div
                className="
                  space-y-4
                "
              >

                <div
                  className="
                    flex
                    items-center
                    gap-3
                  "
                >

                  <div
                    className="
                      flex
                      h-7
                      w-7
                      shrink-0
                      items-center
                      justify-center
                      rounded-full
                      bg-emerald-400/20
                      text-emerald-200
                    "
                  >

                    <Check
                      size={16}
                    />

                  </div>


                  <p
                    className="
                      text-sm
                      text-blue-50
                    "
                  >

                    OTP expires in 5 minutes

                  </p>

                </div>


                <div
                  className="
                    flex
                    items-center
                    gap-3
                  "
                >

                  <div
                    className="
                      flex
                      h-7
                      w-7
                      shrink-0
                      items-center
                      justify-center
                      rounded-full
                      bg-emerald-400/20
                      text-emerald-200
                    "
                  >

                    <Check
                      size={16}
                    />

                  </div>


                  <p
                    className="
                      text-sm
                      text-blue-50
                    "
                  >

                    Never share your OTP with anyone

                  </p>

                </div>


                <div
                  className="
                    flex
                    items-center
                    gap-3
                  "
                >

                  <div
                    className="
                      flex
                      h-7
                      w-7
                      shrink-0
                      items-center
                      justify-center
                      rounded-full
                      bg-emerald-400/20
                      text-emerald-200
                    "
                  >

                    <Check
                      size={16}
                    />

                  </div>


                  <p
                    className="
                      text-sm
                      text-blue-50
                    "
                  >

                    Only use the latest OTP sent to you

                  </p>

                </div>

              </div>

            </div>

          </div>


          {/* =====================================
              RIGHT OTP PANEL
          ====================================== */}

          <div
            className="
              flex
              items-center
              justify-center
              px-6
              py-10
              sm:px-10
              lg:px-16
            "
          >

            <div
              className="
                w-full
                max-w-lg
              "
            >


              {/* MOBILE BRAND */}

              <div
                className="
                  mb-8
                  flex
                  items-center
                  gap-3
                  md:hidden
                "
              >

                <div
                  className="
                    flex
                    h-11
                    w-11
                    items-center
                    justify-center
                    rounded-xl
                    bg-[#08295C]
                    text-white
                  "
                >

                  <ShieldCheck
                    size={22}
                  />

                </div>


                <div>

                  <h1
                    className="
                      text-xl
                      font-bold
                      text-[#08295C]
                    "
                  >

                    MiniBank

                  </h1>


                  <p
                    className="
                      text-xs
                      text-slate-400
                    "
                  >

                    Secure Verification

                  </p>

                </div>

              </div>


              {/* EMAIL ICON */}

              <div
                className="
                  mb-6
                  flex
                  h-16
                  w-16
                  items-center
                  justify-center
                  rounded-2xl
                  bg-blue-50
                  text-blue-600
                "
              >

                <Mail
                  size={30}
                />

              </div>


              {/* HEADER */}

              <div
                className="
                  mb-7
                "
              >

                <p
                  className="
                    mb-2
                    text-sm
                    font-semibold
                    uppercase
                    tracking-wider
                    text-blue-600
                  "
                >

                  Email Verification

                </p>


                <h2
                  className="
                    text-3xl
                    font-bold
                    tracking-tight
                    text-[#08295C]
                    lg:text-4xl
                  "
                >

                  Verify your identity

                </h2>


                <p
                  className="
                    mt-3
                    text-sm
                    leading-6
                    text-slate-500
                  "
                >

                  Enter the 6-digit verification code
                  sent to your registered email.

                </p>


                {/* MASKED EMAIL */}

                {
                  maskedEmail
                  &&
                  (

                    <div
                      className="
                        mt-4
                        inline-flex
                        items-center
                        gap-2
                        rounded-full
                        bg-blue-50
                        px-4
                        py-2
                        text-sm
                        font-semibold
                        text-blue-700
                      "
                    >

                      <Mail
                        size={16}
                      />

                      {maskedEmail}

                    </div>

                  )
                }

              </div>


              {/* OTP LABEL */}

              <label
                className="
                  mb-2
                  block
                  text-sm
                  font-semibold
                  text-slate-700
                "
              >

                Verification Code

              </label>


              {/* OTP INPUT */}

              <div
                className="
                  relative
                "
              >

                <input

                  type="text"

                  inputMode="numeric"

                  maxLength={6}

                  value={
                    otp
                  }

                  disabled={
                    completed
                    ||
                    verifying
                    ||
                    resending
                  }

                  onChange={(e) =>
                    setOtp(
                      e.target.value.replace(
                        /\D/g,
                        ""
                      )
                    )
                  }

                  placeholder="000000"

                  autoComplete="one-time-code"

                  className="
                    w-full
                    rounded-xl
                    border
                    border-slate-300
                    bg-white
                    px-5
                    py-4
                    text-center
                    text-2xl
                    font-semibold
                    tracking-[0.55em]
                    text-slate-800
                    outline-none
                    transition
                    placeholder:text-slate-300
                    focus:border-blue-500
                    focus:ring-4
                    focus:ring-blue-100
                    disabled:cursor-not-allowed
                    disabled:bg-slate-50
                  "

                />

              </div>


              {/* OTP EXPIRY INFO */}

              <div
                className="
                  mt-3
                  flex
                  items-center
                  gap-2
                  text-xs
                  text-slate-400
                "
              >

                <Clock3
                  size={15}
                />

                The code is valid for 5 minutes.

              </div>


              {/* ERROR */}

              {
                error
                &&
                (

                  <div
                    className="
                      mt-5
                      rounded-xl
                      border
                      border-red-200
                      bg-red-50
                      px-4
                      py-3
                      text-sm
                      font-medium
                      text-red-600
                    "
                  >

                    {error}

                  </div>

                )
              }


              {/* SUCCESS MESSAGE */}

              {
                message
                &&
                (

                  <div
                    className="
                      mt-5
                      rounded-xl
                      border
                      border-emerald-200
                      bg-emerald-50
                      px-4
                      py-3
                      text-sm
                      font-medium
                      text-emerald-700
                    "
                  >

                    {message}

                  </div>

                )
              }


              {/* VERIFY BUTTON */}

              <button

                type="button"

                onClick={
                  handleVerifyOtp
                }

                disabled={
                  verifying
                  ||
                  resending
                  ||
                  completed
                }

                className="
                  mt-6
                  flex
                  w-full
                  items-center
                  justify-center
                  rounded-xl
                  bg-blue-600
                  px-5
                  py-3.5
                  text-sm
                  font-bold
                  text-white
                  shadow-sm
                  transition
                  hover:bg-blue-700
                  focus:outline-none
                  focus:ring-4
                  focus:ring-blue-200
                  disabled:cursor-not-allowed
                  disabled:opacity-60
                "
              >

                {
                  verifying
                    ? "Verifying..."
                    : "Verify OTP"
                }

              </button>


              {/* RESEND */}

              {
                !completed
                &&
                (

                  <div
                    className="
                      mt-6
                      text-center
                    "
                  >

                    <span
                      className="
                        text-sm
                        text-slate-500
                      "
                    >

                      Didn't receive the code?{" "}

                    </span>


                    <button

                      type="button"

                      onClick={
                        handleResendOtp
                      }

                      disabled={
                        verifying
                        ||
                        resending
                      }

                      className="
                        text-sm
                        font-semibold
                        text-blue-600
                        transition
                        hover:text-blue-700
                        disabled:cursor-not-allowed
                        disabled:opacity-50
                      "
                    >

                      {
                        resending
                          ? "Sending..."
                          : "Resend OTP"
                      }

                    </button>

                  </div>

                )
              }


              {/* SECURITY NOTE */}

              <div
                className="
                  mt-7
                  rounded-xl
                  bg-slate-50
                  px-4
                  py-3
                  text-center
                "
              >

                <p
                  className="
                    text-xs
                    leading-5
                    text-slate-500
                  "
                >

                  MiniBank will never ask you to share
                  your OTP by phone, message, or email.

                </p>

              </div>


              {/* =====================================
                  TEMPORARY DEV TEST
                  Keep current logic but hide UI.
              ====================================== */}

              <div className="hidden">

                {
                  completed
                  &&
                  (

                    <button
                      type="button"
                      onClick={
                        handleTestProtectedApi
                      }
                    >

                      Test Protected API

                    </button>

                  )
                }


                {
                  testMessage
                  &&
                  (

                    <div>
                      {testMessage}
                    </div>

                  )
                }

              </div>

            </div>

          </div>

        </div>

      </div>

    </PublicAuthLayout>

  );

}


export default OtpPage;