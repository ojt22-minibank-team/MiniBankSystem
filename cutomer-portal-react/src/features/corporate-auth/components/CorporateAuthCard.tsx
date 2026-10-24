import type { ReactNode } from "react";
import { Check, Headphones, KeyRound, Landmark, Mail, ShieldCheck } from "lucide-react";

interface Props {
  title: string;
  description: string;
  variant?: "login" | "verification" | "setup";
  children: ReactNode;
}

// Corporate-owned presentation using the Individual auth layouts as visual references.
export default function CorporateAuthCard({ title, description, variant = "verification", children }: Props) {
  const login = variant === "login";
  return <div className="flex min-h-screen flex-col bg-[#F3F7FB]">
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex min-h-[72px] w-full max-w-[1450px] items-center justify-between px-5 md:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#08295C] text-white shadow-sm"><Landmark size={23} /></div>
          <div><p className="text-xl font-bold text-[#08295C]">ACE Bank</p><p className="mt-0.5 text-xs text-slate-400">Corporate Banking Portal</p></div>
        </div>
        <div className="flex items-center gap-6">
          <span className="hidden items-center gap-2 text-sm font-semibold text-emerald-600 md:flex"><ShieldCheck size={18} />Secure Banking</span>
          <span className="flex items-center gap-2 text-sm font-semibold text-blue-600"><Headphones size={18} /><span className="hidden sm:inline">Help &amp; Support</span></span>
        </div>
      </div>
    </header>
    <main className="flex flex-1 items-center justify-center px-4 py-8 md:px-8">
      <div className={`relative w-full max-w-6xl overflow-hidden rounded-3xl border bg-white ${login ? "border-white/60 shadow-2xl shadow-slate-900/20" : "border-slate-200 shadow-xl shadow-slate-200/70"}`}>
        <div className={`grid ${login ? "min-h-[620px] md:grid-cols-2" : "min-h-[610px] md:grid-cols-[0.9fr_1.1fr]"}`}>
          {login ? <div className="relative hidden min-h-[620px] overflow-hidden md:block">
            <img src="/images.jfif" alt="ACE Bank Building" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-[#06254D]/45" /><div className="absolute inset-0 bg-gradient-to-t from-[#031B36]/90 via-[#06254D]/30 to-transparent" />
            <div className="relative z-10 flex h-full flex-col items-center justify-center px-10 text-center text-white">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-white/30 bg-white/15 shadow-lg backdrop-blur-md"><Landmark size={30} strokeWidth={1.8} /></div>
              <h2 className="text-3xl font-extrabold tracking-wide drop-shadow-lg lg:text-4xl">WELCOME TO ACE BANK</h2>
              <div className="my-5 h-1 w-20 rounded-full bg-cyan-400" />
              <p className="max-w-md text-sm leading-6 text-blue-50 drop-shadow-md lg:text-base">Securely access your company’s banking services and stay connected with ACE Bank.</p>
              <div className="absolute right-0 bottom-10 left-0 px-8"><p className="text-sm font-semibold tracking-wide">Your Trust, Our Priority</p><p className="mt-1 text-xs text-blue-100">Secure • Simple • Convenient</p></div>
            </div>
          </div> : <div className="relative hidden overflow-hidden bg-gradient-to-br from-[#08295C] via-[#0B3A78] to-[#125AA3] p-10 text-white md:flex md:flex-col md:justify-between lg:p-12">
            <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-white/5" /><div className="absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-white/5" />
            <div className="relative z-10"><div className="mb-8 flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm"><ShieldCheck size={27} /></div><div><p className="text-2xl font-bold">ACE Bank</p><p className="mt-0.5 text-xs text-blue-100">Corporate Banking Portal</p></div></div>
              <h2 className="max-w-md text-3xl leading-tight font-bold lg:text-4xl">Protecting your business,<br />every step of the way.</h2>
              <p className="mt-5 max-w-md text-sm leading-7 text-blue-100 lg:text-base">An additional security layer before you access your Corporate Banking account.</p>
            </div>
            <div className="relative z-10 mt-8 rounded-2xl border border-white/15 bg-white/10 p-6 backdrop-blur-sm">
              <div className="mb-5 flex items-center gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15"><KeyRound size={24} /></div><div><h3 className="text-lg font-bold">Two-Step Security</h3><p className="mt-1 text-xs text-blue-100">Verify your identity securely</p></div></div>
              <div className="space-y-4">{(variant === "setup" ? ["Complete setup within 10 minutes", "Keep your password and PIN private", "Use only your registered Corporate user"] : ["OTP expires in 5 minutes", "Never share your OTP with anyone", "Only use the latest OTP sent to you"]).map(text => <p key={text} className="flex items-center gap-3 text-sm text-blue-50"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-400/20 text-emerald-200"><Check size={16} /></span>{text}</p>)}</div>
            </div>
          </div>}
          <div className={`flex items-center justify-center bg-white py-10 lg:px-16 ${login ? "px-7 sm:px-12" : "px-6 sm:px-10"}`}>
            <div className={`w-full ${login ? "max-w-md" : "max-w-lg"}`}>
              <div className="mb-8 flex items-center gap-3 md:hidden"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#08295C] text-white"><Landmark size={22} /></div><div><p className="text-xl font-bold text-[#08295C]">ACE Bank</p><p className="text-xs text-slate-400">Corporate Banking Portal</p></div></div>
              {!login && <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">{variant === "setup" ? <KeyRound size={30} /> : <Mail size={30} />}</div>}
              <div className={login ? "mb-8" : "mb-7"}><p className={`mb-2 uppercase ${login ? "text-xs font-bold tracking-[0.2em] text-cyan-600" : "text-sm font-semibold tracking-wider text-blue-600"}`}>Corporate Banking</p><h1 className={`text-3xl tracking-tight text-[#08295C] lg:text-4xl ${login ? "font-extrabold" : "font-bold"}`}>{title}</h1><p className="mt-3 text-sm leading-6 text-slate-500">{description}</p></div>
              {children}
            </div>
          </div>
        </div>
      </div>
    </main>
    <footer className="border-t border-slate-200 bg-white"><div className="mx-auto flex min-h-[56px] w-full max-w-[1450px] flex-col items-center justify-center gap-1 px-5 py-3 text-center md:flex-row md:justify-between md:px-8 md:text-left"><p className="text-xs text-slate-400">© 2026 ACE Bank. All rights reserved.</p><p className="text-xs text-slate-400">Secure • Simple • Convenient</p></div></footer>
  </div>;
}
