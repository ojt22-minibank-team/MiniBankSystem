import { Link } from "react-router-dom";
import { KeyRound } from "lucide-react";
import { EkarajAuthCard } from "./EkarajAuthCard";
import { EkarajAuthLayout } from "./EkarajAuthLayout";

export function IndividualSetupExpiredCard() {
  return <EkarajAuthLayout title="EKARAJ BANK | Setup session expired">
    <EkarajAuthCard ariaLabel="Individual setup session expired card" formLabel="Setup session expired" variant="login" leftHeading={<>Your Trust.<br />Our Commitment.</>}>
      <div className="py-7 text-center">
        <span aria-hidden="true" className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-[#C6A15B]/40 bg-[#C6A15B]/10 text-[#C6A15B]">
          <KeyRound size={28} strokeWidth={1.8} />
        </span>
        <h1 className="font-serif text-2xl font-medium leading-8 tracking-tight text-[#1A365D]">Setup session expired</h1>
        <p className="mt-3 text-sm leading-5 text-[#59697D]">Your 10-minute first-login setup window has ended.</p>
        <Link to="/login" replace className="mt-5 inline-flex min-h-11 items-center justify-center rounded-md px-2 text-sm font-semibold text-[#122E52] underline decoration-[#C6A15B] underline-offset-4 transition-colors hover:text-[#1A365D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#113E65] motion-reduce:transition-none">Return to Individual Login</Link>
      </div>
    </EkarajAuthCard>
  </EkarajAuthLayout>;
}
