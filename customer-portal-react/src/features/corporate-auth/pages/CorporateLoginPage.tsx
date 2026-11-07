
import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import {
  Building2,
  ChartNoAxesCombined,
  ShieldCheck,
  UsersRound,
} from "lucide-react";

import { EkarajAuthLayout } from "../../auth/components/EkarajAuthLayout";
import { ekarajPrimaryButtonClass } from "../../auth/components/EkarajAuthStyles";
import { loginCorporate } from "../api/auth";
import { CorporateField, CorporateNotice } from "../components/CorporateForm";
import { useCorporateAction } from "../hooks/useCorporateAction";
import { hasCorporateSession } from "../utils/storage";

// Presentation overrides stay on this page; CorporateField retains its native input behavior.
const corporateLoginFormClass =
  "space-y-1.5 md:[@media(max-height:700px)]:space-y-[3px] [&_label]:mb-1 md:[@media(max-height:700px)]:[&_label]:mb-px md:[@media(max-height:700px)]:[&>[role=alert]]:py-1 md:[@media(max-height:700px)]:[&>[role=alert]]:leading-[18px] [&_label]:text-[#1A365D] dark:[&_label]:text-[var(--text-primary)] [&_input]:border-[#CDD5DF] dark:[&_input]:border-[var(--border-default)] [&_input]:text-[#111418] dark:[&_input]:text-[var(--text-primary)] [&_input]:bg-white dark:[&_input]:bg-[var(--surface-secondary)] [&_input]:transition-colors [&_input]:placeholder:text-[#757575] dark:[&_input]:placeholder:text-[var(--text-secondary)] [&_input]:hover:border-[#C6A15B] dark:[&_input]:hover:border-[var(--brand-primary)] [&_input]:focus:border-[#113E65] dark:[&_input]:focus:border-[var(--brand-primary)] [&_input]:focus:ring-[#113E65]/15 dark:[&_input]:focus:ring-[var(--brand-primary)]/15 [&_input]:disabled:bg-[#E5EAF0] dark:[&_input]:disabled:bg-[var(--app-bg)] [&_input]:disabled:text-[#757575] dark:[&_input]:disabled:text-[var(--text-secondary)] [&_input]:motion-reduce:transition-none [&_svg]:text-[#757575] dark:[&_svg]:text-[var(--text-secondary)] [&_button[type=button]]:hover:text-[#122E52] dark:[&_button[type=button]]:hover:text-[var(--brand-primary)] [&_button[type=button]]:focus-visible:ring-[#113E65] dark:[&_button[type=button]]:focus-visible:ring-[var(--brand-primary)]";

