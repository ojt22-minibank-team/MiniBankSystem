import { Clock3, LogIn, ShieldAlert } from "lucide-react";

export default function CorporateSessionTimeoutModal({ message, onLoginAgain }: { message: string; onLoginAgain: () => void }) {
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm">
    <div role="alertdialog" aria-modal="true" aria-labelledby="corporate-timeout-title" aria-describedby="corporate-timeout-message" className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-2xl">
      <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-amber-50 text-amber-600"><Clock3 size={38} /></div>
      <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600"><ShieldAlert size={14} />Security Timeout</div>
      <h2 id="corporate-timeout-title" className="text-2xl font-bold text-[#08295C]">Session Timed Out</h2>
      <p id="corporate-timeout-message" className="mt-3 text-sm leading-6 text-slate-500">{message}</p>
      <p className="mt-2 text-sm text-slate-500">Please login again to continue using MiniBank securely.</p>
      <button autoFocus type="button" onClick={onLoginAgain} className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200"><LogIn size={18} />Login Again</button>
    </div>
  </div>;
}
