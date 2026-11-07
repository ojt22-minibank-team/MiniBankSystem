
import type { ReactNode } from "react";
import { ShieldCheck } from "lucide-react";

type EkarajAuthLayoutProps = {
  title: string;
  children: ReactNode;
  portalLabel?: string;
  securityLabel?: string;
};

/** Approved EKARAJ page chrome. The native title keeps React's existing title behavior. */
export function EkarajAuthLayout({
  title,
  children,
  portalLabel = "EKARAJ BANK Customer Portal",
  securityLabel = "Secure Personal Banking",
}: EkarajAuthLayoutProps) {
  return (
    <div
      className="
        flex min-h-dvh flex-col
        bg-[#E5EAF0] dark:bg-[var(--auth-page-bg)]
        text-[#111418] dark:text-[var(--text-primary)]
        antialiased
      "
    >
      <title>{title}</title>

      {/* Header */}
      <header
        className="
          shrink-0
          border-b border-[#C5AF82] dark:border-[var(--auth-border)]
          bg-[#FAF9F7] dark:bg-[var(--auth-surface)]
          text-[#1A365D] dark:text-[var(--auth-text-primary)]
        "
      >
        <div className="mx-auto flex min-h-[55px] max-w-[1200px] items-center justify-between gap-3 px-3 py-1.5 sm:px-6">

          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <img
              src="/assets/ekaraj-crown-transparent.png"
              alt=""
              aria-hidden="true"
              width={375}
              height={340}
              className="h-10 w-auto shrink-0 object-contain"
            />

            <p
              className="
                min-w-0 text-xs font-semibold leading-4
                tracking-[0.02em]
                text-[#113E65] dark:text-[var(--auth-text-primary)]
                sm:text-sm sm:tracking-[0.06em]
              "
            >
              {portalLabel}
            </p>
          </div>

          <p className="inline-flex shrink-0 items-center gap-1.5 text-[10px] font-medium leading-4 sm:gap-2 sm:text-xs">
            <ShieldCheck
              aria-hidden="true"
              size={18}
              className="shrink-0"
            />

            <span className="max-w-[88px] sm:max-w-none">
              {securityLabel}
            </span>
          </p>

        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 items-center justify-center px-3 py-1.5 sm:px-6">
        {children}
      </main>

      {/* Footer */}
      <footer
        className="
          shrink-0
          border-t border-[#EBEAE6] dark:border-[var(--auth-border)]
          bg-[#FAF9F7] dark:bg-[var(--auth-surface)]
          text-[#1A365D] dark:text-[var(--auth-text-primary)]
        "
      >
        <div className="mx-auto flex min-h-[39px] max-w-[1200px] flex-wrap items-center justify-center gap-x-4 px-3 py-1 text-[10px] leading-4 sm:justify-between sm:px-6 sm:text-[11px]">

          <p>
            © 2026 EKARAJ BANK. All rights reserved.
          </p>

          <p>
            Secure
            <span
              aria-hidden="true"
              className="
                mx-1 text-[#757575]
                dark:text-[var(--auth-text-secondary)]
              "
            >
              •
            </span>
            Simple
            <span
              aria-hidden="true"
              className="
                mx-1 text-[#757575]
                dark:text-[var(--auth-text-secondary)]
              "
            >
              •
            </span>
            Convenient
          </p>

        </div>
      </footer>
    </div>
  );
}
