import {
  useState,
  type FormEvent,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  ArrowLeft,
  Clock3,
  Mail,
  ShieldCheck,
} from "lucide-react";

import {
  verifyPinResetOtp,
  resendPinResetOtp,
} from "../../../services/authService";


function PinResetOtpPage() {

  // ======================================================
  // NAVIGATION
  // ======================================================

  const navigate =
    useNavigate();


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


  const [
    challengeGroupId,
    setChallengeGroupId,
  ] = useState<string | null>(
    () =>
      sessionStorage.getItem(
        "pinResetChallengeGroupId"
      )
  );


  const [
    maskedEmail,
    setMaskedEmail,
  ] = useState<string | null>(
    () =>
      sessionStorage.getItem(
        "pinResetMaskedEmail"
      )
  );


  // ======================================================
  // VERIFY PIN RESET OTP
  // ======================================================

  const handleVerifyOtp = async (
    e: FormEvent
  ) => {

    e.preventDefault();


    setError("");

    setMessage("");


    // ----------------------------------------------
    // 1. Challenge must exist
    // ----------------------------------------------

    if (
      !challengeGroupId
    ) {

      setError(
        "PIN reset session is missing. Please start again."
      );

      return;

    }


    // ----------------------------------------------
    // 2. OTP must be exactly 6 digits
    // ----------------------------------------------

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


      // ----------------------------------------------
      // 3. Verify OTP
      // ----------------------------------------------

      const response =
        await verifyPinResetOtp({

          challengeGroupId:
            challengeGroupId,

          otp:
            otp,

        });


      // ----------------------------------------------
      // 4. Backend must return verified challenge
      // ----------------------------------------------

      if (
        !response.verifiedChallengeGroupId
      ) {

        setError(
          "PIN reset verification information is missing."
        );

        return;

      }


      // ----------------------------------------------
      // 5. Save VERIFIED challenge
      // ----------------------------------------------

      sessionStorage.setItem(
        "verifiedPinResetChallengeGroupId",
        response.verifiedChallengeGroupId
      );


      // ----------------------------------------------
      // 6. Old OTP challenge no longer needed
      // ----------------------------------------------

      sessionStorage.removeItem(
        "pinResetChallengeGroupId"
      );


      // ----------------------------------------------
      // 7. Go to new PIN page
      // ----------------------------------------------

      navigate(
        "/pin-reset/new-pin"
      );


    } catch (
      err: any
    ) {

      setError(

        err.response?.data?.message
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
  // RESEND PIN RESET OTP
  // ======================================================

  const handleResendOtp =
    async () => {

      setError("");

      setMessage("");


      if (
        !challengeGroupId
      ) {

        setError(
          "PIN reset session is missing. Please start again."
        );

        return;

      }


      try {

        setResending(
          true
        );


        const response =
          await resendPinResetOtp({

            challengeGroupId:
              challengeGroupId,

          });


        // ----------------------------------------------
        // Backend normally keeps same challengeGroupId
        // but update it if backend returns one
        // ----------------------------------------------

        if (
          response.challengeGroupId
        ) {

          setChallengeGroupId(
            response.challengeGroupId
          );


          sessionStorage.setItem(
            "pinResetChallengeGroupId",
            response.challengeGroupId
          );

        }


        // ----------------------------------------------
        // Update masked email if returned
        // ----------------------------------------------

        if (
          response.maskedEmail
        ) {

          setMaskedEmail(
            response.maskedEmail
          );


          sessionStorage.setItem(
            "pinResetMaskedEmail",
            response.maskedEmail
          );

        }


        // Old OTP input must be cleared

        setOtp("");


        setMessage(

          response.message
          ||
          "A new Transaction PIN reset OTP has been sent to your registered email."

        );


      } catch (
        err: any
      ) {

        setError(

          err.response?.data?.message
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
  // BACK TO PROFILE
  // ======================================================

  const handleBack =
    () => {

      sessionStorage.removeItem(
        "pinResetChallengeGroupId"
      );


      sessionStorage.removeItem(
        "pinResetMaskedEmail"
      );


      sessionStorage.removeItem(
        "verifiedPinResetChallengeGroupId"
      );


      navigate(
        "/profile"
      );

    };


  // ======================================================
  // UI
  // ======================================================

  return (

    <div
      className="
        min-h-full
        bg-[#F3F7FB]
        px-4
        py-8
        sm:px-6
        lg:px-10
      "
    >

      <div
        className="
          mx-auto
          w-full
          max-w-3xl
        "
      >


        {/* ============================================
            PAGE HEADING
        ============================================ */}

        <div
          className="
            mb-6
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

            Security Verification

          </p>


          <h1
            className="
              text-2xl
              font-bold
              tracking-tight
              text-[#08295C]
              sm:text-3xl
            "
          >

            Transaction PIN Reset

          </h1>


          <p
            className="
              mt-2
              text-sm
              leading-6
              text-slate-500
            "
          >

            Verify your identity before creating
            a new Transaction PIN.

          </p>

        </div>


        {/* ============================================
            MAIN CARD
        ============================================ */}

        <div
          className="
            overflow-hidden
            rounded-3xl
            border
            border-slate-200
            bg-white
            shadow-lg
            shadow-slate-200/60
          "
        >

          <div
            className="
              px-6
              py-8
              sm:px-10
              sm:py-10
            "
          >


            {/* SECURITY ICON */}

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

              <ShieldCheck
                size={31}
              />

            </div>


            {/* CARD HEADER */}

            <div
              className="
                mb-7
              "
            >

              <h2
                className="
                  text-2xl
                  font-bold
                  text-[#08295C]
                  sm:text-3xl
                "
              >

                Verify Transaction PIN Reset

              </h2>


              <p
                className="
                  mt-3
                  max-w-xl
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


            {/* ============================================
                FORM
            ============================================ */}

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

                autoComplete="one-time-code"

                maxLength={6}

                value={
                  otp
                }

                placeholder="000000"

                onChange={(e) => {

                  const value =
                    e.target.value
                      .replace(
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


              {/* OTP EXPIRY */}

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


              {/* ============================================
                  ERROR
              ============================================ */}

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


              {/* ============================================
                  SUCCESS MESSAGE
              ============================================ */}

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


              {/* ============================================
                  VERIFY BUTTON
              ============================================ */}

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


              {/* ============================================
                  RESEND
              ============================================ */}

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


              {/* ============================================
                  DIVIDER
              ============================================ */}

              <div
                className="
                  my-6
                  border-t
                  border-slate-100
                "
              />


              {/* ============================================
                  BACK TO PROFILE
              ============================================ */}

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

                Back to Profile

              </button>

            </form>


            {/* ============================================
                SECURITY NOTE
            ============================================ */}

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

                Never share your Transaction PIN
                or verification OTP with anyone.

              </p>

            </div>

          </div>

        </div>

      </div>

    </div>

  );

}


export default PinResetOtpPage;