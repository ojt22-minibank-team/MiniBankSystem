import { useEffect, useState, type ComponentProps, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { changeCorporatePassword, completeCorporateLogin, setupCorporatePin } from "../api/auth";
import { useCorporateAction } from "../hooks/useCorporateAction";
import {
  clearCorporateAuth, corporateSetupRoute, getCorporateChallenge, getCorporateGeneration,
  getCorporateSetupExpiry, getCorporateSetupStep, hasCorporateSession,
} from "../utils/storage";
import CorporateAuthCard from "./CorporateAuthCard";
import { CorporateField, CorporateNotice, CorporateSubmit } from "./CorporateForm";
import { ChartNoAxesCombined, CheckCircle2, KeyRound, ShieldCheck, UsersRound } from "lucide-react";
import { EkarajAuthLayout } from "../../auth/components/EkarajAuthLayout";
import { AuthPinRules, AuthSecurityNote } from "../../auth/components/IndividualAuthUI";
import { authLinkButtonClass } from "../../auth/components/IndividualAuthStyles";

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
  if (expired) return <CorporateSetupExpiredCard />;
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

  // Keep the existing completion/retry surface; only the two setup forms use the new presentation.
  const SetupCard = step === "complete" ? CorporateAuthCard : CorporateSetupCard;
  return <SetupCard variant="setup" setupMode={mode} title={step === "complete" ? "Complete Corporate Login" : password ? "Change your password" : "Set up transaction PIN"} description="Complete your first-login setup within 10 minutes of OTP verification.">
    <form onSubmit={submit} noValidate className="space-y-3">
      {step !== "complete" && <>
        <CorporateField id={`corporate-new-${mode}`} label={password ? "New Password" : "Transaction PIN"} secret code={!password} value={value} onChange={e => setValue(password ? e.target.value : e.target.value.replace(/\D/g, ""))} disabled={action.busy} required maxLength={password ? 10 : 6} inputMode={password ? "text" : "numeric"} autoComplete="new-password" />
        <CorporateField id={`corporate-confirm-${mode}`} label={password ? "Confirm Password" : "Confirm Transaction PIN"} secret code={!password} value={confirm} onChange={e => setConfirm(password ? e.target.value : e.target.value.replace(/\D/g, ""))} disabled={action.busy} required maxLength={password ? 10 : 6} inputMode={password ? "text" : "numeric"} autoComplete="new-password" />
        {password ? <CorporatePasswordRules value={value} confirm={confirm} /> : <AuthPinRules pin={value} confirmPin={confirm} />}
      </>}
      <CorporateNotice error message={action.error} />
      <CorporateSubmit variant="verification" busy={action.busy}>{step === "complete" ? "Complete Corporate Login" : password ? "Change Password" : "Set Up PIN"}</CorporateSubmit>
    </form>
    <Link to="/corporate/login" replace className={`mt-3 w-full ${authLinkButtonClass}`}>Return to Corporate Login</Link>
    {!password && <AuthSecurityNote title="Keep your PIN private">Never share your Corporate password or transaction PIN with anyone.</AuthSecurityNote>}
  </SetupCard>;
}

