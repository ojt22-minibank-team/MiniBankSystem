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

    <PublicAuthLayout>

      {/* =================================================
          MAIN CARD
      ================================================= */}

      <div
        className="
          relative
          w-full
          max-w-6xl
          overflow-hidden
          rounded-3xl
          border
          border-white/60
          bg-white
          shadow-2xl
          shadow-slate-900/20
        "
      >

        <div
          className="
            grid
            min-h-[620px]
            md:grid-cols-2
          "
        >


          {/* =================================================
              LEFT SIDE - BANKING BUILDING
          ================================================= */}

          <div
            className="
              relative
              hidden
              min-h-[620px]
              overflow-hidden
              md:block
            "
          >

            {/* BANKING BUILDING IMAGE */}

            <img
              src="/images.jfif"
              alt="MiniBank Building"
              className="
                absolute
                inset-0
                h-full
                w-full
                object-cover
              "
            />


            {/* DARK OVERLAY */}

            <div
              className="
                absolute
                inset-0
                bg-[#06254D]/45
              "
            />


            {/* GRADIENT OVERLAY */}

            <div
              className="
                absolute
                inset-0
                bg-gradient-to-t
                from-[#031B36]/90
                via-[#06254D]/30
                to-transparent
              "
            />


            {/* LEFT CONTENT */}

            <div
              className="
                relative
                z-10
                flex
                h-full
                flex-col
                items-center
                justify-center
                px-10
                text-center
                text-white
              "
            >

              {/* BANK ICON */}

              <div
                className="
                  mb-6
                  flex
                  h-16
                  w-16
                  items-center
                  justify-center
                  rounded-full
                  border
                  border-white/30
                  bg-white/15
                  shadow-lg
                  backdrop-blur-md
                "
              >

                <Landmark
                  size={30}
                  strokeWidth={1.8}
                />

              </div>


              {/* TITLE */}

              <h1
                className="
                  text-3xl
                  font-extrabold
                  tracking-wide
                  drop-shadow-lg
                  lg:text-4xl
                "
              >
                WELCOME TO MINIBANK
              </h1>


              {/* BLUE / CYAN LINE */}

              <div
                className="
                  my-5
                  h-1
                  w-20
                  rounded-full
                  bg-cyan-400
                "
              />


              {/* DESCRIPTION */}

              <p
                className="
                  max-w-md
                  text-sm
                  leading-6
                  text-blue-50
                  drop-shadow-md
                  lg:text-base
                "
              >
                Securely access your account, manage
                your banking services, and stay
                connected with MiniBank.
              </p>


              {/* BOTTOM TEXT */}

              <div
                className="
                  absolute
                  bottom-10
                  left-0
                  right-0
                  px-8
                  text-center
                "
              >

                <p
                  className="
                    text-sm
                    font-semibold
                    tracking-wide
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


          {/* =================================================
              RIGHT SIDE - LOGIN FORM
          ================================================= */}

          <div
            className="
              flex
              items-center
              justify-center
              bg-white
              px-7
              py-10
              sm:px-12
              lg:px-16
            "
          >

            <div
              className="
                w-full
                max-w-md
              "
            >


              {/* =================================================
                  MOBILE LOGO
              ================================================= */}

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

                  <Landmark
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
                    Customer Portal
                  </p>

                </div>

              </div>


              {/* =================================================
                  HEADER
              ================================================= */}

              <div
                className="
                  mb-8
                "
              >

                <p
                  className="
                    mb-2
                    text-xs
                    font-bold
                    uppercase
                    tracking-[0.2em]
                    text-cyan-600
                  "
                >
                  Mini Banking
                </p>


                <h2
                  className="
                    text-3xl
                    font-extrabold
                    tracking-tight
                    text-[#08295C]
                    lg:text-4xl
                  "
                >
                  Welcome Back
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


              {/* =================================================
                  LOGIN FORM
              ================================================= */}

              <form
                onSubmit={
                  handleLogin
                }
                autoComplete="off"
                className="
                  space-y-5
                "
              >


                {/* =================================================
                    CUSTOMER ID / ACCOUNT NUMBER
                ================================================= */}

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


                  <div
                    className="
                      relative
                    "
                  >

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
                        border-slate-200
                        bg-slate-50
                        py-3.5
                        pl-12
                        pr-4
                        text-sm
                        text-slate-800
                        outline-none
                        transition-all
                        placeholder:text-slate-400
                        hover:border-slate-300
                        focus:border-cyan-500
                        focus:bg-white
                        focus:ring-4
                        focus:ring-cyan-100
                        disabled:cursor-not-allowed
                        disabled:bg-slate-100
                      "
                    />

                  </div>

                </div>


                {/* =================================================
                    PASSWORD
                ================================================= */}

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


                  <div
                    className="
                      relative
                    "
                  >

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
                        border-slate-200
                        bg-slate-50
                        py-3.5
                        pl-12
                        pr-12
                        text-sm
                        text-slate-800
                        outline-none
                        transition-all
                        placeholder:text-slate-400
                        hover:border-slate-300
                        focus:border-cyan-500
                        focus:bg-white
                        focus:ring-4
                        focus:ring-cyan-100
                        disabled:cursor-not-allowed
                        disabled:bg-slate-100
                      "
                    />


                    {/* SHOW / HIDE PASSWORD */}

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
                        hover:text-[#08295C]
                      "
                    >

                      {showPassword ? (

                        <EyeOff
                          size={20}
                        />

                      ) : (

                        <Eye
                          size={20}
                        />

                      )}

                    </button>

                  </div>

                </div>


                {/* =================================================
                    ERROR MESSAGE
                ================================================= */}

                {
                  error &&
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


                {/* =================================================
                    FORGOT PASSWORD
                ================================================= */}

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
                      text-cyan-600
                      transition
                      hover:text-cyan-700
                    "
                  >
                    Forgot password?
                  </button>

                </div>


                {/* =================================================
                    LOGIN BUTTON
                ================================================= */}

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
                    bg-[#08295C]
                    px-5
                    py-3.5
                    text-sm
                    font-bold
                    text-white
                    shadow-lg
                    shadow-blue-900/15
                    transition-all
                    hover:bg-[#0B3A78]
                    hover:shadow-xl
                    focus:outline-none
                    focus:ring-4
                    focus:ring-blue-100
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


              {/* =================================================
                  CONTACT BANK
              ================================================= */}

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
                      text-cyan-600
                    "
                  >
                    Contact your bank
                  </span>

                </p>

              </div>


              {/* =================================================
                  SECURITY MESSAGE
              ================================================= */}

              <div
                className="
                  mt-5
                  flex
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  bg-slate-50
                  px-4
                  py-3
                  text-center
                "
              >

                <LockKeyhole
                  size={14}
                  className="
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