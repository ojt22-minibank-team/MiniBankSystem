import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Clock3 } from "lucide-react";
import { resendCorporateOtp, verifyCorporateOtp } from "../api/auth";
import CorporateAuthCard from "../components/CorporateAuthCard";
import { CorporateNotice, CorporateSubmit } from "../components/CorporateForm";
import { useCorporateAction } from "../hooks/useCorporateAction";
import { corporateSetupRoute, getCorporateChallenge, getCorporateSetupStep, hasCorporateSession } from "../utils/storage";

export default function CorporateOtpPage() {
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState("");
  const action = useCorporateAction();
  const navigate = useNavigate();
  // Check authenticated state first: verification deliberately clears the challenge.
  if (hasCorporateSession()) return <Navigate to="/corporate/auth-success" replace />;
  if (!getCorporateChallenge()) return <Navigate to="/corporate/login" replace />;
  if (getCorporateSetupStep()) return <Navigate to={corporateSetupRoute()} replace />;

  function verify(event: FormEvent) {
    event.preventDefault();
    if (!/^\d{6}$/.test(otp)) { action.setError("OTP must be exactly 6 digits."); return; }
    void action.run(async () => {
      setMessage("");
      const response = await verifyCorporateOtp(otp);
      await navigate(response.firstLogin ? corporateSetupRoute() : "/corporate/auth-success", { replace: true });
    });
  }
  function resend() {
    void action.run(async () => {
      setMessage("");
      const response = await resendCorporateOtp();
      setOtp(""); setMessage(response.message || "A new OTP has been sent to your registered email.");
    });
  }

  return <CorporateAuthCard title="Verify your identity" description="Enter the 6-digit verification code sent to your registered Corporate email.">
    <form onSubmit={verify} noValidate className="space-y-5">
      <div><label htmlFor="corporate-otp" className="mb-2 block text-sm font-semibold text-slate-700">Verification Code</label>
        <input id="corporate-otp" name="corporate-otp" type="text" inputMode="numeric" maxLength={6} autoComplete="one-time-code" required value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ""))} disabled={action.busy} placeholder="000000" className="w-full rounded-xl border border-slate-300 bg-white px-5 py-4 text-center text-2xl font-semibold tracking-[0.55em] text-slate-800 outline-none transition placeholder:text-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50" />
        <p className="mt-3 flex items-center gap-2 text-xs text-slate-400"><Clock3 size={15} />The code is valid for 5 minutes.</p>
      </div>
      <CorporateNotice error message={action.error} /><CorporateNotice message={message} />
      <CorporateSubmit variant="verification" busy={action.busy}>Verify OTP</CorporateSubmit>
    </form>
    <p className="mt-6 text-center text-sm text-slate-500">Didn’t receive the code? <button type="button" onClick={resend} disabled={action.busy} className="font-semibold text-blue-600 transition hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50">Resend OTP</button></p>
    <p className="mt-7 rounded-xl bg-slate-50 px-4 py-3 text-center text-xs leading-5 text-slate-500">MiniBank will never ask you to share your OTP by phone, message, or email.</p>
    <Link to="/corporate/login" replace className="mt-5 block text-center text-sm font-semibold text-blue-600">Return to Corporate Login</Link>
  </CorporateAuthCard>;
}
