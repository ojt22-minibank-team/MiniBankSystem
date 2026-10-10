import {
  useState,
  type FormEvent,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  ArrowLeft,
  Check,
  Clock3,
  KeyRound,
  Mail,
  ShieldCheck,
} from "lucide-react";

import {
  verifyPasswordResetOtp,
  resendPasswordResetOtp,
} from "../../../services/authService";

import PublicAuthLayout
  from "../components/PublicAuthLayout";


function PasswordResetOtpPage() {

  // ======================================================
  // STATE
  // ======================================================

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
    loading,
    setLoading,
  ] = useState(false);


  const [
    resending,
    setResending,
  ] = useState(false);


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

    if (
      !challengeGroupId
    ) {

      setError(
        "Password reset session is missing. Please start again."
      );

      return;

    }


    // ====================================================
    // 2. OTP MUST BE EXACTLY 6 DIGITS
    // ====================================================

    if (
      !/^\d{6}$/.test(
        otp
      )
    ) {

      setError(
        "Please enter a valid 6-digit OTP."
      );

      return;

    }


    try {

      setLoading(
        true
      );


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

      if (
        !response.challengeGroupId
      ) {

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


    } catch (
      error: any
    ) {

      setError(

        error.response?.data?.message
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
  // RESEND PASSWORD RESET OTP
  // ======================================================

  const handleResendOtp =
    async () => {

      setError("");

      setMessage("");


      // ====================================================
      // 1. CHALLENGE GROUP ID CHECK
      // ====================================================

      if (
        !challengeGroupId
      ) {

        setError(
          "Password reset session is missing. Please start again."
        );

        return;

      }


      try {

        setResending(
          true
        );


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

        if (
          response.challengeGroupId
        ) {

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
          "Unable to resend OTP. Please try again."

        );


      } finally {

        setResending(
          false
        );

      }

    };


  // ======================================================
  // BACK TO FORGOT PASSWORD
  // ======================================================

  const handleBack =
    () => {

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


          {/* ============================================
              LEFT PASSWORD RECOVERY PANEL
          ============================================ */}

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


            {/* Decorative circles */}

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


            {/* BRAND / MESSAGE */}

            <div className="relative z-10">

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

                    Secure Password Recovery

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

                Confirm your identity
                before creating a
                new password.

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

                Enter the verification code sent
                to your registered email to continue
                the password recovery process.

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

                    Password Recovery

                  </h3>


                  <p
                    className="
                      mt-1
                      text-xs
                      text-blue-100
                    "
                  >

                    Secure identity verification

                  </p>

                </div>

              </div>


              <div className="space-y-4">


                {/* EMAIL OTP */}

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

                    Verification through Email OTP

                  </p>

                </div>


                {/* EXPIRY */}

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

                    OTP is valid for 5 minutes

                  </p>

                </div>


                {/* LATEST OTP */}

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

                    Only the latest OTP can be used

                  </p>

                </div>

              </div>

            </div>

          </div>


          {/* ============================================
              RIGHT OTP PANEL
          ============================================ */}

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

                    Password Recovery

                  </p>

                </div>

              </div>


              {/* ICON */}

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

              <div className="mb-7">

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

                  Password Recovery

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

                  Verify your email

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


              {/* ========================================
                  OTP FORM
              ======================================== */}

              <form
                onSubmit={
                  handleVerifyOtp
                }
              >


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

                <input

                  type="text"

                  inputMode="numeric"

                  maxLength={6}

                  value={
                    otp
                  }

                  placeholder="000000"

                  autoComplete="one-time-code"

                  onChange={(e) => {

                    const value =
                      e.target.value.replace(
                        /\D/g,
                        ""
                      );


                    setOtp(
                      value
                    );

                  }}

                  disabled={
                    loading
                    ||
                    resending
                  }

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


                {/* EXPIRY INFORMATION */}

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

                  The verification code is valid for
                  5 minutes.

                </div>


                {/* ======================================
                    ERROR MESSAGE
                ====================================== */}

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


                {/* ======================================
                    SUCCESS MESSAGE
                ====================================== */}

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


                {/* ======================================
                    VERIFY BUTTON
                ====================================== */}

                <button

                  type="submit"

                  disabled={
                    loading
                    ||
                    resending
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
                    loading
                      ? "Verifying..."
                      : "Verify OTP"
                  }

                </button>


                {/* ======================================
                    RESEND OTP
                ====================================== */}

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
                      loading
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


                {/* ======================================
                    BACK
                ====================================== */}

                <button

                  type="button"

                  onClick={
                    handleBack
                  }

                  disabled={
                    loading
                    ||
                    resending
                  }

                  className="
                    mt-5
                    flex
                    w-full
                    items-center
                    justify-center
                    gap-2
                    rounded-xl
                    border
                    border-slate-200
                    bg-white
                    px-5
                    py-3
                    text-sm
                    font-semibold
                    text-slate-600
                    transition
                    hover:bg-slate-50
                    hover:text-slate-800
                    disabled:cursor-not-allowed
                    disabled:opacity-60
                  "
                >

                  <ArrowLeft
                    size={17}
                  />

                  Back to Password Recovery

                </button>

              </form>


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

                  For your security, only use the
                  latest verification code sent to
                  your registered email.

                </p>

              </div>

            </div>

          </div>

        </div>

      </div>

    </PublicAuthLayout>

  );

}


export default PasswordResetOtpPage;