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
  KeyRound,
  Mail,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import {
  requestPasswordReset,
} from "../../../services/authService";

import PublicAuthLayout
  from "../components/PublicAuthLayout";


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

    if (
      !loginIdentifier.trim()
    ) {

      setError(
        "Please enter your Customer ID or Account Number."
      );

      return;
    }


    try {

      setLoading(
        true
      );


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

      if (
        response.destinationMasked
      ) {

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


    } catch (
      error: any
    ) {

      setError(

        error.response?.data?.message
        ||
        "Unable to request password reset. Please try again."

      );


    } finally {

      setLoading(
        false
      );

    }

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
              LEFT ACCOUNT RECOVERY PANEL
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


            {/* TOP */}

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

                    Secure Account Recovery

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

                Recover access to
                your account securely.

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

                Verify your identity using your
                registered email before creating
                a new password.

              </p>

            </div>


            {/* SECURITY INFORMATION */}

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

                    Secure Recovery

                  </h3>


                  <p
                    className="
                      mt-1
                      text-xs
                      text-blue-100
                    "
                  >

                    Your identity is verified first

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


                {/* OTP EXPIRY */}

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


                {/* PASSWORD SECURITY */}

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

                    Your password is never sent by email

                  </p>

                </div>

              </div>

            </div>

          </div>


          {/* ============================================
              RIGHT PASSWORD RECOVERY PANEL
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

                    Secure Account Recovery

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

                <KeyRound
                  size={30}
                />

              </div>


              {/* HEADER */}

              <div className="mb-8">

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

                  Forgot your password?

                </h2>


                <p
                  className="
                    mt-3
                    max-w-md
                    text-sm
                    leading-6
                    text-slate-500
                  "
                >

                  Enter your Customer ID or Account Number.
                  We will send a verification OTP to your
                  registered email.

                </p>

              </div>


              {/* ========================================
                  FORM
              ======================================== */}

              <form
                onSubmit={
                  handleSubmit
                }
                autoComplete="off"
                className="space-y-5"
              >


                {/* ======================================
                    CUSTOMER ID / ACCOUNT NUMBER
                ====================================== */}

                <div>

                  <label
                    className="
                      mb-2
                      block
                      text-sm
                      font-semibold
                      text-slate-700
                    "
                  >

                    Customer ID or Account Number

                  </label>


                  <div className="relative">

                    <UserRound

                      size={19}

                      className="
                        absolute
                        left-4
                        top-1/2
                        -translate-y-1/2
                        text-slate-400
                      "

                    />


                    <input

                      type="text"

                      value={
                        loginIdentifier
                      }

                      onChange={(e) =>
                        setLoginIdentifier(
                          e.target.value
                        )
                      }

                      placeholder="Enter Customer ID or Account Number"

                      autoComplete="off"

                      disabled={
                        loading
                      }

                      className="
                        w-full
                        rounded-xl
                        border
                        border-slate-300
                        bg-white
                        py-3.5
                        pl-12
                        pr-4
                        text-sm
                        text-slate-800
                        outline-none
                        transition
                        placeholder:text-slate-400
                        focus:border-blue-500
                        focus:ring-4
                        focus:ring-blue-100
                        disabled:cursor-not-allowed
                        disabled:bg-slate-50
                      "

                    />

                  </div>

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
                    CONTINUE BUTTON
                ====================================== */}

                <button

                  type="submit"

                  disabled={
                    loading
                  }

                  className="
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
                      ? "Sending OTP..."
                      : "Continue"
                  }

                </button>


                {/* ======================================
                    BACK TO LOGIN
                ====================================== */}

                <button

                  type="button"

                  onClick={() =>
                    navigate(
                      "/login"
                    )
                  }

                  disabled={
                    loading
                  }

                  className="
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

                  Back to Login

                </button>

              </form>


              {/* ========================================
                  EMAIL INFORMATION
              ======================================== */}

              <div
                className="
                  mt-7
                  rounded-xl
                  bg-slate-50
                  px-4
                  py-4
                "
              >

                <div
                  className="
                    flex
                    items-start
                    gap-3
                  "
                >

                  <Mail

                    size={18}

                    className="
                      mt-0.5
                      shrink-0
                      text-slate-400
                    "

                  />


                  <p
                    className="
                      text-xs
                      leading-5
                      text-slate-500
                    "
                  >

                    The verification code will only be
                    sent to the email address registered
                    with your MiniBank account.

                  </p>

                </div>

              </div>

            </div>

          </div>

        </div>

      </div>

    </PublicAuthLayout>

  );

}


export default ForgotPasswordPage;