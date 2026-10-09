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
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";

import {
  confirmPasswordReset,
} from "../../../services/authService";

import PublicAuthLayout
  from "../components/PublicAuthLayout";


function ResetPasswordPage() {

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
    success,
    setSuccess,
  ] = useState("");


  const [
    loading,
    setLoading,
  ] = useState(false);


  const navigate =
    useNavigate();


  // ======================================================
  // GET VERIFIED CHALLENGE GROUP ID
  // ======================================================

  const verifiedChallengeGroupId =
    sessionStorage.getItem(
      "verifiedPasswordResetChallengeGroupId"
    );


  // ======================================================
  // PASSWORD VALIDATION
  // ======================================================

  const isValidPassword = (
    password: string
  ) => {

    // Minimum 8, Maximum 10

    if (
      password.length < 8
      ||
      password.length > 10
    ) {

      return false;

    }


    // At least one uppercase letter

    if (
      !/[A-Z]/.test(
        password
      )
    ) {

      return false;

    }


    // At least one lowercase letter

    if (
      !/[a-z]/.test(
        password
      )
    ) {

      return false;

    }


    // At least one number

    if (
      !/[0-9]/.test(
        password
      )
    ) {

      return false;

    }


    // At least one special character

    if (
      !/[^A-Za-z0-9]/.test(
        password
      )
    ) {

      return false;

    }


    // No whitespace

    if (
      /\s/.test(
        password
      )
    ) {

      return false;

    }


    return true;

  };


  // ======================================================
  // RESET PASSWORD
  // ======================================================

  const handleResetPassword =
    async (
      e: FormEvent
    ) => {

      e.preventDefault();


      setError("");

      setSuccess("");


      // ====================================================
      // 1. VERIFIED CHALLENGE ID CHECK
      // ====================================================

      if (
        !verifiedChallengeGroupId
        ||
        verifiedChallengeGroupId === "undefined"
        ||
        verifiedChallengeGroupId === "null"
      ) {

        setError(
          "Password reset authorization is missing. Please start again."
        );

        return;

      }


      // Temporary development log

      console.log(
        "verifiedChallengeGroupId sent to backend:",
        verifiedChallengeGroupId
      );


      // ====================================================
      // 2. EMPTY FIELD CHECK
      // ====================================================

      if (
        !newPassword
        ||
        !confirmPassword
      ) {

        setError(
          "Please enter new password and confirm password."
        );

        return;

      }


      // ====================================================
      // 3. PASSWORDS MUST MATCH
      // ====================================================

      if (
        newPassword !==
        confirmPassword
      ) {

        setError(
          "New password and confirm password do not match."
        );

        return;

      }


      // ====================================================
      // 4. PASSWORD POLICY CHECK
      // ====================================================

      if (
        !isValidPassword(
          newPassword
        )
      ) {

        setError(
          "Password must be between 8 and 10 characters and include at least one uppercase letter, one lowercase letter, one number, and one special character. Whitespace is not allowed."
        );

        return;

      }


      try {

        setLoading(
          true
        );


        // ==================================================
        // 5. CALL PASSWORD RESET API
        // ==================================================

        const response =
          await confirmPasswordReset({

            verifiedChallengeGroupId:
              verifiedChallengeGroupId,

            newPassword:
              newPassword,

            confirmPassword:
              confirmPassword,

          });


        // ==================================================
        // 6. CLEAR RESET SESSION DATA
        // ==================================================

        sessionStorage.removeItem(
          "verifiedPasswordResetChallengeGroupId"
        );


        sessionStorage.removeItem(
          "passwordResetChallengeGroupId"
        );


        sessionStorage.removeItem(
          "passwordResetMaskedEmail"
        );


        // ==================================================
        // 7. CLEAR PASSWORD INPUTS
        // ==================================================

        setNewPassword("");

        setConfirmPassword("");


        // ==================================================
        // 8. SUCCESS MESSAGE
        // ==================================================

        setSuccess(

          response
          ||
          "Password reset successfully."

        );


      } catch (
        error: any
      ) {

        setError(

          error.response?.data?.message
          ||
          "Unable to reset password. Please try again."

        );


      } finally {

        setLoading(
          false
        );

      }

    };


  // ======================================================
  // CANCEL RESET
  // ======================================================

  const handleCancel =
    () => {

      sessionStorage.removeItem(
        "verifiedPasswordResetChallengeGroupId"
      );


      sessionStorage.removeItem(
        "passwordResetChallengeGroupId"
      );


      sessionStorage.removeItem(
        "passwordResetMaskedEmail"
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

                Create a strong new
                password for your account.

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

                Your email verification is complete.
                Create a new password to securely
                regain access to your MiniBank account.

              </p>

            </div>


            {/* PASSWORD SECURITY BOX */}

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

                    Strong Password

                  </h3>


                  <p
                    className="
                      mt-1
                      text-xs
                      text-blue-100
                    "
                  >

                    Protect your banking account

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

                    <Check size={16} />

                  </div>


                  <p className="text-sm text-blue-50">

                    8 to 10 characters

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

                    <Check size={16} />

                  </div>


                  <p className="text-sm text-blue-50">

                    Uppercase and lowercase letters

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

                    <Check size={16} />

                  </div>


                  <p className="text-sm text-blue-50">

                    Number and special character

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

                    <Check size={16} />

                  </div>


                  <p className="text-sm text-blue-50">

                    No whitespace

                  </p>

                </div>

              </div>

            </div>

          </div>


          {/* ============================================
              RIGHT PANEL
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


              {/* ========================================
                  SUCCESS SCREEN
              ======================================== */}

              {
                success
                ? (

                  <div className="text-center">


                    <div
                      className="
                        mx-auto
                        mb-6
                        flex
                        h-20
                        w-20
                        items-center
                        justify-center
                        rounded-full
                        bg-emerald-50
                        text-emerald-600
                      "
                    >

                      <CheckCircle2
                        size={42}
                      />

                    </div>


                    <p
                      className="
                        mb-2
                        text-sm
                        font-semibold
                        uppercase
                        tracking-wider
                        text-emerald-600
                      "
                    >

                      Password Updated

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

                      Password Reset Successful

                    </h2>


                    <div
                      className="
                        mt-6
                        rounded-xl
                        border
                        border-emerald-200
                        bg-emerald-50
                        px-5
                        py-4
                        text-sm
                        font-medium
                        text-emerald-700
                      "
                    >

                      {success}

                    </div>


                    <p
                      className="
                        mt-5
                        text-sm
                        leading-6
                        text-slate-500
                      "
                    >

                      You can now login to your
                      MiniBank account using your
                      new password.

                    </p>


                    <button

                      type="button"

                      onClick={() =>
                        navigate(
                          "/login"
                        )
                      }

                      className="
                        mt-8
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
                      "
                    >

                      Back to Login

                    </button>


                    <div
                      className="
                        mt-6
                        rounded-xl
                        bg-slate-50
                        px-4
                        py-3
                      "
                    >

                      <p
                        className="
                          text-xs
                          leading-5
                          text-slate-500
                        "
                      >

                        For your security, all previous
                        active sessions may no longer be valid.
                        Please login again with your new password.

                      </p>

                    </div>

                  </div>

                )
                : (

                  <>

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

                          Secure Password Recovery

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

                        Create New Password

                      </h2>


                      <p
                        className="
                          mt-3
                          text-sm
                          leading-6
                          text-slate-500
                        "
                      >

                        Create a secure new password
                        for your MiniBank account.

                      </p>

                    </div>


                    {/* ==================================
                        FORM
                    ================================== */}

                    <form
                      onSubmit={
                        handleResetPassword
                      }
                      className="space-y-5"
                    >


                      {/* ================================
                          NEW PASSWORD
                      ================================ */}

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

                            maxLength={10}

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


                      {/* ================================
                          CONFIRM PASSWORD
                      ================================ */}

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

                            maxLength={10}

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


                      {/* ================================
                          PASSWORD REQUIREMENTS
                      ================================ */}

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


                          <div className="flex items-center gap-2">

                            <Check
                              size={15}
                              className="shrink-0 text-blue-600"
                            />

                            <span className="text-xs text-slate-600">

                              8 to 10 characters

                            </span>

                          </div>


                          <div className="flex items-center gap-2">

                            <Check
                              size={15}
                              className="shrink-0 text-blue-600"
                            />

                            <span className="text-xs text-slate-600">

                              One uppercase letter

                            </span>

                          </div>


                          <div className="flex items-center gap-2">

                            <Check
                              size={15}
                              className="shrink-0 text-blue-600"
                            />

                            <span className="text-xs text-slate-600">

                              One lowercase letter

                            </span>

                          </div>


                          <div className="flex items-center gap-2">

                            <Check
                              size={15}
                              className="shrink-0 text-blue-600"
                            />

                            <span className="text-xs text-slate-600">

                              One number

                            </span>

                          </div>


                          <div className="flex items-center gap-2">

                            <Check
                              size={15}
                              className="shrink-0 text-blue-600"
                            />

                            <span className="text-xs text-slate-600">

                              One special character

                            </span>

                          </div>


                          <div className="flex items-center gap-2">

                            <Check
                              size={15}
                              className="shrink-0 text-blue-600"
                            />

                            <span className="text-xs text-slate-600">

                              No whitespace

                            </span>

                          </div>

                        </div>

                      </div>


                      {/* ================================
                          ERROR
                      ================================ */}

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


                      {/* ================================
                          RESET BUTTON
                      ================================ */}

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
                            ? "Resetting Password..."
                            : "Reset Password"
                        }

                      </button>


                      {/* ================================
                          CANCEL
                      ================================ */}

                      <button

                        type="button"

                        onClick={
                          handleCancel
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

                        Cancel Password Reset

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

                        Never reuse a password that you
                        believe may have been compromised.

                      </p>

                    </div>

                  </>

                )
              }

            </div>

          </div>

        </div>

      </div>

    </PublicAuthLayout>

  );

}


export default ResetPasswordPage;