// import { useState } from "react";
// import { useNavigate } from "react-router-dom";


// import {
//   setupTransactionPin,
// } from "../../../services/authService";

// import {
//   saveTokens,
// } from "../../../utils/tokenStorage";

// import "./SetupPinPage.css";


// function SetupPinPage() {
//    // =========================================
//   // NAVIGATION
//   // =========================================

//   const navigate = useNavigate();


//   // =========================================
//   // STATE
//   // =========================================

//   const [pin, setPin] = useState("");
//   const [confirmPin, setConfirmPin] = useState("");

//   const [showPin, setShowPin] = useState(false);
//   const [showConfirmPin, setShowConfirmPin] = useState(false);

//   const [error, setError] = useState("");
//   const [message, setMessage] = useState("");

//   const [loading, setLoading] = useState(false);
//   const [completed, setCompleted] = useState(false);

// // =========================================
//   // SETUP TRANSACTION PIN
//   // =========================================

//   const handleSetupPin = async (
//     e: React.FormEvent
//   ) => {

//     e.preventDefault();

//     setError("");
//     setMessage("");


//     // =====================================
//     // VALIDATION
//     // =====================================

//     if (!pin || !confirmPin) {

//       setError(
//         "Please fill in all PIN fields."
//       );

//       return;
//     }


//     if (!/^\d{6}$/.test(pin)) {

//       setError(
//         "Transaction PIN must be exactly 6 digits."
//       );

//       return;
//     }


//     if (pin !== confirmPin) {

//       setError(
//         "PINs do not match."
//       );

//       return;
//     }


//     // =====================================
//     // CHALLENGE GROUP ID
//     // =====================================

//     const challengeGroupId =
//       sessionStorage.getItem(
//         "challengeGroupId"
//       );


//     if (!challengeGroupId) {

//       setError(
//         "Login session is missing. Please login again."
//       );

//       return;
//     }


//     // =====================================
//     // API CALL
//     // =====================================

//     try {

//       setLoading(true);


//       const response =
//         await setupTransactionPin({

//           challengeGroupId:
//             challengeGroupId,

//           pin:
//             pin,

//           confirmPin:
//             confirmPin,

//         });


//       // =====================================
//       // SAVE JWT TOKENS
//       // =====================================

//       if (
//         response.accessToken &&
//         response.refreshToken
//       ) {

//         saveTokens(
//           response.accessToken,
//           response.refreshToken
//         );

//       }


//       // First-login flow finished
//       sessionStorage.removeItem(
//         "challengeGroupId"
//       );

//       sessionStorage.removeItem(
//         "maskedEmail"
//       );


//       setCompleted(true);

//       setMessage(
//         response.message ||
//         "First login security setup completed successfully."
//       );


//       // Clear PIN fields
//       setPin("");
//       setConfirmPin("");


//     } catch (error: any) {

//       setError(
//         error.response?.data?.message ||
//         "Transaction PIN setup failed."
//       );


//     } finally {

//       setLoading(false);

//     }
//   };


//   return (

//     <div className="setup-pin-page">

//       <div className="setup-pin-card">


//         {/* ================= LEFT SIDE ================= */}

//         <div className="setup-pin-brand-panel">

//           <div className="setup-pin-brand-content">

//             <h1>
//               MiniBank
//             </h1>

//             <h3>
//               Transaction Security
//             </h3>

//             <p>
//               Set up your secure transaction PIN
//               to protect your banking transactions.
//             </p>

//           </div>


//           <div className="pin-security-box">

//             <div className="pin-shield-icon">
//               ✓
//             </div>

//             <h2>
//               Secure PIN
//             </h2>

//             <p>
//               Your transaction PIN must contain
//               exactly 6 digits.
//             </p>

//             <p>
//               Never share your PIN with anyone.
//             </p>

//           </div>

//         </div>


//         {/* ================= RIGHT SIDE ================= */}

//         <div className="setup-pin-form-panel">

//           <div className="setup-pin-form-wrapper">


//             <h2>
//               Setup Transaction PIN
//             </h2>


//             <p className="setup-pin-subtitle">

//               Create your personal 6-digit PIN
//               before continuing.

//             </p>


//             <form
//               onSubmit={handleSetupPin}
//             >


