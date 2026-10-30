import type { ReactNode } from "react";
import { Clock3, Mail, ShieldCheck, WalletCards, type LucideIcon } from "lucide-react";

type EkarajAuthCardProps = {
  ariaLabel: string;
  formLabel: string;
  leftHeading: ReactNode;
  /** Preserve the approved differences in decoration, highlights and form spacing. */
  variant: "login" | "otp" | "recovery" | "password";
  children: ReactNode;
};

type SecurityHighlight = {
  icon: LucideIcon;
  title: string;
  description: string;
};

const loginHighlights: SecurityHighlight[] = [
  { icon: ShieldCheck, title: "Secure Verification", description: "Your safety is our priority" },
  { icon: WalletCards, title: "Safe Transactions", description: "Bank with confidence" },
  { icon: Clock3, title: "Your Trusted Banking Partner", description: "Always by your side" },
];

const recoveryHighlights: SecurityHighlight[] = [
  { icon: ShieldCheck, title: "Secure Verification", description: "Your identity, our priority." },
  { icon: Mail, title: "Protected Recovery", description: "Reset your password safely." },
  { icon: Clock3, title: "Trusted Banking", description: "Your security comes first." },
];

/** Presentation only: page-owned form content keeps its original DOM and behavior. */
export function EkarajAuthCard({ ariaLabel, formLabel, leftHeading, variant, children }: EkarajAuthCardProps) {
  const recovery = variant === "recovery" || variant === "password";
  const highlights = recovery ? recoveryHighlights : loginHighlights;

  return (
    <section aria-label={ariaLabel} className="grid w-full max-w-[976px] rounded-3xl border border-[#CDC0A8] bg-[#F5F3EF] shadow-[0_18px_50px_-26px_rgba(18,46,82,0.3)] md:grid-cols-[0.92fr_1.08fr]">
      <aside className="relative hidden flex-col justify-between overflow-hidden rounded-l-[23px] bg-[#E5EAF0] text-[#1A365D] md:flex">
        <img src="/assets/ekaraj-building-reference.jpg" alt="" aria-hidden="true" className="pointer-events-none absolute bottom-0 right-0 h-[85%] w-[85%] object-cover object-[60%_70%] opacity-[0.1] [mask-image:radial-gradient(ellipse_at_75%_65%,#000_10%,transparent_80%)]" />
        <svg aria-hidden="true" focusable="false" viewBox="0 0 450 470" preserveAspectRatio="none" fill="none" className="pointer-events-none absolute inset-0 h-full w-full">
          <path d={recovery ? "M-30 130C100 145 140 350 285 325S420 300 490 260" : "M-70 85C95 35 120 300 330 285S500 215 520 150"} stroke="#C6A15B" strokeWidth="0.8" strokeOpacity={recovery ? "0.5" : "0.35"} />
          <path d={recovery ? "M-30 152C95 168 148 378 292 350S435 322 490 282" : "M-80 105C80 55 135 325 340 305S510 235 530 175"} stroke="#C6A15B" strokeWidth="0.8" strokeOpacity={recovery ? "0.35" : "0.2"} />
        </svg>
        <h2 className="relative px-6 pt-4 font-serif text-2xl font-medium leading-8 tracking-tight lg:px-7">
          {leftHeading}
        </h2>
        <div aria-hidden="true" className={variant === "password" ? "relative flex min-h-[200px] flex-1 items-center justify-center px-6 py-2" : "relative flex min-h-0 flex-1 items-center justify-center px-6 py-2"}>
          <img src="/assets/ekaraj-crown-transparent.png" alt="" width={375} height={340} className={recovery ? "h-auto w-40 max-w-full translate-y-5 object-contain" : "h-auto w-40 max-w-full object-contain"} />
        </div>
        <div className="relative space-y-2.5 px-6 pb-4 pt-2 lg:px-7">
          {variant === "otp" ? (
            <>
              <p className="flex items-center gap-3 text-xs font-medium leading-4"><ShieldCheck aria-hidden="true" size={20} className="shrink-0 text-[#C6A15B]" />Secure Verification</p>
              <p className="flex items-center gap-3 text-xs font-medium leading-4"><Clock3 aria-hidden="true" size={20} className="shrink-0 text-[#C6A15B]" />Your Trusted Banking Partner</p>
            </>
          ) : highlights.map(({ icon: Icon, title, description }) => (
            <div key={title} className="flex items-start gap-3">
              <Icon aria-hidden="true" size={20} className="mt-0.5 shrink-0 text-[#C6A15B]" />
              <div>
                <p className={recovery ? "text-xs font-bold leading-4 text-[#1A365D]" : "text-xs font-semibold leading-4 text-[#1A365D]"}>{title}</p>
                <p className={recovery ? "mt-0.5 text-[11px] leading-4 text-[#59697D]" : "mt-0.5 text-[11px] leading-4 text-[#627084]"}>{description}</p>
              </div>
            </div>
          ))}
        </div>
      </aside>
      <section aria-label={formLabel} className={variant === "password" ? "flex min-w-0 items-center px-5 py-2.5 sm:px-8 md:px-7 lg:px-9" : "flex min-w-0 items-center px-5 py-3 sm:px-8 md:px-7 lg:px-9"}>
        <div className="mx-auto w-full max-w-[392px]">
          {children}
        </div>
      </section>
    </section>
  );
}