// Expiry presentation only: the existing state, timer and cleanup stay above.
function CorporateSetupExpiredCard() {
  return (
    <EkarajAuthLayout title="EKARAJ BANK | Setup session expired" portalLabel="EKARAJ BANK | Corporate Portal" securityLabel="Secure Corporate Banking">
      <section aria-label="Corporate setup session expired card" className="grid w-full max-w-[976px] rounded-3xl border border-[#CDC0A8] bg-[#F5F3EF] shadow-[0_18px_50px_-26px_rgba(18,46,82,0.3)] md:grid-cols-[0.92fr_1.08fr]">
        <aside className="relative hidden flex-col justify-between overflow-hidden rounded-l-[23px] bg-[#E5EAF0] text-[#1A365D] md:flex">
          <img data-corporate-building src="/assets/ekaraj-building-reference.jpg" alt="" aria-hidden="true" className="pointer-events-none absolute bottom-0 right-0 h-[85%] w-[85%] object-cover object-[60%_70%] opacity-[0.1] [mask-image:radial-gradient(ellipse_at_75%_65%,#000_10%,transparent_80%)]" />
          <svg aria-hidden="true" focusable="false" viewBox="0 0 450 470" preserveAspectRatio="none" fill="none" className="pointer-events-none absolute inset-0 h-full w-full">
            <path d="M-70 85C95 35 120 300 330 285S500 215 520 150" stroke="#C6A15B" strokeWidth="0.8" strokeOpacity="0.35" />
            <path d="M-80 105C80 55 135 325 340 305S510 235 530 175" stroke="#C6A15B" strokeWidth="0.8" strokeOpacity="0.2" />
          </svg>
          <div className="relative px-6 pt-4 lg:px-7">
            <h2 className="font-serif text-2xl font-medium leading-8 tracking-tight">Your Business,<br />Our Secure Partnership.</h2>
            <p className="mt-2 text-sm leading-5 text-[#59697D]">Securely manage your company's banking services with confidence and peace of mind.</p>
          </div>
          <div aria-hidden="true" className="relative flex min-h-0 flex-1 items-center justify-center px-6 py-2">
            <img src="/assets/ekaraj-crown-transparent.png" alt="" width={375} height={340} className="h-auto w-40 max-w-full object-contain" />
          </div>
          <div className="relative space-y-2.5 px-6 pb-4 pt-2 lg:px-7">
            {[
              { icon: ShieldCheck, title: "Enhanced Security", description: "Your business data is always protected." },
              { icon: UsersRound, title: "Efficient Multi-User Access", description: "Manage permissions with ease." },
              { icon: ChartNoAxesCombined, title: "Reliable Corporate Banking", description: "Supporting your business growth." },
            ].map(({ icon: Icon, title, description }) => (
              <div key={title} className="flex items-start gap-3">
                <Icon aria-hidden="true" size={20} className="mt-0.5 shrink-0 text-[#C6A15B]" />
                <div>
                  <p className="text-xs font-semibold leading-4 text-[#1A365D]">{title}</p>
                  <p className="mt-0.5 text-[11px] leading-4 text-[#59697D]">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </aside>
        <section aria-labelledby="corporate-setup-expired-title" className="flex min-w-0 items-center justify-center px-5 py-10 text-center sm:px-8 md:px-7 lg:px-9">
          <div className="w-full max-w-[392px]">
            <span aria-hidden="true" className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-[#C6A15B]/40 bg-[#C6A15B]/10 text-[#C6A15B]">
              <KeyRound size={28} strokeWidth={1.8} />
            </span>
            <h1 id="corporate-setup-expired-title" className="font-serif text-2xl font-medium leading-8 tracking-tight text-[#1A365D]">Setup session expired</h1>
            <p className="mt-3 text-sm leading-5 text-[#59697D]">Your 10-minute Corporate first-login setup window has ended.</p>
            <Link to="/corporate/login" replace className="mt-5 inline-flex min-h-11 items-center justify-center rounded-md px-2 text-sm font-semibold text-[#122E52] underline decoration-[#C6A15B] underline-offset-4 transition-colors hover:text-[#1A365D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#113E65] motion-reduce:transition-none">Return to Corporate Login</Link>
          </div>
        </section>
      </section>
    </EkarajAuthLayout>
  );
}

// Presentation is local to first-login setup. Shared fields retain their native
// inputs, six PIN cells, masking, visibility controls and event handlers.
function CorporateSetupCard({ title, description, children }: ComponentProps<typeof CorporateAuthCard>) {
  return <EkarajAuthLayout title={`EKARAJ BANK | ${title}`} portalLabel="EKARAJ BANK | Corporate Portal" securityLabel="Secure Corporate Banking">
    <section aria-label="Corporate first-login setup card" className="grid w-full max-w-[976px] rounded-3xl border border-[#CDC0A8] bg-[#F5F3EF] shadow-[0_18px_50px_-26px_rgba(18,46,82,0.3)] md:grid-cols-[0.92fr_1.08fr]">
      <aside className="relative hidden flex-col justify-between overflow-hidden rounded-l-[23px] bg-[#E5EAF0] text-[#1A365D] md:flex">
        <img data-corporate-building src="/assets/ekaraj-building-reference.jpg" alt="" aria-hidden="true" className="pointer-events-none absolute bottom-0 right-0 h-[85%] w-[85%] object-cover object-[60%_70%] opacity-[0.1] [mask-image:radial-gradient(ellipse_at_75%_65%,#000_10%,transparent_80%)]" />
        <svg aria-hidden="true" focusable="false" viewBox="0 0 450 470" preserveAspectRatio="none" fill="none" className="pointer-events-none absolute inset-0 h-full w-full">
          <path d="M-70 85C95 35 120 300 330 285S500 215 520 150" stroke="#C6A15B" strokeWidth="0.8" strokeOpacity="0.35" />
          <path d="M-80 105C80 55 135 325 340 305S510 235 530 175" stroke="#C6A15B" strokeWidth="0.8" strokeOpacity="0.2" />
        </svg>
        <div className="relative px-6 pt-4 lg:px-7">
          <h2 className="font-serif text-2xl font-medium leading-8 tracking-tight">Empower Your Business.<br />Bank with Confidence.</h2>
          <p className="mt-2 text-sm leading-5 text-[#59697D]">Securely access your company's banking services and stay connected with EKARAJ BANK.</p>
        </div>
        <div aria-hidden="true" className="relative flex min-h-0 flex-1 items-center justify-center px-6 py-2">
          <img src="/assets/ekaraj-crown-transparent.png" alt="" width={375} height={340} className="h-auto w-40 max-w-full object-contain" />
        </div>
        <div className="relative space-y-2.5 px-6 pb-4 pt-2 lg:px-7">
          {[
            { icon: ShieldCheck, title: "Secure Corporate Access", description: "Your business, our priority." },
            { icon: UsersRound, title: "Multi-User Management", description: "Control and monitor with ease." },
            { icon: ChartNoAxesCombined, title: "Trusted Corporate Banking", description: "Stronger businesses, brighter futures." },
          ].map(({ icon: Icon, title, description }) => <div key={title} className="flex items-start gap-3">
            <Icon aria-hidden="true" size={20} className="mt-0.5 shrink-0 text-[#C6A15B]" />
            <div><p className="text-xs font-semibold leading-4 text-[#1A365D]">{title}</p><p className="mt-0.5 text-[11px] leading-4 text-[#627084]">{description}</p></div>
          </div>)}
        </div>
      </aside>
      <section aria-label={title} className="flex min-w-0 items-center px-5 py-3 sm:px-8 md:px-7 lg:px-9 md:[@media(max-height:700px)]:py-2">
        <div className="mx-auto w-full min-w-0 max-w-[392px]">
          <div className="mb-3">
            <h1 className="font-serif text-2xl font-medium leading-8 tracking-tight text-[#1A365D]">{title}</h1>
            <div aria-hidden="true" className="mt-1 h-px w-10 bg-[#C6A15B]" />
            <p className="mt-2 text-sm leading-5 text-[#59697D]">{description}</p>
          </div>
          <div className={corporateSetupControlsClass}>{children}</div>
        </div>
      </section>
    </section>
  </EkarajAuthLayout>;
}

// Scoped overrides theme the existing shared controls without changing them.
const corporateSetupControlsClass = [
  "[&_label]:mb-1 [&_label]:text-[#1A365D]",
  "[&_input]:border-[#CDD5DF] [&_input]:text-[#111418] [&_input]:placeholder:text-[#757575] [&_input]:hover:border-[#C6A15B] [&_input]:focus:border-[#113E65] [&_input]:focus:ring-[#113E65]/15 [&_input]:disabled:bg-[#E5EAF0] [&_input]:disabled:text-[#757575] [&_input]:motion-reduce:transition-none",
  "[&_button[type=button]]:text-[#757575] [&_button[type=button]]:hover:text-[#122E52] [&_button[type=button]]:focus-visible:ring-[#113E65]",
  "[&_span.rounded-full]:border-[#CDC0A8] [&_span.rounded-full]:text-[#122E52] [&_.group:focus-within_span.rounded-full]:border-[#113E65] [&_.group:focus-within_span.rounded-full]:ring-[#113E65]/20",
  "[&_button[type=submit]]:min-h-12 [&_button[type=submit]]:border [&_button[type=submit]]:border-[#56ABC0] [&_button[type=submit]]:bg-[#56ABC0] [&_button[type=submit]]:py-3 [&_button[type=submit]]:text-[#122E52] [&_button[type=submit]]:shadow-sm [&_button[type=submit]]:hover:bg-[#4DA0B5] [&_button[type=submit]]:focus-visible:ring-[#113E65] [&_button[type=submit]]:disabled:opacity-70 [&_button[type=submit]]:disabled:saturate-50 [&_button[type=submit]]:disabled:hover:bg-[#56ABC0] [&_button[type=submit]>span]:border-[#122E52]/25 [&_button[type=submit]>span]:border-t-[#122E52]",
  "[&>a]:text-[#122E52] [&>a]:decoration-[#C6A15B] [&>a]:focus-visible:ring-[#113E65]",
  "[&_form>ul]:border-[#CDC0A8] [&_form>ul]:bg-[#EAF2FA] [&_form>ul]:text-[#59697D]",
  "[&>div:last-child]:border-[#CDC0A8] [&>div:last-child]:bg-[#EAF2FA] [&>div:last-child]:p-2.5 [&>div:last-child>svg]:text-[#113E65] [&>div:last-child_p:first-child]:text-[#1A365D] [&>div:last-child_p:last-child]:text-[#59697D]",
  "md:[@media(max-height:700px)]:[&_form]:space-y-2 md:[@media(max-height:700px)]:[&>a]:mt-2",
].join(" ");

// Informational only: submit() above remains the authority for the existing
// Corporate password policy. This does not enable, disable or submit the form.
function CorporatePasswordRules({ value, confirm }: { value: string; confirm: string }) {
  const rules = [
    ["8–10 characters", value.length >= 8 && value.length <= 10],
    ["Uppercase letter (A–Z)", /[A-Z]/.test(value)],
    ["Lowercase letter (a–z)", /[a-z]/.test(value)],
    ["At least one number", /\d/.test(value)],
    ["Special character", /[^A-Za-z0-9\s]/.test(value)],
    ["No whitespace", value.length > 0 && !/\s/.test(value)],
    ["Passwords match", value.length > 0 && value === confirm],
  ] as const;
  return <div className="rounded-xl border border-[#CDC0A8] bg-[#EAF2FA] p-3">
    <p className="mb-2 text-xs font-semibold text-[#1A365D]">Password requirements</p>
    <ul className="grid gap-x-3 gap-y-1 sm:grid-cols-2">{rules.map(([label, valid]) => <li key={label} className={`flex items-center gap-2 text-[11px] leading-4 ${valid ? "text-emerald-700" : "text-[#59697D]"}`}>
      <CheckCircle2 aria-hidden="true" size={13} className={`shrink-0 ${valid ? "fill-emerald-600 text-white" : "text-[#59697D]"}`} />
      <span>{label}{valid && <span className="sr-only"> — met</span>}</span>
    </li>)}</ul>
  </div>;
}