//               {/* TRANSACTION PIN */}

//               <div className="pin-form-group">

//                 <label>
//                   Transaction PIN
//                 </label>


//                 <div className="pin-input-wrapper">

//                   <input
//                     type={
//                       showPin
//                         ? "text"
//                         : "password"
//                     }
//                     inputMode="numeric"
//                     maxLength={6}
//                     value={pin}
//                     disabled={completed}
//                     onChange={(e) =>
//                       setPin(
//                         e.target.value.replace(
//                           /\D/g,
//                           ""
//                         )
//                       )
//                     }
//                     placeholder="Enter 6-digit PIN"
//                   />


//                   <button
//                     type="button"
//                     className="pin-toggle"
//                     disabled={completed}
//                     onClick={() =>
//                       setShowPin(
//                         (prev) => !prev
//                       )
//                     }
//                     aria-label={
//                       showPin
//                         ? "Hide PIN"
//                         : "Show PIN"
//                     }
//                   >

//                     {showPin ? (

//                       <svg
//                         viewBox="0 0 24 24"
//                         fill="none"
//                         stroke="currentColor"
//                         strokeWidth="2"
//                         strokeLinecap="round"
//                         strokeLinejoin="round"
//                       >
//                         <path d="M3 3l18 18" />
//                         <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
//                         <path d="M9.9 4.2A10.7 10.7 0 0 1 12 4c5 0 9 5 9 8a10.2 10.2 0 0 1-2.1 3.5" />
//                         <path d="M6.6 6.6C4.4 8 3 10.2 3 12c0 3 4 8 9 8a9.8 9.8 0 0 0 3.4-.6" />
//                       </svg>

//                     ) : (

//                       <svg
//                         viewBox="0 0 24 24"
//                         fill="none"
//                         stroke="currentColor"
//                         strokeWidth="2"
//                         strokeLinecap="round"
//                         strokeLinejoin="round"
//                       >
//                         <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
//                         <circle
//                           cx="12"
//                           cy="12"
//                           r="3"
//                         />
//                       </svg>

//                     )}

//                   </button>

//                 </div>

//               </div>


//               {/* CONFIRM PIN */}

//               <div className="pin-form-group">

//                 <label>
//                   Confirm PIN
//                 </label>


//                 <div className="pin-input-wrapper">

//                   <input
//                     type={
//                       showConfirmPin
//                         ? "text"
//                         : "password"
//                     }
//                     inputMode="numeric"
//                     maxLength={6}
//                     value={confirmPin}
//                     disabled={completed}
//                     onChange={(e) =>
//                       setConfirmPin(
//                         e.target.value.replace(
//                           /\D/g,
//                           ""
//                         )
//                       )
//                     }
//                     placeholder="Confirm 6-digit PIN"
//                   />


//                   <button
//                     type="button"
//                     className="pin-toggle"
//                     disabled={completed}
//                     onClick={() =>
//                       setShowConfirmPin(
//                         (prev) => !prev
//                       )
//                     }
//                     aria-label={
//                       showConfirmPin
//                         ? "Hide confirm PIN"
//                         : "Show confirm PIN"
//                     }
//                   >

//                     {showConfirmPin ? (

//                       <svg
//                         viewBox="0 0 24 24"
//                         fill="none"
//                         stroke="currentColor"
//                         strokeWidth="2"
//                         strokeLinecap="round"
//                         strokeLinejoin="round"
//                       >
//                         <path d="M3 3l18 18" />
//                         <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
//                         <path d="M9.9 4.2A10.7 10.7 0 0 1 12 4c5 0 9 5 9 8a10.2 10.2 0 0 1-2.1 3.5" />
//                         <path d="M6.6 6.6C4.4 8 3 10.2 3 12c0 3 4 8 9 8a9.8 9.8 0 0 0 3.4-.6" />
//                       </svg>

//                     ) : (

//                       <svg
//                         viewBox="0 0 24 24"
//                         fill="none"
//                         stroke="currentColor"
//                         strokeWidth="2"
//                         strokeLinecap="round"
//                         strokeLinejoin="round"
//                       >
//                         <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
//                         <circle
//                           cx="12"
//                           cy="12"
//                           r="3"
//                         />
//                       </svg>

//                     )}

//                   </button>

//                 </div>

