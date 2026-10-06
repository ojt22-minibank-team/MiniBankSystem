import {
  useState,
  type FormEvent,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  Eye,
  EyeOff,
  Landmark,
  LockKeyhole,
  UserRound,
} from "lucide-react";

import {
  loginCustomer,
} from "../../../services/authService";

import PublicAuthLayout
  from "../components/PublicAuthLayout";


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
      !loginIdentifier
      ||
      !password
    ) {

      setError(
        "Please enter Customer ID / Account Number and password."
      );

      return;
    }


    try {

      setLoading(
        true
      );


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

      setLoading(
        false
      );

    }

  };


  // =====================================================
  // UI
  // =====================================================

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
            md:grid-cols-2
          "
        >


          {/* ============================================
              LEFT BRAND PANEL
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


            {/* BRAND */}

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

                  <Landmark size={26} />

                </div>


                <h1
                  className="
                    text-3xl
                    font-bold
                    tracking-tight
                  "
                >

                  MiniBank

                </h1>

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

                Banking made secure,
                simple and convenient.

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

                Securely access your accounts,
                manage your banking services,
                and stay connected wherever you are.

              </p>

            </div>


            {/* BANK IMAGE */}

            <div
              className="
                relative
                z-10
                mt-8
                overflow-hidden
                rounded-2xl
                border
                border-white/15
                bg-white/10
                shadow-2xl
              "
            >

              <img

                src="/images.jfif"

                alt="MiniBank Building"

                className="
                  h-64
                  w-full
                  object-cover
                  lg:h-72
                "

              />


              <div
                className="
                  absolute
                  inset-x-0
                  bottom-0
                  bg-gradient-to-t
                  from-[#08295C]/90
                  to-transparent
                  px-6
                  pb-5
                  pt-16
                "
              >

                <p
                  className="
                    text-sm
                    font-semibold
                    text-white
                  "
                >

                  Your Trust, Our Priority

                </p>


                <p
                  className="
                    mt-1
                    text-xs
                    text-blue-100
                  "
                >

                  Secure • Simple • Convenient

                </p>

              </div>

            </div>

          </div>


          {/* ============================================
              RIGHT LOGIN PANEL
          ============================================ */}

          <div
            className="
              flex
              items-center
              justify-center
              px-6
              py-10
              sm:px-10
              lg:px-14
            "
          >

            <div
              className="
                w-full
                max-w-md
              "
            >


              {/* MOBILE LOGO */}

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

                  <Landmark size={22} />

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

                    Customer Portal

                  </p>

                </div>

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

                  Mini Banking

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

                  Welcome!

                </h2>


                <p
                  className="
                    mt-3
                    text-sm
                    leading-6
                    text-slate-500
                  "
                >

                  Login securely using your Customer ID
                  or Account Number.

                </p>

              </div>


              {/* ========================================
                  FORM
              ======================================== */}

              <form

                onSubmit={
                  handleLogin
                }

                autoComplete="off"

                className="space-y-5"

              >


                {/* ======================================
                    LOGIN IDENTIFIER
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

                      name="customerLookupValue"

                      value={
                        loginIdentifier
                      }

                      onChange={(e) =>
                        setLoginIdentifier(
                          e.target.value
                        )
                      }

                      onFocus={() =>
                        setLoginFieldEditable(
                          true
                        )
                      }

                      readOnly={
                        !loginFieldEditable
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
                    PASSWORD
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

                    Password

                  </label>


                  <div className="relative">

                    <LockKeyhole

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

                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }

                      name="customerSecretValue"

                      value={
                        password
                      }

                      onChange={(e) =>
                        setPassword(
                          e.target.value
                        )
                      }

                      onFocus={() =>
                        setPasswordFieldEditable(
                          true
                        )
                      }

                      readOnly={
                        !passwordFieldEditable
                      }

                      placeholder="Enter your password"

                      autoComplete="new-password"

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
                        pr-12
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


                    {/* PASSWORD SHOW / HIDE */}

                    <button

                      type="button"

                      onClick={() =>
                        setShowPassword(
                          (prev) =>
                            !prev
                        )
                      }

                      aria-label={
                        showPassword
                          ? "Hide password"
                          : "Show password"
                      }

                      className="
                        absolute
                        right-4
                        top-1/2
                        -translate-y-1/2
                        text-slate-400
                        transition
                        hover:text-slate-600
                      "
                    >

                      {
                        showPassword
                          ? (
                            <EyeOff
                              size={20}
                            />
                          )
                          : (
                            <Eye
                              size={20}
                            />
                          )
                      }

                    </button>

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
                    FORGOT PASSWORD
                ====================================== */}

                <div
                  className="
                    flex
                    items-center
                    justify-end
                  "
                >

                  <button

                    type="button"

                    onClick={() =>
                      navigate(
                        "/forgot-password"
                      )
                    }

                    className="
                      text-sm
                      font-semibold
                      text-blue-600
                      transition
                      hover:text-blue-700
                    "
                  >

                    Forgot password?

                  </button>

                </div>


                {/* ======================================
                    LOGIN BUTTON
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
                      : "Login"
                  }

                </button>

              </form>


              {/* ========================================
                  CONTACT BANK
              ======================================== */}

              <div
                className="
                  mt-8
                  border-t
                  border-slate-100
                  pt-6
                  text-center
                "
              >

                <p
                  className="
                    text-sm
                    text-slate-500
                  "
                >

                  Don't have an account?{" "}

                  <span
                    className="
                      font-semibold
                      text-blue-600
                    "
                  >

                    Contact your bank

                  </span>

                </p>

              </div>


              {/* ========================================
                  SECURITY MESSAGE
              ======================================== */}

              <div
                className="
                  mt-5
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

                  For your security, never share your
                  password or OTP with anyone.

                </p>

              </div>

            </div>

          </div>

        </div>

      </div>

    </PublicAuthLayout>

  );

}


export default LoginPage;