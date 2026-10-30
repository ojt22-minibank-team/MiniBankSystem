import type { ReactNode } from "react";
import { CheckCircle2 } from "lucide-react";
import PublicAuthLayout from "../../auth/components/PublicAuthLayout";
import { AuthHeading, IndividualAuthCard } from "../../auth/components/IndividualAuthUI";

interface Props {
  title: string;
  description: string;
  variant?: "login" | "verification" | "setup" | "success";
  setupMode?: "password" | "pin";
  children: ReactNode;
}

// These shared components contain presentation only. Corporate state, APIs,
// setup deadlines and route decisions remain in Corporate-owned code.
export default function CorporateAuthCard({ title, description, variant = "verification", setupMode, children }: Props) {
  const login = variant === "login";
  const visualVariant = login ? "login" : variant === "setup" ? (setupMode === "pin" ? "pin" : "password") : "otp";
  return (
    <PublicAuthLayout portalLabel="Corporate Banking Portal">
      <IndividualAuthCard
        variant={visualVariant}
        panelContent={{
          title: login ? "WELCOME TO EKARAJ BANK" : variant === "success" ? "Your business.\nSecurely connected." : "Protecting your business,\nevery step of the way.",
          description: login
            ? "Securely access your company’s banking services and stay connected with ACE Bank."
            : "Dedicated security for your Corporate Banking account. Keep your credentials, OTP and transaction PIN private.",
        }}
      >
        {login ? (
          <div className="mb-4">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-600">Corporate Banking</p>
            <h1 className="text-[26px] font-bold leading-tight tracking-tight text-[#08295C] sm:text-3xl">{title}</h1>
            <p className="mt-2 text-sm leading-5 text-slate-500">{description}</p>
          </div>
        ) : variant === "success" ? (
          <div className="mb-4 text-center">
            <CheckCircle2 aria-hidden="true" className="mx-auto mb-3 h-12 w-12 rounded-full bg-blue-50 p-2 text-[#2563EB]" />
            <h1 className="text-2xl font-bold leading-tight tracking-tight text-[#08295C]">{title}</h1>
            <p className="mt-2 text-sm leading-5 text-slate-500">{description}</p>
          </div>
        ) : (
          <AuthHeading title={title} description={description} variant={visualVariant} />
        )}
        {children}
      </IndividualAuthCard>
    </PublicAuthLayout>
  );
}