//               </div>


//               {/* PIN RULE */}

//               <div className="pin-rule-box">

//                 <p>
//                   PIN requirements
//                 </p>

//                 <span>
//                   • Exactly 6 digits
//                 </span>

//                 <span>
//                   • Numbers only
//                 </span>

//                 <span>
//                   • PIN and Confirm PIN must match
//                 </span>

//               </div>


//               {/* ERROR */}

//               {error && (

//                 <div className="setup-pin-error">

//                   {error}

//                 </div>

//               )}


//               {/* SUCCESS */}

//               {message && (

//                 <div className="setup-pin-success">

//                   {message}

//                 </div>

//               )}


//               {/* BUTTON */}

//               <button
//                 type="submit"
//                 className="setup-pin-button"
//                 disabled={
//                   loading ||
//                   completed
//                 }
//               >

//                 {loading
//                   ? "Setting PIN..."
//                   : completed
//                   ? "PIN Setup Completed"
//                   : "Setup PIN"}

//               </button>


//             </form>

//           </div>

//         </div>

//       </div>

//     </div>
//   );
// }


// export default SetupPinPage;

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
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";

import {
  setupTransactionPin,
} from "../../../services/authService";

import {
  saveTokens,
} from "../../../utils/tokenStorage";

import PublicAuthLayout
  from "../components/PublicAuthLayout";


