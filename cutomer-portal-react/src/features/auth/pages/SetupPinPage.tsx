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
//               ACE Bank
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

import { Check, Clock3, Eye, EyeOff, LockKeyhole, ShieldCheck, WalletCards } from "lucide-react";

import {
  setupTransactionPin,
} from "../../../services/authService";

import {
  saveTokens,
} from "../../../utils/tokenStorage";

import { consumePendingPaymentRedirect } from "../utils/pendingPaymentRedirect";


import { AuthField, AuthCodeField, AuthNotice, AuthPinRules } from "../components/IndividualAuthUI";
import { authCodeInputClass } from "../components/IndividualAuthStyles";
import { EkarajAuthLayout } from "../components/EkarajAuthLayout";
import { ekarajPrimaryButtonClass } from "../components/EkarajAuthStyles";
import { IndividualSetupExpiredCard } from "../components/IndividualSetupExpiredCard";
import { clearIndividualSetupWindow, useIndividualSetupWindow } from "../utils/individualSetupWindow";

// Page-local sizing retains the shared field's single native input and six decorative cells.
const setupPinRowClass =
  "mx-auto flex max-w-[294px] items-center gap-2 [&>div]:min-w-0 [&>div]:max-w-[246px] [&>div>div]:gap-1 [&>div>div]:sm:gap-1.5 [&>div>div>span]:h-9 [&>div>div>span]:border-[#C6D5E3] [&>div>div>span]:text-lg [&>div>div>span]:text-[#1A365D] [&>div:focus-within>div>span]:ring-[#113E65] [&>div:focus-within>div>span]:border-[#113E65]";
const setupPinToggleClass =
  "flex h-11 w-10 shrink-0 items-center justify-center rounded-lg text-[#757575] transition-colors hover:bg-[#EAF2FA] hover:text-[#122E52] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#113E65] disabled:opacity-50 motion-reduce:transition-none";
const setupPinRulesClass =
  "[&>ul]:border-[#C6D5E3] [&>ul]:bg-[#EAF2FA] [&>ul]:p-2.5 [&>ul]:text-[#59697D]";

