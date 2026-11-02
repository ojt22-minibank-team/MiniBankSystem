import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ChartNoAxesCombined, Clock3, Mail, ShieldCheck, UsersRound } from "lucide-react";
import { EkarajAuthLayout } from "../../auth/components/EkarajAuthLayout";
import { ekarajPrimaryButtonClass } from "../../auth/components/EkarajAuthStyles";
import { authCodeInputClass } from "../../auth/components/IndividualAuthStyles";
import { resendCorporateOtp, verifyCorporateOtp } from "../api/auth";
import { CorporateNotice } from "../components/CorporateForm";
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

  return (
    <EkarajAuthLayout
      title="EKARAJ BANK | Corporate OTP Verification"
      portalLabel="EKARAJ BANK | Corporate Portal"
      securityLabel="Secure Corporate Banking"
    >
      <section aria-label="Corporate OTP verification card" className="grid w-full max-w-[976px] rounded-3xl border border-[#CDC0A8] bg-[#F5F3EF] shadow-[0_18px_50px_-26px_rgba(18,46,82,0.3)] md:grid-cols-[0.92fr_1.08fr]">
        <aside className="relative hidden flex-col justify-between overflow-hidden rounded-l-[23px] bg-[#E5EAF0] text-[#1A365D] md:flex">
          <img src="/assets/ekaraj-building-reference.jpg" alt="" aria-hidden="true" className="pointer-events-none absolute bottom-0 right-0 h-[85%] w-[85%] object-cover object-[60%_70%] opacity-[0.1] [mask-image:radial-gradient(ellipse_at_75%_65%,#000_10%,transparent_80%)]" />
          <svg aria-hidden="true" focusable="false" viewBox="0 0 450 470" preserveAspectRatio="none" fill="none" className="pointer-events-none absolute inset-0 h-full w-full">
            <path d="M-70 85C95 35 120 300 330 285S500 215 520 150" stroke="#C6A15B" strokeWidth="0.8" strokeOpacity="0.35" />
            <path d="M-80 105C80 55 135 325 340 305S510 235 530 175" stroke="#C6A15B" strokeWidth="0.8" strokeOpacity="0.2" />
          </svg>
          <h2 className="relative px-6 pt-4 font-serif text-2xl font-medium leading-8 tracking-tight lg:px-7">Secure Your Transactions<br />with Confidence.</h2>
          <div aria-hidden="true" className="relative flex min-h-0 flex-1 items-center justify-center px-6 py-2">
            <img src="/assets/ekaraj-crown-transparent.png" alt="" width={375} height={340} className="h-auto w-40 max-w-full object-contain" />
          </div>
          <div className="relative space-y-2.5 px-6 pb-4 pt-2 lg:px-7">
            {[
              { icon: ShieldCheck, title: "Secure Verification", description: "Your security, our priority." },
              { icon: UsersRound, title: "Trusted Access", description: "Verify your identity securely." },
              { icon: ChartNoAxesCombined, title: "Safe Corporate Transactions", description: "Stronger businesses, brighter futures." },
            ].map(({ icon: Icon, title, description }) => (
              <div key={title} className="flex items-start gap-3">
                <Icon aria-hidden="true" size={20} className="mt-0.5 shrink-0 text-[#C6A15B]" />
                <div>
                  <p className="text-xs font-semibold leading-4 text-[#1A365D]">{title}</p>
                  <p className="mt-0.5 text-[11px] leading-4 text-[#627084]">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </aside>
        <section aria-label="Corporate OTP verification" className="flex min-w-0 items-center px-5 py-3 sm:px-8 md:px-7 lg:px-9 md:[@media(max-height:700px)]:px-6 md:[@media(max-height:700px)]:py-2">
          <div className="mx-auto w-full max-w-[392px] md:[@media(max-height:700px)]:max-w-none">
            <div className="mb-3 text-center md:[@media(max-height:700px)]:mb-2">
              <span aria-hidden="true" className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full border border-[#C6D5E3] bg-[#EAF2FA] text-[#113E65] md:[@media(max-height:700px)]:mb-1 md:[@media(max-height:700px)]:h-8 md:[@media(max-height:700px)]:w-8">
                <Mail size={22} strokeWidth={1.8} />
              </span>
              <h1 className="font-serif text-2xl font-medium leading-8 tracking-tight text-[#1A365D]">OTP Verification</h1>
              <p className="mt-1 text-sm leading-5 text-[#59697D] md:[@media(max-height:700px)]:leading-[18px]">Enter the 6-digit verification code sent to your registered corporate email</p>
            </div>
            <form onSubmit={verify} noValidate className="space-y-2 [&>[role=alert]]:py-1.5 [&>[role=status]]:py-1.5 md:[@media(max-height:700px)]:[&>[role=alert]]:leading-[18px] md:[@media(max-height:700px)]:[&>[role=status]]:leading-[18px]">
              <div>
                <label htmlFor="corporate-otp" className="sr-only">Verification Code</label>
                <div className="group relative mx-auto w-full max-w-[304px]">
                  <div aria-hidden="true" className="grid grid-cols-6 gap-1.5 sm:gap-2">
                    {Array.from({ length: 6 }, (_, index) => (
                      <span key={index} className={`flex h-12 min-w-0 items-center justify-center rounded-xl border border-[#CDD5DF] bg-white font-mono text-xl font-semibold text-[#122E52] shadow-sm transition-colors motion-reduce:transition-none ${index === Math.min(otp.length, 5) ? "group-focus-within:border-[#113E65] group-focus-within:ring-2 group-focus-within:ring-[#113E65]" : ""}`}>
                        {otp[index] || ""}
                      </span>
                    ))}
                  </div>
                  <input id="corporate-otp" name="corporate-otp" type="text" inputMode="numeric" maxLength={6} autoComplete="one-time-code" required value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ""))} disabled={action.busy} placeholder="000000" className={authCodeInputClass} />
                </div>
                <p className="mt-2 flex items-center justify-center gap-1.5 text-xs leading-4 text-[#59697D]"><Clock3 aria-hidden="true" size={15} />The code is valid for 5 minutes.</p>
              </div>
              <CorporateNotice error message={action.error} /><CorporateNotice message={message} />
              <button type="submit" disabled={action.busy} aria-busy={action.busy} data-variant="verification" className={ekarajPrimaryButtonClass}>
                {action.busy && <span aria-hidden="true" className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-[#122E52]/25 border-t-[#122E52] motion-reduce:animate-none" />}
                {action.busy ? "Please wait..." : "Verify OTP"}
              </button>
            </form>
            <div className="mt-3 text-center">
              <p className="mb-1 text-xs leading-4 text-[#59697D]">Didn't receive the code?</p>
              <button type="button" onClick={resend} disabled={action.busy} className="inline-flex min-h-8 items-center justify-center rounded-md px-2 text-sm font-semibold text-[#122E52] underline underline-offset-4 decoration-[#C6A15B] transition-colors hover:text-[#1A365D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#113E65] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none">Resend OTP</button>
              <Link to="/corporate/login" replace className="mx-auto flex min-h-8 w-fit items-center justify-center rounded-md px-2 text-xs font-semibold text-[#122E52] underline underline-offset-4 decoration-[#C6A15B] hover:text-[#1A365D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#113E65]">Return to Corporate Login</Link>
            </div>
            <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-[#C6D5E3] bg-[#EAF2FA] p-2">
              <ShieldCheck aria-hidden="true" size={20} className="mt-0.5 shrink-0 text-[#113E65]" />
              <div>
                <p className="text-xs font-semibold leading-4 text-[#1A365D]">Your security comes first</p>
                <p className="mt-0.5 text-xs leading-4 text-[#59697D]">EKARAJ BANK will never ask you to share your OTP by phone, message, or email.</p>
              </div>
            </div>
          </div>
        </section>
      </section>
    </EkarajAuthLayout>
  );
}
