import {
  Clock3,
  ShieldAlert,
} from "lucide-react";
import { ekarajPrimaryButtonClass } from "./EkarajAuthStyles";


interface SessionTimeoutModalProps {
  open: boolean;
  message?: string;
  onLoginAgain: () => void;
}


function SessionTimeoutModal({
  open,
  message,
  onLoginAgain,
}: SessionTimeoutModalProps) {

  if (!open) {
    return null;
  }


  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-[#E5EAF0]">
      <div className="flex min-h-full items-center justify-center px-4 py-6">
        <div role="alertdialog" aria-modal="true" aria-labelledby="individual-timeout-title" aria-describedby="individual-timeout-message" className="w-full max-w-md rounded-[28px] border border-[#CDC0A8] bg-[#F5F3EF] p-6 text-center text-[#122E52] shadow-[0_18px_50px_-26px_rgba(18,46,82,0.3)] sm:p-8">
          <div className="mb-5 flex items-center justify-center gap-3">
            <img src="/assets/ekaraj-crown-transparent.png" alt="" aria-hidden="true" width={375} height={340} className="h-10 w-auto shrink-0 object-contain" />
            <span className="text-sm font-semibold tracking-[0.06em] text-[#1A365D]">EKARAJ BANK</span>
          </div>
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#EAF2FA] text-[#1A365D] ring-4 ring-[#C6A15B]/20"><Clock3 aria-hidden="true" size={28} /></div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#C6A15B]/40 bg-[#EAF2FA] px-3 py-1.5 text-xs font-semibold text-[#122E52]"><ShieldAlert aria-hidden="true" size={14} />Security Timeout</div>
          <h2 id="individual-timeout-title" className="font-serif text-2xl font-medium leading-8 text-[#1A365D]">Session Timed Out</h2>
          <p id="individual-timeout-message" className="mt-3 text-sm leading-5 text-[#59697D]">{message || "Your session has expired after 5 minutes of inactivity."}</p>
          <p className="mt-2 text-sm leading-5 text-[#59697D]">Please login again to continue using EKARAJ BANK securely.</p>
          <button type="button" onClick={onLoginAgain} className={`mt-5 ${ekarajPrimaryButtonClass}`}>Login Again</button>
        </div>
      </div>
    </div>
  );

}


export default SessionTimeoutModal;
