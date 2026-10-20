import { useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff, LockKeyhole, UserRound } from "lucide-react";

export function CorporateField({ label, id, secret = false, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; id: string; secret?: boolean }) {
  const [visible, setVisible] = useState(false);
  const Icon = secret ? LockKeyhole : UserRound;
  return <div><label htmlFor={id} className="mb-2 block text-sm font-semibold text-slate-700">{label}</label><div className="relative">
    <Icon size={19} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-slate-400" />
    <input {...props} id={id} name={id} type={secret ? (visible ? "text" : "password") : (props.type || "text")}
      className={`${secret ? "pr-12" : "pr-4"} w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-12 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-cyan-500 focus:bg-white focus:ring-4 focus:ring-cyan-100 disabled:cursor-not-allowed disabled:bg-slate-100`} />
    {secret && <button type="button" disabled={props.disabled} onClick={() => setVisible(value => !value)} aria-label={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`} aria-pressed={visible} className="absolute top-1/2 right-4 -translate-y-1/2 text-slate-400 transition hover:text-[#08295C]">{visible ? <EyeOff size={20} /> : <Eye size={20} />}</button>}
  </div></div>;
}

export function CorporateNotice({ message, error = false }: { message: string; error?: boolean }) {
  if (!message) return null;
  return <div role={error ? "alert" : "status"} className={`rounded-xl border px-4 py-3 text-sm font-medium ${error ? "border-red-200 bg-red-50 text-red-600" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{message}</div>;
}

export function CorporateSubmit({ busy, children, variant = "login" }: { busy: boolean; children: React.ReactNode; variant?: "login" | "verification" }) {
  return <button type="submit" disabled={busy} aria-busy={busy} className={`flex w-full items-center justify-center rounded-xl px-5 py-3.5 text-sm font-bold text-white focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60 ${variant === "login" ? "bg-[#08295C] shadow-lg shadow-blue-900/15 transition-all hover:bg-[#0B3A78] hover:shadow-xl focus:ring-blue-100" : "bg-blue-600 shadow-sm transition hover:bg-blue-700 focus:ring-blue-200"}`}>{busy ? "Please wait..." : children}</button>;
}
