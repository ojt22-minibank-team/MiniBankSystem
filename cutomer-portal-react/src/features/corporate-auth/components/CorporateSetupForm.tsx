import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { changeCorporatePassword, completeCorporateLogin, setupCorporatePin } from "../api/auth";
import { useCorporateAction } from "../hooks/useCorporateAction";
import {
  clearCorporateAuth, corporateSetupRoute, getCorporateChallenge, getCorporateGeneration,
  getCorporateSetupExpiry, getCorporateSetupStep, hasCorporateSession,
} from "../utils/storage";
import CorporateAuthCard from "./CorporateAuthCard";
import { CorporateField, CorporateNotice, CorporateSubmit } from "./CorporateForm";

export default function CorporateSetupForm({ mode }: { mode: "password" | "pin" }) {
  const [value, setValue] = useState("");
  const [confirm, setConfirm] = useState("");
  const [expired, setExpired] = useState(() => getCorporateSetupExpiry() > 0 && getCorporateSetupExpiry() <= Date.now());
  const action = useCorporateAction();
  const navigate = useNavigate();
  const deadline = getCorporateSetupExpiry();
  useEffect(() => {
    if (!deadline) return;
    const generation = getCorporateGeneration();
    const timer = window.setTimeout(() => {
      if (getCorporateGeneration() === generation) {
        clearCorporateAuth(); setExpired(true);
      }
    }, Math.max(0, deadline - Date.now()));
    return () => window.clearTimeout(timer);
  }, [deadline]);

  if (hasCorporateSession()) return <Navigate to="/corporate/auth-success" replace />;
  if (expired) return <CorporateAuthCard variant="setup" title="Setup session expired" description="Your 10-minute Corporate first-login setup window has ended."><Link to="/corporate/login" replace className="font-semibold text-blue-600">Return to Corporate Login</Link></CorporateAuthCard>;
  const step = getCorporateSetupStep();
  if (!getCorporateChallenge() || !deadline || !step) return <Navigate to="/corporate/login" replace />;
  if (step !== "complete" && step !== mode) return <Navigate to={corporateSetupRoute()} replace />;
  const password = mode === "password";

  function submit(event: FormEvent) {
    event.preventDefault();
    if (step !== "complete") {
      if (password && !/^(?=\S{8,10}$)(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9\s]).*$/.test(value)) {
        action.setError("Password must be 8–10 characters with uppercase, lowercase, number and special character, and no whitespace."); return;
      }
      if (!password && !/^\d{6}$/.test(value)) { action.setError("Transaction PIN must be exactly six digits."); return; }
      if (value !== confirm) { action.setError(password ? "Passwords do not match." : "Transaction PINs do not match."); return; }
    }
    void action.run(async () => {
      try {
        if (step !== "complete") {
          if (password) {
            const response = await changeCorporatePassword(value, confirm);
            if (response.pinSetupRequired) { await navigate("/corporate/first-login/setup-pin", { replace: true }); return; }
          } else { await setupCorporatePin(value, confirm); }
        }
        await completeCorporateLogin();
        await navigate("/corporate/auth-success", { replace: true });
      } finally { setValue(""); setConfirm(""); }
    });
  }

  return <CorporateAuthCard variant="setup" title={step === "complete" ? "Complete Corporate Login" : password ? "Change your password" : "Set up transaction PIN"} description="Complete your first-login setup within 10 minutes of OTP verification.">
    <form onSubmit={submit} noValidate className="space-y-5">
      {step !== "complete" && <>
        <CorporateField id={`corporate-new-${mode}`} label={password ? "New Password" : "Transaction PIN"} secret value={value} onChange={e => setValue(password ? e.target.value : e.target.value.replace(/\D/g, ""))} disabled={action.busy} required maxLength={password ? 10 : 6} inputMode={password ? "text" : "numeric"} autoComplete="new-password" />
        <CorporateField id={`corporate-confirm-${mode}`} label={password ? "Confirm Password" : "Confirm Transaction PIN"} secret value={confirm} onChange={e => setConfirm(password ? e.target.value : e.target.value.replace(/\D/g, ""))} disabled={action.busy} required maxLength={password ? 10 : 6} inputMode={password ? "text" : "numeric"} autoComplete="new-password" />
        <p className="text-xs leading-5 text-slate-500">{password ? "8–10 characters, uppercase and lowercase letters, a number, a special character, and no whitespace." : "Choose a six-digit transaction PIN. Keep it private."}</p>
      </>}
      <CorporateNotice error message={action.error} />
      <CorporateSubmit variant="verification" busy={action.busy}>{step === "complete" ? "Complete Corporate Login" : password ? "Change Password" : "Set Up PIN"}</CorporateSubmit>
    </form>
    <Link to="/corporate/login" replace className="mt-6 block text-center text-sm font-semibold text-blue-600">Return to Corporate Login</Link>
  </CorporateAuthCard>;
}
