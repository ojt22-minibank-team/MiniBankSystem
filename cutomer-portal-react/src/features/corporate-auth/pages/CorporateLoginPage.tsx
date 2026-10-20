import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { LockKeyhole } from "lucide-react";
import { loginCorporate } from "../api/auth";
import CorporateAuthCard from "../components/CorporateAuthCard";
import { CorporateField, CorporateNotice, CorporateSubmit } from "../components/CorporateForm";
import { useCorporateAction } from "../hooks/useCorporateAction";
import { hasCorporateSession } from "../utils/storage";

export default function CorporateLoginPage() {
  const [company, setCompany] = useState("");
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  // Match Individual Login: discourage initial autofill, unlock each field on focus.
  const [companyEditable, setCompanyEditable] = useState(false);
  const [userEditable, setUserEditable] = useState(false);
  const [passwordEditable, setPasswordEditable] = useState(false);
  const action = useCorporateAction();
  const navigate = useNavigate();
  if (hasCorporateSession()) return <Navigate to="/corporate/auth-success" replace />;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!company.trim()) { action.setError("Company Customer ID is required."); return; }
    if (!user.trim()) { action.setError("Corporate User ID is required."); return; }
    if (!password.trim()) { action.setError("Password is required."); return; }
    void action.run(async () => {
      try {
        await loginCorporate({ companyCustomerCode: company.trim(), corporateUserCode: user.trim(), password });
        await navigate("/corporate/otp");
      } finally { setPassword(""); }
    });
  }

  return <CorporateAuthCard variant="login" title="Welcome to Corporate Banking!" description="Login securely using your Company Customer ID and Corporate User ID.">
    <form onSubmit={submit} autoComplete="off" noValidate className="space-y-5">
      <CorporateField id="corporate-company" label="Company Customer ID" value={company} onChange={e => setCompany(e.target.value)} disabled={action.busy} required autoComplete="off" readOnly={!companyEditable} onFocus={() => setCompanyEditable(true)} placeholder="Enter Company Customer ID" />
      <CorporateField id="corporate-user" label="Corporate User ID" value={user} onChange={e => setUser(e.target.value)} disabled={action.busy} required autoComplete="off" readOnly={!userEditable} onFocus={() => setUserEditable(true)} placeholder="Enter Corporate User ID" />
      <CorporateField id="corporate-password" label="Password" secret value={password} onChange={e => setPassword(e.target.value)} disabled={action.busy} required autoComplete="new-password" readOnly={!passwordEditable} onFocus={() => setPasswordEditable(true)} placeholder="Enter your password" />
      <CorporateNotice error message={action.error} />
      <CorporateSubmit busy={action.busy}>Login</CorporateSubmit>
    </form>
    <p className="mt-6 text-center text-sm text-slate-500">Personal banking? <Link to="/login" className="font-semibold text-cyan-600 hover:text-cyan-700">Individual Customer Login</Link></p>
    <div className="mt-8 border-t border-slate-100 pt-6 text-center">
      <p className="text-sm text-slate-500">Don't have a corporate account? <span className="font-semibold text-cyan-600">Contact your bank</span></p>
    </div>
    <div className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-slate-50 px-4 py-3 text-center">
      <LockKeyhole size={14} className="text-slate-400" />
      <p className="text-xs leading-5 text-slate-500">For your security, never share your password or OTP with anyone.</p>
    </div>
  </CorporateAuthCard>;
}
