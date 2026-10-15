import {
  useState,
  type FormEvent,
} from "react";

import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";

import {
  useNavigate,
} from "react-router-dom";

import {
  confirmPinReset,
} from "../../../services/authService";


function PinResetNewPinPage() {

  const navigate =
    useNavigate();


  // ======================================================
  // STATE
  // ======================================================

  const [
    newPin,
    setNewPin,
  ] = useState("");


  const [
    confirmPin,
    setConfirmPin,
  ] = useState("");


  const [
    showNewPin,
    setShowNewPin,
  ] = useState(false);


  const [
    showConfirmPin,
    setShowConfirmPin,
  ] = useState(false);


  const [
    error,
    setError,
  ] = useState("");


  const [
    loading,
    setLoading,
  ] = useState(false);


  const [
    completed,
    setCompleted,
  ] = useState(false);


  // ======================================================
  // GET VERIFIED PIN RESET CHALLENGE
  // ======================================================

  const verifiedChallengeGroupId =
    sessionStorage.getItem(
      "verifiedPinResetChallengeGroupId"
    );


  // ======================================================
  // RESET PIN
  // ======================================================

  const handleResetPin = async (
    e: FormEvent
  ) => {

    e.preventDefault();


    setError("");


    // ----------------------------------------------
    // 1. VERIFIED CHALLENGE REQUIRED
    // ----------------------------------------------

    if (
      !verifiedChallengeGroupId
      ||
      verifiedChallengeGroupId === "undefined"
      ||
      verifiedChallengeGroupId === "null"
    ) {

      setError(
        "PIN reset authorization is missing. Please start again."
      );

      return;
    }


    // ----------------------------------------------
    // 2. REQUIRED FIELDS
    // ----------------------------------------------

    if (
      !newPin
      ||
      !confirmPin
    ) {

      setError(
        "Please enter the new PIN and confirm PIN."
      );

      return;
    }


    // ----------------------------------------------
    // 3. EXACTLY 6 DIGITS
    // ----------------------------------------------

    if (
      !/^\d{6}$/.test(
        newPin
      )
    ) {

      setError(
        "Transaction PIN must be exactly 6 digits."
      );

      return;
    }


    // ----------------------------------------------
    // 4. CONFIRM PIN MUST MATCH
    // ----------------------------------------------

    if (
      newPin !==
      confirmPin
    ) {

      setError(
        "New PIN and confirm PIN do not match."
      );

      return;
    }


    try {

      setLoading(
        true
      );


      // ----------------------------------------------
      // 5. CALL BACKEND
      // POST /auth/pin-reset/confirm
      // ----------------------------------------------

      await confirmPinReset({

        verifiedChallengeGroupId:
          verifiedChallengeGroupId,

        newPin:
          newPin,

        confirmPin:
          confirmPin,

      });


      // ----------------------------------------------
      // 6. CLEAR RESET DATA
      // ----------------------------------------------

      sessionStorage.removeItem(
        "verifiedPinResetChallengeGroupId"
      );


      sessionStorage.removeItem(
        "pinResetChallengeGroupId"
      );


      sessionStorage.removeItem(
        "pinResetMaskedEmail"
      );


      // ----------------------------------------------
      // 7. CLEAR FORM
      // ----------------------------------------------

      setNewPin("");

      setConfirmPin("");


      // ----------------------------------------------
      // 8. SHOW SUCCESS PAGE
      // ----------------------------------------------

      setCompleted(
        true
      );


    } catch (
      err: any
    ) {

      setError(

        err.response?.data?.message
        ||
        "Unable to reset Transaction PIN. Please try again."

      );


    } finally {

      setLoading(
        false
      );

    }

  };


  // ======================================================
  // CANCEL
  // ======================================================

  const handleCancel =
    () => {

      sessionStorage.removeItem(
        "verifiedPinResetChallengeGroupId"
      );


      sessionStorage.removeItem(
        "pinResetChallengeGroupId"
      );


      sessionStorage.removeItem(
        "pinResetMaskedEmail"
      );


      navigate(
        "/profile"
      );

    };


  // ======================================================
  // SUCCESS SCREEN
  // ======================================================

  if (
    completed
  ) {

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

          {/* PAGE HEADING */}

          <div className="mb-6">

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

              Security Updated

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

              Transaction PIN Security

            </h1>

          </div>


          {/* SUCCESS CARD */}

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
                py-10
                text-center
                sm:px-10
                sm:py-12
              "
            >

              {/* SUCCESS ICON */}

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

                PIN Updated

              </p>


              <h2
                className="
                  text-3xl
                  font-bold
                  tracking-tight
                  text-[#08295C]
                "
              >

                Transaction PIN Reset Successful

              </h2>


              <p
                className="
                  mx-auto
                  mt-4
                  max-w-lg
                  text-sm
                  leading-6
                  text-slate-500
                "
              >

                Your Transaction PIN has been reset
                successfully.

              </p>


              <p
                className="
                  mx-auto
                  mt-1
                  max-w-lg
                  text-sm
                  leading-6
                  text-slate-500
                "
              >

                You can now use your new PIN for
                secure transactions.

              </p>


              {/* SUCCESS INFO */}

              <div
                className="
                  mt-7
                  rounded-xl
                  border
                  border-emerald-200
                  bg-emerald-50
                  px-5
                  py-4
                "
              >

                <div
                  className="
                    flex
                    items-center
                    justify-center
                    gap-2
                    text-sm
                    font-medium
                    text-emerald-700
                  "
                >

                  <Check
                    size={18}
                  />

                  Your new Transaction PIN is ready to use.

                </div>

              </div>


              {/* BACK TO PROFILE */}

              <button

                type="button"

                onClick={() =>
                  navigate(
                    "/profile"
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

                Back to Profile

              </button>


              {/* SECURITY NOTE */}

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

                  Never share your Transaction PIN
                  with anyone, including bank staff.

                </p>

              </div>

            </div>

          </div>

        </div>

      </div>

    );

  }


  // ======================================================
  // MAIN UI
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

        <div className="mb-6">

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

            Transaction PIN Security

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

            Create New Transaction PIN

          </h1>


          <p
            className="
              mt-2
              text-sm
              leading-6
              text-slate-500
            "
          >

            Create a new 6-digit PIN for
            authorizing secure transactions.

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

            <div className="mb-7">

              <h2
                className="
                  text-2xl
                  font-bold
                  text-[#08295C]
                  sm:text-3xl
                "
              >

                Set Your New PIN

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

                Enter a new 6-digit Transaction PIN
                and confirm it below.

              </p>

            </div>


            {/* ============================================
                FORM
            ============================================ */}

            <form
              onSubmit={
                handleResetPin
              }
            >


              {/* ========================================
                  NEW PIN
              ======================================== */}

              <div className="mb-5">

                <label
                  className="
                    mb-2
                    block
                    text-sm
                    font-semibold
                    text-slate-700
                  "
                >

                  New Transaction PIN

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
                      showNewPin
                        ? "text"
                        : "password"
                    }

                    inputMode="numeric"

                    autoComplete="new-password"

                    maxLength={6}

                    value={
                      newPin
                    }

                    placeholder="Enter 6-digit PIN"

                    onChange={(e) => {

                      const value =
                        e.target.value.replace(
                          /\D/g,
                          ""
                        );


                      setNewPin(
                        value
                      );

                    }}

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
                      setShowNewPin(
                        (prev) =>
                          !prev
                      )
                    }

                    disabled={
                      loading
                    }

                    aria-label={
                      showNewPin
                        ? "Hide PIN"
                        : "Show PIN"
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
                      showNewPin
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


              {/* ========================================
                  CONFIRM PIN
              ======================================== */}

              <div className="mb-5">

                <label
                  className="
                    mb-2
                    block
                    text-sm
                    font-semibold
                    text-slate-700
                  "
                >

                  Confirm Transaction PIN

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
                      showConfirmPin
                        ? "text"
                        : "password"
                    }

                    inputMode="numeric"

                    autoComplete="new-password"

                    maxLength={6}

                    value={
                      confirmPin
                    }

                    placeholder="Re-enter 6-digit PIN"

                    onChange={(e) => {

                      const value =
                        e.target.value.replace(
                          /\D/g,
                          ""
                        );


                      setConfirmPin(
                        value
                      );

                    }}

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
                      setShowConfirmPin(
                        (prev) =>
                          !prev
                      )
                    }

                    disabled={
                      loading
                    }

                    aria-label={
                      showConfirmPin
                        ? "Hide confirm PIN"
                        : "Show confirm PIN"
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
                      showConfirmPin
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


              {/* ========================================
                  PIN REQUIREMENTS
              ======================================== */}

              <div
                className="
                  mb-5
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

                  PIN Requirements

                </p>


                <div
                  className="
                    space-y-2
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
                      size={16}
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

                      Exactly 6 digits

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
                      size={16}
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

                      Numbers only

                    </span>

                  </div>

                </div>

              </div>


              {/* ========================================
                  ERROR
              ======================================== */}

              {
                error
                &&
                (

                  <div
                    className="
                      mb-5
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


              {/* ========================================
                  RESET BUTTON
              ======================================== */}

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
                    ? "Resetting PIN..."
                    : "Reset Transaction PIN"
                }

              </button>


              {/* ========================================
                  CANCEL
              ======================================== */}

              <button

                type="button"

                onClick={
                  handleCancel
                }

                disabled={
                  loading
                }

                className="
                  mt-4
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

                Cancel and Back to Profile

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
                with anyone, including bank staff.

              </p>

            </div>

          </div>

        </div>

      </div>

    </div>

  );

}


export default PinResetNewPinPage;