function SetupPinPage() {

  // =========================================
  // NAVIGATION
  // =========================================

  const navigate =
    useNavigate();


  // =========================================
  // STATE
  // =========================================

  const [
    pin,
    setPin,
  ] = useState("");


  const [
    confirmPin,
    setConfirmPin,
  ] = useState("");


  const [
    showPin,
    setShowPin,
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
    message,
    setMessage,
  ] = useState("");


  const [
    loading,
    setLoading,
  ] = useState(false);


  // =========================================
  // SETUP TRANSACTION PIN
  // =========================================

  const handleSetupPin = async (
    e: FormEvent
  ) => {

    e.preventDefault();


    setError("");

    setMessage("");


    // =====================================
    // VALIDATION
    // =====================================

    if (
      !pin
      ||
      !confirmPin
    ) {

      setError(
        "Please fill in all PIN fields."
      );

      return;

    }


    if (
      !/^\d{6}$/.test(
        pin
      )
    ) {

      setError(
        "Transaction PIN must be exactly 6 digits."
      );

      return;

    }


    if (
      pin !== confirmPin
    ) {

      setError(
        "PINs do not match."
      );

      return;

    }


    // =====================================
    // GET CHALLENGE GROUP ID
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


      const response =
        await setupTransactionPin({

          challengeGroupId:
            challengeGroupId,

          pin:
            pin,

          confirmPin:
            confirmPin,

        });


      // =====================================
      // CHECK TOKENS
      // =====================================

      if (
        !response.accessToken
        ||
        !response.refreshToken
      ) {

        setError(
          "PIN setup completed, but authentication tokens were not received."
        );

        return;

      }


      // =====================================
      // SAVE JWT TOKENS
      // =====================================

      saveTokens(
        response.accessToken,
        response.refreshToken
      );


      // =====================================
      // FIRST LOGIN FLOW FINISHED
      // CLEAR TEMPORARY DATA
      // =====================================

      sessionStorage.removeItem(
        "challengeGroupId"
      );


      sessionStorage.removeItem(
        "maskedEmail"
      );


      // =====================================
      // CLEAR PIN FIELDS
      // =====================================

      setPin("");

      setConfirmPin("");


      // =====================================
      // GO TO DASHBOARD
      // =====================================

      navigate(
        "/dashboard",
        {
          replace: true,
        }
      );


    } catch (
      error: any
    ) {

      setError(

        error.response?.data?.message
        ||
        "Transaction PIN setup failed."

      );


    } finally {

      setLoading(
        false
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
            min-h-[640px]
            md:grid-cols-[0.9fr_1.1fr]
          "
        >


          {/* ============================================
              LEFT SECURITY PANEL
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

                You're almost ready
                to start banking securely.

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

                Complete the final security step
                by creating your personal
                Transaction PIN.

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

                  <LockKeyhole
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

                    Transaction Security

                  </h3>


                  <p
                    className="
                      mt-1
                      text-xs
                      text-blue-100
                    "
                  >

                    Final security setup step

                  </p>

                </div>

              </div>


              <div className="space-y-4">


                {/* PASSWORD COMPLETE */}

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

                    Password setup completed

                  </p>

                </div>


                {/* PIN SETUP */}

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
                      bg-white/15
                      text-xs
                      font-bold
                      text-white
                    "
                  >

                    2

                  </div>


                  <p className="text-sm text-blue-50">

                    Create your Transaction PIN

                  </p>

                </div>


                {/* SECURE TRANSACTIONS */}

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

                    Protect secure banking transactions

                  </p>

                </div>

              </div>

            </div>

          </div>


          {/* ============================================
              RIGHT PIN SETUP PANEL
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

                    Step 2 of 2

                  </span>

                </div>


                <div
                  className="
                    flex
                    items-center
                    gap-3
                  "
                >


                  {/* STEP 1 COMPLETE */}

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
                        bg-emerald-500
                        text-white
                      "
                    >

                      <Check
                        size={15}
                      />

                    </div>


                    <span
                      className="
                        text-xs
                        font-semibold
                        text-emerald-700
                        sm:text-sm
                      "
                    >

                      Password

                    </span>

                  </div>


                  {/* PROGRESS LINE */}

                  <div
                    className="
                      h-px
                      flex-1
                      bg-blue-300
                    "
                  />


                  {/* STEP 2 ACTIVE */}

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

                      2

                    </div>


                    <span
                      className="
                        text-xs
                        font-semibold
                        text-blue-700
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

                  Transaction Security

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

                  Setup Transaction PIN

                </h2>


                <p
                  className="
                    mt-3
                    text-sm
                    leading-6
                    text-slate-500
                  "
                >

                  Create your personal 6-digit
                  Transaction PIN to authorize
                  secure banking transactions.

                </p>

              </div>


              {/* ========================================
                  FORM
              ======================================== */}

              <form
                onSubmit={
                  handleSetupPin
                }
                className="space-y-5"
              >


                {/* ======================================
                    TRANSACTION PIN
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

                    Transaction PIN

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
                        showPin
                          ? "text"
                          : "password"
                      }

                      inputMode="numeric"

                      maxLength={6}

                      value={
                        pin
                      }

                      disabled={
                        loading
                      }

                      onChange={(e) =>
                        setPin(
                          e.target.value.replace(
                            /\D/g,
                            ""
                          )
                        )
                      }

                      placeholder="Enter 6-digit PIN"

                      autoComplete="new-password"

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

                      disabled={
                        loading
                      }

                      onClick={() =>
                        setShowPin(
                          (prev) =>
                            !prev
                        )
                      }

                      aria-label={
                        showPin
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
                        showPin
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
                    CONFIRM PIN
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

                      maxLength={6}

                      value={
                        confirmPin
                      }

                      disabled={
                        loading
                      }

                      onChange={(e) =>
                        setConfirmPin(
                          e.target.value.replace(
                            /\D/g,
                            ""
                          )
                        )
                      }

                      placeholder="Confirm 6-digit PIN"

                      autoComplete="new-password"

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

                      disabled={
                        loading
                      }

                      onClick={() =>
                        setShowConfirmPin(
                          (prev) =>
                            !prev
                        )
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


                {/* ======================================
                    PIN REQUIREMENTS
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

                    PIN Requirements

                  </p>


                  <div className="space-y-2">


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

                      <span className="text-xs text-slate-600">

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
                        size={15}
                        className="
                          shrink-0
                          text-blue-600
                        "
                      />

                      <span className="text-xs text-slate-600">

                        Numbers only

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

                      <span className="text-xs text-slate-600">

                        PIN and Confirm PIN must match

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
                    SUCCESS MESSAGE
                ====================================== */}

                {
                  message
                  &&
                  (

                    <div
                      className="
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
                    COMPLETE BUTTON
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
                        "Setting PIN..."
                      )
                      : (
                        <>
                          Complete Setup & Continue

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

                  Never share your Transaction PIN
                  with anyone, including bank staff.

                </p>

              </div>

            </div>

          </div>

        </div>

      </div>

    </PublicAuthLayout>

  );

}


export default SetupPinPage;