const corporateLoginLinkClass =
  "rounded-md font-semibold text-[#122E52] dark:text-[var(--brand-primary)] underline underline-offset-4 decoration-[#C6A15B] dark:decoration-[var(--brand-primary)] transition-colors hover:text-[#1A365D] dark:hover:text-[var(--brand-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#113E65] dark:focus-visible:ring-[var(--brand-primary)] motion-reduce:transition-none";

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

  if (hasCorporateSession()) {
    return <Navigate to="/corporate/auth-success" replace />;
  }

  function submit(event: FormEvent) {
    event.preventDefault();

    if (!company.trim()) {
      action.setError("Company Customer ID is required.");
      return;
    }

    if (!user.trim()) {
      action.setError("Corporate User ID is required.");
      return;
    }

    if (!password.trim()) {
      action.setError("Password is required.");
      return;
    }

    void action.run(async () => {
      try {
        await loginCorporate({
          companyCustomerCode: company.trim(),
          corporateUserCode: user.trim(),
          password,
        });

        await navigate("/corporate/otp");
      } finally {
        setPassword("");
      }
    });
  }

  return (
    <EkarajAuthLayout
      title="EKARAJ BANK  Corporate Login"
      portalLabel="EKARAJ BANK  Corporate Portal"
      securityLabel="Secure Corporate Banking"
    >
      <section
        aria-label="Corporate login card"
        className="
          grid w-full max-w-[976px]
          rounded-3xl
          border border-[#CDC0A8] dark:border-[var(--auth-border)]
          bg-[#F5F3EF] dark:bg-[var(--auth-card-bg)]
          shadow-[0_18px_50px_-26px_rgba(18,46,82,0.3)]
          dark:shadow-[0_18px_50px_-26px_rgba(0,0,0,0.7)]
          md:grid-cols-[0.92fr_1.08fr]
        "
      >
        {/* Left Brand Panel */}

        <aside
          className="
            relative hidden flex-col justify-between
            overflow-hidden rounded-l-[23px]
            bg-[#E5EAF0] dark:bg-[var(--auth-panel-bg)]
            text-[#1A365D] dark:text-[var(--auth-panel-text)]
            md:flex
          "
        >
          <img
            data-corporate-building
            src="/assets/ekaraj-building-reference.jpg"
            alt=""
            aria-hidden="true"
            className="
              pointer-events-none absolute bottom-0 right-0
              h-[85%] w-[85%]
              object-cover object-[60%_70%]
              opacity-[0.1]
              [mask-image:radial-gradient(ellipse_at_75%_65%,#000_10%,transparent_80%)]
            "
          />

          <svg
            aria-hidden="true"
            focusable="false"
            viewBox="0 0 450 470"
            preserveAspectRatio="none"
            fill="none"
            className="pointer-events-none absolute inset-0 h-full w-full"
          >
            <path
              d="M-70 85C95 35 120 300 330 285S500 215 520 150"
              stroke="var(--auth-decoration)"
              strokeWidth="0.8"
              strokeOpacity="0.35"
            />

            <path
              d="M-80 105C80 55 135 325 340 305S510 235 530 175"
              stroke="var(--auth-decoration)"
              strokeWidth="0.8"
              strokeOpacity="0.2"
            />
          </svg>

          <div className="relative px-6 pt-4 lg:px-7">
            <h2 className="font-serif text-2xl font-medium leading-8 tracking-tight">
              Empower Your Business.
              <br />
              Bank with Confidence.
            </h2>

            <p
              className="
                mt-2 text-sm leading-5
                text-[#59697D] dark:text-[var(--auth-text-secondary)]
              "
            >
              Securely access your company's banking services and stay
              connected with EKARAJ BANK.
            </p>
          </div>

          {/* Brand Logo */}

          <div
            aria-hidden="true"
            className="
              relative flex min-h-0 flex-1
              items-center justify-center px-6 py-2
            "
          >
            <img
              src="/assets/ekaraj-crown-transparent.png"
              alt=""
              width={375}
              height={340}
              className="h-auto w-40 max-w-full object-contain"
            />
          </div>

          {/* Security Highlights */}

          <div className="relative space-y-2.5 px-6 pb-4 pt-2 lg:px-7">
            {[
              {
                icon: ShieldCheck,
                title: "Secure Corporate Access",
                description: "Your business, our priority.",
              },
              {
                icon: UsersRound,
                title: "Multi-User Management",
                description: "Control and monitor with ease.",
              },
              {
                icon: ChartNoAxesCombined,
                title: "Trusted Corporate Banking",
                description: "Stronger businesses, brighter futures.",
              },
            ].map(({ icon: Icon, title, description }) => (
              <div key={title} className="flex items-start gap-3">
                <Icon
                  aria-hidden="true"
                  size={20}
                  className="
                    mt-0.5 shrink-0
                    text-[#C6A15B] dark:text-[var(--auth-decoration)]
                  "
                />

                <div>
                  <p
                    className="
                      text-xs font-semibold leading-4
                      text-[#1A365D] dark:text-[var(--auth-panel-text)]
                    "
                  >
                    {title}
                  </p>

                  <p
                    className="
                      mt-0.5 text-[11px] leading-4
                      text-[#627084] dark:text-[var(--auth-text-secondary)]
                    "
                  >
                    {description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Right Form Panel */}

        <section
          aria-label="Corporate banking login"
          className="
            flex min-w-0 items-center
            px-5 py-3 sm:px-8 md:px-7 lg:px-9
            md:[@media(max-height:700px)]:px-6
            md:[@media(max-height:700px)]:py-1
          "
        >
          <div
            className="
              mx-auto w-full max-w-[392px]
              md:[@media(max-height:700px)]:max-w-none
            "
          >
            {/* Welcome Heading */}

            <div className="mb-4 md:[@media(max-height:700px)]:mb-2">
              <h1
                className="
                  font-serif text-2xl font-medium
                  leading-8 tracking-tight
                  text-[#1A365D] dark:text-[var(--text-primary)]
                "
              >
                Welcome to EKARAJ Bank Corporate Login
              </h1>

              <div
                aria-hidden="true"
                className="
                  mt-1 h-px w-10
                  bg-[#C6A15B] dark:bg-[var(--brand-primary)]
                "
              />
            </div>

            {/* Corporate Login Form */}

            <form
              onSubmit={submit}
              autoComplete="off"
              noValidate
              className={corporateLoginFormClass}
            >
              <div className="relative [&>div>div>svg]:hidden">
                <CorporateField
                  id="corporate-company"
                  label="Company Customer ID"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  disabled={action.busy}
                  required
                  autoComplete="off"
                  readOnly={!companyEditable}
                  onFocus={() => setCompanyEditable(true)}
                  placeholder="Enter Company Customer ID"
                />

                <Building2
                  aria-hidden="true"
                  size={18}
                  className="
                    pointer-events-none absolute bottom-[13px] left-4
                    text-[#757575] dark:text-[var(--text-secondary)]
                  "
                />
              </div>

              <CorporateField
                id="corporate-user"
                label="Corporate User ID"
                value={user}
                onChange={(e) => setUser(e.target.value)}
                disabled={action.busy}
                required
                autoComplete="off"
                readOnly={!userEditable}
                onFocus={() => setUserEditable(true)}
                placeholder="Enter Corporate User ID"
              />

              <CorporateField
                id="corporate-password"
                label="Password"
                secret
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={action.busy}
                required
                autoComplete="new-password"
                readOnly={!passwordEditable}
                onFocus={() => setPasswordEditable(true)}
                placeholder="Enter your password"
              />

              <CorporateNotice error message={action.error} />

              <button
                type="submit"
                disabled={action.busy}
                aria-busy={action.busy}
                data-variant="login"
                className={ekarajPrimaryButtonClass}
              >
                {action.busy && (
                  <span
                    aria-hidden="true"
                    className="
                      h-4 w-4 shrink-0 animate-spin rounded-full
                      border-2 border-[#122E52]/25 border-t-[#122E52]
                      motion-reduce:animate-none
                    "
                  />
                )}

                {action.busy ? "Please wait..." : "Login"}
              </button>
            </form>

            {/* Additional Login Information */}

            <div
              className="
                mt-3 space-y-2 text-center text-xs leading-5
                text-[#59697D] dark:text-[var(--text-secondary)]
                md:[@media(max-height:700px)]:leading-4
              "
            >
              <p>
                Personal Banking?{" "}
                <Link to="/login" className={corporateLoginLinkClass}>
                  Individual Customer Login
                </Link>
              </p>

              <p>
                Need assistance?{" "}
                <span
                  className="
                    font-semibold
                    text-[#122E52] dark:text-[var(--text-primary)]
                  "
                >
                  Contact your bank
                </span>
              </p>
            </div>

            {/* Security Notice */}

            <div
              className="
                mt-3 flex items-start gap-2.5
                rounded-xl border
                border-[#C6D5E3] dark:border-[var(--border-default)]
                bg-[#EAF2FA] dark:bg-[var(--surface-secondary)]
                p-2
                md:[@media(max-height:700px)]:p-1.5
              "
            >
              <ShieldCheck
                aria-hidden="true"
                size={20}
                className="
                  mt-0.5 shrink-0
                  text-[#113E65] dark:text-[var(--brand-primary)]
                "
              />

              <div>
                <p
                  className="
                    text-xs font-semibold leading-4
                    text-[#1A365D] dark:text-[var(--text-primary)]
                  "
                >
                  Your security comes first
                </p>

                <p
                  className="
                    mt-0.5 text-xs leading-4
                    text-[#59697D] dark:text-[var(--text-secondary)]
                  "
                >
                  For your security, never share your password or OTP with
                  anyone.
                </p>
              </div>
            </div>
          </div>
        </section>
      </section>
    </EkarajAuthLayout>
  );
}
