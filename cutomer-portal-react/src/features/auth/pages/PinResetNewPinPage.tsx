import {
  useState,
  type FormEvent,
} from "react";

import {
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
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

  const [newPin, setNewPin] =
    useState("");


  const [confirmPin, setConfirmPin] =
    useState("");


  const [showNewPin, setShowNewPin] =
    useState(false);


  const [
    showConfirmPin,
    setShowConfirmPin,
  ] = useState(false);


  const [error, setError] =
    useState("");


  const [loading, setLoading] =
    useState(false);


  const [completed, setCompleted] =
    useState(false);


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
      newPin !== confirmPin
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


    } catch (err: any) {

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

      <div className="flex min-h-screen items-center justify-center bg-[#F5F7FB] px-4">

        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">

          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">

            <CheckCircle2
              size={34}
              className="text-emerald-600"
            />

          </div>


          <h1 className="text-2xl font-bold text-[#08295C]">

            Transaction PIN Reset

          </h1>


          <p className="mt-3 text-sm leading-6 text-slate-500">

            Your Transaction PIN has been reset successfully.

          </p>


          <p className="mt-1 text-sm text-slate-500">

            You can now use your new PIN for secure transactions.

          </p>


          <button

            type="button"

            onClick={() =>
              navigate(
                "/profile"
              )
            }

            className="mt-7 w-full rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
          >

            Back to Profile

          </button>

        </div>

      </div>

    );

  }


  // ======================================================
  // MAIN UI
  // ======================================================

  return (

    <div className="flex min-h-screen items-center justify-center bg-[#F5F7FB] px-4 py-10">

      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">


        {/* HEADER */}

        <div className="mb-7 text-center">

          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50">

            <ShieldCheck
              size={30}
              className="text-blue-600"
            />

          </div>


          <h1 className="text-2xl font-bold text-[#08295C]">

            Create New Transaction PIN

          </h1>


          <p className="mt-2 text-sm leading-6 text-slate-500">

            Enter a new 6-digit Transaction PIN
            and confirm it below.

          </p>

        </div>


        <form
          onSubmit={
            handleResetPin
          }
        >


          {/* NEW PIN */}

          <div className="mb-5">

            <label className="mb-2 block text-sm font-semibold text-slate-700">

              New Transaction PIN

            </label>


            <div className="relative">

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

                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-12 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
              />


              <button

                type="button"

                onClick={() =>
                  setShowNewPin(
                    (prev) => !prev
                  )
                }

                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
              >

                {
                  showNewPin
                    ? (
                      <EyeOff
                        size={19}
                      />
                    )
                    : (
                      <Eye
                        size={19}
                      />
                    )
                }

              </button>

            </div>

          </div>


          {/* CONFIRM PIN */}

          <div className="mb-5">

            <label className="mb-2 block text-sm font-semibold text-slate-700">

              Confirm Transaction PIN

            </label>


            <div className="relative">

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

                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-12 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
              />


              <button

                type="button"

                onClick={() =>
                  setShowConfirmPin(
                    (prev) => !prev
                  )
                }

                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
              >

                {
                  showConfirmPin
                    ? (
                      <EyeOff
                        size={19}
                      />
                    )
                    : (
                      <Eye
                        size={19}
                      />
                    )
                }

              </button>

            </div>

          </div>


          {/* PIN RULE */}

          <div className="mb-5 rounded-xl bg-blue-50 px-4 py-3">

            <p className="text-xs leading-5 text-blue-700">

              Your Transaction PIN must contain exactly 6 numeric digits.

            </p>

          </div>


          {/* ERROR */}

          {
            error
            &&
            (

              <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">

                {error}

              </div>

            )
          }


          {/* RESET BUTTON */}

          <button

            type="submit"

            disabled={
              loading
            }

            className="w-full rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >

            {
              loading
                ? "Resetting PIN..."
                : "Reset Transaction PIN"
            }

          </button>


          {/* CANCEL */}

          <button

            type="button"

            onClick={
              handleCancel
            }

            disabled={
              loading
            }

            className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >

            Cancel

          </button>

        </form>

      </div>

    </div>

  );

}


export default PinResetNewPinPage;