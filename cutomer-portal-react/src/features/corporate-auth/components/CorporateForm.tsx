import { useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff, LockKeyhole, UserRound } from "lucide-react";
import { AuthCodeField } from "../../auth/components/IndividualAuthUI";
import { authCodeInputClass, authCodeToggleClass, authInputClass, authPrimaryButtonClass, authToggleButtonClass } from "../../auth/components/IndividualAuthStyles";

export function CorporateField({ label, id, secret = false, code = false, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; id: string; secret?: boolean; code?: boolean }) {
  const [visible, setVisible] = useState(false);
  const Icon = secret ? LockKeyhole : UserRound;
  const input = <input {...props} id={id} name={id} type={secret ? (visible ? "text" : "password") : (props.type || "text")}
    className={code ? authCodeInputClass : `${authInputClass} pl-11 ${secret ? "pr-12" : "pr-4"}`} />;
  return <div><label htmlFor={id} className="mb-1.5 block text-xs font-semibold text-[#08295C]">{label}</label><div className={code ? "flex items-center gap-2" : "relative"}>
    {!code && <Icon aria-hidden="true" size={18} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-slate-400" />}
    {code ? <AuthCodeField value={String(props.value ?? "")} masked={secret && !visible}>{input}</AuthCodeField> : input}
    {secret && <button type="button" disabled={props.disabled} onClick={() => setVisible(value => !value)} aria-label={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`} aria-pressed={visible} className={code ? authCodeToggleClass : authToggleButtonClass}>{visible ? <EyeOff size={20} /> : <Eye size={20} />}</button>}
  </div></div>;
}

export function CorporateNotice({ message, error = false }: { message: string; error?: boolean }) {
  if (!message) return null;
  return <div role={error ? "alert" : "status"} aria-live={error ? "assertive" : "polite"} className={`rounded-xl border px-3 py-2 text-sm leading-5 ${error ? "border-red-100 bg-red-50 text-red-700" : "border-emerald-100 bg-emerald-50 text-emerald-700"}`}>{message}</div>;
}

export function CorporateSubmit({ busy, children, variant = "login" }: { busy: boolean; children: React.ReactNode; variant?: "login" | "verification" }) {
  return <button type="submit" disabled={busy} aria-busy={busy} data-variant={variant} className={authPrimaryButtonClass}>
    {busy && <span aria-hidden="true" className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-white/30 border-t-white motion-reduce:animate-none" />}
    {busy ? "Please wait..." : children}
  </button>;
}
