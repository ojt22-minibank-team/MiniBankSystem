import {
  useState,
  type FormEvent,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";

import {
  changeFirstLoginPassword,
} from "../../../services/authService";

import PublicAuthLayout
  from "../components/PublicAuthLayout";


function ChangePasswordPage() {

  // ======================================================
  // STATE
  // ======================================================

  const [
    newPassword,
    setNewPassword,
  ] = useState("");


  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");


  const [
    showNewPassword,
    setShowNewPassword,
  ] = useState(false);


  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);


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
  // CHANGE FIRST LOGIN PASSWORD
  // ======================================================

  const handleChangePassword = async (
    e: FormEvent
  ) => {

    e.preventDefault();

    setError("");


    // =====================================
    // VALIDATION
    // =====================================

    if (
      !newPassword
      ||
      !confirmPassword
    ) {

      setError(
        "Please fill in all password fields."
      );

      return;

    }


    if (
      newPassword.length < 8
    ) {

      setError(
        "Password must be at least 8 characters."
      );

      return;

    }


    if (
      !/[A-Z]/.test(
        newPassword
      )
    ) {

      setError(
        "Password must contain at least one uppercase letter."
      );

      return;

    }


    if (
      !/[a-z]/.test(
        newPassword
      )
    ) {

      setError(
        "Password must contain at least one lowercase letter."
      );

      return;

    }


    if (
      !/[0-9]/.test(
        newPassword
      )
    ) {

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


    if (
      newPassword !==
      confirmPassword
    ) {

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


    if (
      !challengeGroupId
    ) {

      setError(
        "Login session is missing. Please login again."
      );

      return;

    }


    // =====================================
    // API CALL
    // =====================================

    try {

      setLoading(
        true
      );


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


    } catch (
      error: any
    ) {

      setError(

        error.response?.data?.message
        ||
        "Unable to change password."

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
            min-h-[640px]
            md:grid-cols-[0.9fr_1.1fr]
          "
        >


          {/* ============================================
              LEFT FIRST LOGIN SECURITY PANEL
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


            {/* DECORATIVE CIRCLES */}

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


            {/* TOP CONTENT */}

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

                    First-Time Security Setup

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

                Secure your account
                before you start banking.

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

                Complete your security setup before
                accessing the MiniBank Customer Portal.

              </p>

            </div>


            {/* SECURITY STEPS */}

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

                    Security Setup

                  </h3>


                  <p
                    className="
                      mt-1
                      text-xs
                      text-blue-100
                    "
                  >

                    Complete both security steps

                  </p>

                </div>

              </div>


              <div className="space-y-4">


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


                  <p className="text-sm text-blue-50">

                    Create your personal password

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
                      bg-white/10
                      text-blue-100
                    "
                  >

                    2

                  </div>


                  <p className="text-sm text-blue-50">

                    Set up your Transaction PIN next

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


                  <p className="text-sm text-blue-50">

                    Protect your online banking account

                  </p>

                </div>

              </div>

            </div>

          </div>


          {/* ============================================
              RIGHT PASSWORD PANEL
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

                    First-Time Security Setup

                  </p>

                </div>

              </div>


              {/* ========================================
                  STEP INDICATOR
              ======================================== */}

              <div
                className="
                  mb-7
                  rounded-2xl
                  border
                  border-blue-100
                  bg-blue-50/60
                  px-5
                  py-4
                "
              >

                <div
                  className="
                    mb-3
                    flex
                    items-center
                    justify-between
                  "
                >

                  <p
                    className="
                      text-xs
                      font-bold
                      uppercase
                      tracking-wider
                      text-blue-600
                    "
                  >

                    First-Time Setup

                  </p>


                  <span
                    className="
                      text-xs
                      font-semibold
                      text-slate-500
                    "
                  >

                    Step 1 of 2

                  </span>

                </div>


                <div
                  className="
                    flex
                    items-center
                    gap-3
                  "
                >

                  {/* STEP 1 */}

                  <div
                    className="
                      flex
                      items-center
                      gap-2
                    "
                  >

                    <div
                      className="
                        flex
                        h-7
                        w-7
                        items-center
                        justify-center
                        rounded-full
                        bg-blue-600
                        text-xs
                        font-bold
                        text-white
                      "
                    >

                      1

                    </div>


                    <span
                      className="
                        text-xs
                        font-semibold
                        text-blue-700
                        sm:text-sm
                      "
                    >

                      Password

                    </span>

                  </div>


                  {/* LINE */}

                  <div
                    className="
                      h-px
                      flex-1
                      bg-blue-200
                    "
                  />


                  {/* STEP 2 */}

                  <div
                    className="
                      flex
                      items-center
                      gap-2
                    "
                  >

                    <div
                      className="
                        flex
                        h-7
                        w-7
                        items-center
                        justify-center
                        rounded-full
                        border
                        border-slate-300
                        bg-white
                        text-xs
                        font-bold
                        text-slate-400
                      "
                    >

                      2

                    </div>


                    <span
                      className="
                        text-xs
                        font-medium
                        text-slate-400
                        sm:text-sm
                      "
                    >

                      Transaction PIN

                    </span>

                  </div>

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

                <LockKeyhole
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

                  Account Security

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

                  Change Temporary Password

                </h2>


                <p
                  className="
                    mt-3
                    text-sm
                    leading-6
                    text-slate-500
                  "
                >

                  For your security, create a new
                  password before continuing to
                  Transaction PIN setup.

                </p>

              </div>


              {/* ========================================
                  FORM
              ======================================== */}

              <form
                onSubmit={
                  handleChangePassword
                }
                className="space-y-5"
              >


                {/* ======================================
                    NEW PASSWORD
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

                    New Password

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
                        showNewPassword
                          ? "text"
                          : "password"
                      }

                      value={
                        newPassword
                      }

                      onChange={(e) =>
                        setNewPassword(
                          e.target.value
                        )
                      }

                      placeholder="Enter new password"

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


                    <button

                      type="button"

                      onClick={() =>
                        setShowNewPassword(
                          (prev) =>
                            !prev
                        )
                      }

                      disabled={
                        loading
                      }

                      aria-label={
                        showNewPassword
                          ? "Hide new password"
                          : "Show new password"
                      }

                      className="
                        absolute
                        right-4
                        top-1/2
                        -translate-y-1/2
                        text-slate-400
                        transition
                        hover:text-slate-600
                        disabled:cursor-not-allowed
                        disabled:opacity-50
                      "
                    >

                      {
                        showNewPassword
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
                    CONFIRM PASSWORD
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

                    Confirm Password

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
                        showConfirmPassword
                          ? "text"
                          : "password"
                      }

                      value={
                        confirmPassword
                      }

                      onChange={(e) =>
                        setConfirmPassword(
                          e.target.value
                        )
                      }

                      placeholder="Confirm new password"

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


                    <button

                      type="button"

                      onClick={() =>
                        setShowConfirmPassword(
                          (prev) =>
                            !prev
                        )
                      }

                      disabled={
                        loading
                      }

                      aria-label={
                        showConfirmPassword
                          ? "Hide confirm password"
                          : "Show confirm password"
                      }

                      className="
                        absolute
                        right-4
                        top-1/2
                        -translate-y-1/2
                        text-slate-400
                        transition
                        hover:text-slate-600
                        disabled:cursor-not-allowed
                        disabled:opacity-50
                      "
                    >

                      {
                        showConfirmPassword
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
                    PASSWORD REQUIREMENTS
                ====================================== */}

                <div
                  className="
                    rounded-xl
                    border
                    border-blue-100
                    bg-blue-50/60
                    px-4
                    py-4
                  "
                >

                  <p
                    className="
                      mb-3
                      text-sm
                      font-semibold
                      text-[#08295C]
                    "
                  >

                    Password Requirements

                  </p>


                  <div
                    className="
                      grid
                      gap-2
                      sm:grid-cols-2
                    "
                  >


                    <div
                      className="
                        flex
                        items-center
                        gap-2
                      "
                    >

                      <Check
                        size={15}
                        className="
                          shrink-0
                          text-blue-600
                        "
                      />

                      <span
                        className="
                          text-xs
                          text-slate-600
                        "
                      >

                        At least 8 characters

                      </span>

                    </div>


                    <div
                      className="
                        flex
                        items-center
                        gap-2
                      "
                    >

                      <Check
                        size={15}
                        className="
                          shrink-0
                          text-blue-600
                        "
                      />

                      <span
                        className="
                          text-xs
                          text-slate-600
                        "
                      >

                        One uppercase letter

                      </span>

                    </div>


                    <div
                      className="
                        flex
                        items-center
                        gap-2
                      "
                    >

                      <Check
                        size={15}
                        className="
                          shrink-0
                          text-blue-600
                        "
                      />

                      <span
                        className="
                          text-xs
                          text-slate-600
                        "
                      >

                        One lowercase letter

                      </span>

                    </div>


                    <div
                      className="
                        flex
                        items-center
                        gap-2
                      "
                    >

                      <Check
                        size={15}
                        className="
                          shrink-0
                          text-blue-600
                        "
                      />

                      <span
                        className="
                          text-xs
                          text-slate-600
                        "
                      >

                        At least one number

                      </span>

                    </div>


                    <div
                      className="
                        flex
                        items-center
                        gap-2
                        sm:col-span-2
                      "
                    >

                      <Check
                        size={15}
                        className="
                          shrink-0
                          text-blue-600
                        "
                      />

                      <span
                        className="
                          text-xs
                          text-slate-600
                        "
                      >

                        At least one special character

                      </span>

                    </div>

                  </div>

                </div>


                {/* ======================================
                    ERROR
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
                    gap-2
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
                      ? (
                        "Changing Password..."
                      )
                      : (
                        <>
                          Continue to PIN Setup

                          <ArrowRight
                            size={18}
                          />
                        </>
                      )
                  }

                </button>

              </form>


              {/* SECURITY NOTE */}

              <div
                className="
                  mt-6
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

                  Your temporary password will no longer
                  be used after this security setup is completed.

                </p>

              </div>

            </div>

          </div>

        </div>

      </div>

    </PublicAuthLayout>

  );

}


export default ChangePasswordPage;