function SetupPinPage() {
  const setupWindow = useIndividualSetupWindow();

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

    const setupRequest = setupWindow.capture(challengeGroupId);
    if (!setupRequest) return;

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


      if (!setupWindow.canProceed(setupRequest)) return;

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

      clearIndividualSetupWindow(setupRequest);
      saveTokens(
        response.accessToken,
        response.refreshToken
      );

      const destination = consumePendingPaymentRedirect();


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
      // GO TO THE VALIDATED CHECKOUT OR DASHBOARD
      // =====================================

      navigate(
        destination,
        {
          replace: true,
        }
      );


    } catch (
      error: any
    ) {

      if (!setupWindow.canProceed(setupRequest) || setupWindow.handleExpiry(error, setupRequest)) return;

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

  if (setupWindow.expired) return <IndividualSetupExpiredCard />;

  return (
    <EkarajAuthLayout title="EKARAJ BANK | First Login — Set Transaction PIN">
      <section aria-label="First login PIN setup card" className="grid w-full max-w-[976px] rounded-3xl border border-[#CDC0A8] bg-[#F5F3EF] shadow-[0_18px_50px_-26px_rgba(18,46,82,0.3)] md:grid-cols-[0.92fr_1.08fr]">
        <aside className="relative hidden flex-col justify-between overflow-hidden rounded-l-[23px] bg-[#E5EAF0] text-[#1A365D] md:flex">
          <img src="/assets/ekaraj-building-reference.jpg" alt="" aria-hidden="true" className="pointer-events-none absolute bottom-0 right-0 h-[85%] w-[85%] object-cover object-[60%_70%] opacity-[0.1] [mask-image:radial-gradient(ellipse_at_75%_65%,#000_10%,transparent_80%)]" />
          <svg aria-hidden="true" focusable="false" viewBox="0 0 450 470" preserveAspectRatio="none" fill="none" className="pointer-events-none absolute inset-0 h-full w-full">
            <path d="M-70 85C95 35 120 300 330 285S500 215 520 150" stroke="#C6A15B" strokeWidth="0.8" strokeOpacity="0.35" />
            <path d="M-80 105C80 55 135 325 340 305S510 235 530 175" stroke="#C6A15B" strokeWidth="0.8" strokeOpacity="0.2" />
          </svg>
          <p className="relative px-6 pt-4 font-serif text-xl font-medium leading-7 text-[#1A365D] lg:px-7">Set your transaction PIN to add an extra layer of security to your account.</p>
          <div aria-hidden="true" className="relative flex min-h-0 flex-1 items-center justify-center px-6 py-2">
            <img src="/assets/ekaraj-crown-transparent.png" alt="" width={375} height={340} className="h-auto w-40 max-w-full object-contain" />
          </div>
          <div className="relative space-y-2.5 px-6 pb-4 pt-2 lg:px-7">
            {[
              { icon: WalletCards, title: "Secure Transactions", description: "Authorize payments with confidence" },
              { icon: ShieldCheck, title: "Enhanced Protection", description: "Keep your account safe" },
              { icon: Clock3, title: "Your Trusted Banking Partner", description: "Always by your side" },
            ].map(({ icon: Icon, title, description }) => (
              <div key={title} className="flex items-start gap-3">
                <Icon aria-hidden="true" size={20} className="mt-0.5 shrink-0 text-[#C6A15B]" />
                <div>
                  <p className="text-xs font-semibold leading-4">{title}</p>
                  <p className="mt-0.5 text-[11px] leading-4 text-[#627084]">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </aside>
        <section aria-label="Set your transaction PIN" className="flex min-w-0 items-center px-5 py-3 sm:px-8 md:px-7 lg:px-9">
          <div className="mx-auto w-full max-w-[392px]">
            <ol aria-label="Account security setup" className="mb-2 grid grid-cols-3">
              {["OTP Verification", "Change Password", "Set PIN"].map((label, index) => (
                <li key={label} aria-current={index === 2 ? "step" : undefined} className="relative text-center">
                  {index < 2 && <span aria-hidden="true" className="absolute left-1/2 top-3.5 h-px w-full bg-[#C6D5E3]" />}
                  <span className={`relative mx-auto flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${index === 2 ? "bg-[#113E65] text-white" : "bg-[#EAF2FA] text-[#113E65] ring-1 ring-inset ring-[#C6D5E3]"}`}>
                    {index < 2 ? <Check aria-hidden="true" size={14} /> : index + 1}
                  </span>
                  <span className={`relative mt-1 block text-[10px] leading-4 sm:text-[11px] ${index === 2 ? "font-semibold text-[#1A365D]" : "text-[#59697D]"}`}>
                    {label}{index < 2 && <span className="sr-only"> — Completed</span>}
                  </span>
                </li>
              ))}
            </ol>
            <div className="mb-2 text-center">
              <span aria-hidden="true" className="mx-auto mb-1 flex h-9 w-9 items-center justify-center rounded-full border border-[#C6D5E3] bg-[#EAF2FA] text-[#113E65]">
                <LockKeyhole size={20} strokeWidth={1.8} />
              </span>
              <h1 className="font-serif text-2xl font-medium leading-8 tracking-tight text-[#1A365D]">Set Your Transaction PIN</h1>
              <p className="mt-0.5 text-sm leading-5 text-[#59697D]">Create a 6-digit PIN to authorize your payments and transactions.</p>
            </div>
            <form onSubmit={handleSetupPin} className="space-y-2 [&_label]:text-[#1A365D] [&>[role=alert]]:my-1 [&>[role=alert]]:py-1.5">
              <AuthField label="New PIN" htmlFor="individual-setup-pin">
                <div className={setupPinRowClass}>
                  <AuthCodeField value={pin} masked={!showPin}>
                    <input
                      type={showPin ? "text" : "password"}
                      inputMode="numeric"
                      maxLength={6}
                      value={pin}
                      disabled={loading}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                      placeholder="Enter 6-digit PIN"
                      autoComplete="new-password"
                      id="individual-setup-pin"
                      className={authCodeInputClass}
                      aria-invalid={Boolean(error)}
                      aria-required={true}
                    />
                  </AuthCodeField>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => setShowPin((prev) => !prev)}
                    aria-label={showPin ? "Hide PIN" : "Show PIN"}
                    className={setupPinToggleClass}
                  >
                    {" "}
                    {showPin ? <EyeOff size={20} /> : <Eye size={20} />}{" "}
                  </button>
                </div>
              </AuthField>
              <AuthField label="Confirm PIN" htmlFor="individual-confirm-pin">
                <div className={setupPinRowClass}>
                  <AuthCodeField value={confirmPin} masked={!showConfirmPin}>
                    <input
                      type={showConfirmPin ? "text" : "password"}
                      inputMode="numeric"
                      maxLength={6}
                      value={confirmPin}
                      disabled={loading}
                      onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
                      placeholder="Confirm 6-digit PIN"
                      autoComplete="new-password"
                      id="individual-confirm-pin"
                      className={authCodeInputClass}
                      aria-invalid={Boolean(error)}
                      aria-required={true}
                    />
                  </AuthCodeField>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => setShowConfirmPin((prev) => !prev)}
                    aria-label={showConfirmPin ? "Hide confirm PIN" : "Show confirm PIN"}
                    className={setupPinToggleClass}
                  >
                    {" "}
                    {showConfirmPin ? <EyeOff size={20} /> : <Eye size={20} />}{" "}
                  </button>
                </div>
              </AuthField>
              <div className={setupPinRulesClass}>
                <AuthPinRules pin={pin} confirmPin={confirmPin} />
              </div>
              <AuthNotice error={error} />
              <AuthNotice message={message} />
              <button
                type="submit"
                disabled={loading}
                className={ekarajPrimaryButtonClass}
                aria-busy={loading}
              >
                {loading && (
                  <span
                    aria-hidden="true"
                    className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-[#122E52]/25 border-t-[#122E52] motion-reduce:animate-none"
                  />
                )}{" "}
                {loading ? (
                  "Setting PIN..."
                ) : (
                  <>
                    Complete Setup & Continue
                  </>
                )}{" "}
              </button>
            </form>
            <div className="mt-2 flex items-start gap-2.5 rounded-xl border border-[#C6D5E3] bg-[#EAF2FA] p-2">
              <ShieldCheck aria-hidden="true" size={20} className="mt-0.5 shrink-0 text-[#113E65]" />
              <div>
                <p className="text-xs font-semibold leading-4 text-[#1A365D]">Keep your PIN private</p>
                <p className="mt-0.5 text-xs leading-4 text-[#59697D]">Do not share your PIN with anyone. You will need it to confirm payments and sensitive transactions.</p>
              </div>
            </div>
          </div>
        </section>
      </section>
    </EkarajAuthLayout>
  );

}


export default SetupPinPage;
