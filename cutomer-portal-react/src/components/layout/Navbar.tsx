import {
  Search,
  HelpCircle,
  ShieldCheck,
  User,
  Building2,
} from "lucide-react";

import { useNavigate } from "react-router-dom";
import { useAppSelector, type RootState } from "../../lib/redux";
import { NotificationDropdown } from "../../features/notifications/components/NotificationDropdown";

export default function Navbar() {
  const navigate = useNavigate();

  const profile = useAppSelector(
    (state: RootState) => state.profile.profile
  );

  const customerType = profile?.customerType?.toUpperCase();
  const isCompany = customerType === "COMPANY" || customerType === "CORPORATE";

  const customerName = isCompany
    ? profile?.companyName || "Company Customer"
    : `${profile?.firstName || ""} ${profile?.lastName || ""}`.trim() || "Customer";

  const initials = isCompany
    ? profile?.companyName?.[0] || "C"
    : `${profile?.firstName?.[0] || ""}${profile?.lastName?.[0] || ""}`.toUpperCase() || "U";

  return (
    <header className="no-print fixed left-64 right-0 top-0 z-20 flex h-20 items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0A192F] px-8 transition-colors duration-200">
      {/* SEARCH */}
      <div className="flex items-center">
        <div className="relative w-[360px]">
          <Search
            size={18}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
          />
          <input
            type="search"
            placeholder="Search accounts or transactions"
            aria-label="Search accounts or transactions"
            className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/80 pl-10 pr-4 text-sm text-slate-700 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-600 focus:border-[#00A3C4] focus:bg-white dark:focus:bg-slate-800 focus:ring-4 focus:ring-cyan-50 dark:focus:ring-cyan-950/40"
          />
        </div>
      </div>

      {/* RIGHT SECTION */}
      <div className="flex items-center gap-2">
        {/* HELP */}
        <button
          type="button"
          aria-label="Help and Support"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 transition hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-[#0A192F] dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-100 dark:focus:ring-cyan-950 cursor-pointer"
        >
          <HelpCircle size={19} />
        </button>

        {/* NOTIFICATIONS DROPDOWN */}
        <NotificationDropdown />

        {/* DIVIDER */}
        <div className="mx-3 h-8 w-px bg-slate-200 dark:bg-slate-800" />

        {/* SECURITY */}
        <div className="hidden items-center gap-2 xl:flex">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/50">
            <ShieldCheck size={16} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="leading-tight">
            <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Security
            </p>
            <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              Protected
            </p>
          </div>
        </div>

        {/* PROFILE PILL (Navigates directly to /profile) */}
        <button
          type="button"
          onClick={() => navigate("/profile")}
          className="group ml-3 flex items-center gap-3 rounded-2xl p-1.5 pr-3 transition-all duration-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 focus:outline-none focus:ring-2 focus:ring-cyan-100 dark:focus:ring-cyan-950 cursor-pointer"
          title="View Profile"
          aria-label="View Profile"
        >
          {/* AVATAR */}
          <div className="relative shrink-0">
            {profile?.profileImageUrl ? (
              <img
                src={profile.profileImageUrl}
                alt={customerName}
                className="h-10 w-10 rounded-full object-cover ring-2 ring-slate-100 dark:ring-slate-800 transition group-hover:ring-[#00A3C4]/40"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0A192F] dark:bg-[#153564] text-sm font-bold text-white ring-2 ring-slate-100 dark:ring-slate-800 transition group-hover:ring-[#00A3C4]/40">
                {initials}
              </div>
            )}
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#0A192F]" />
          </div>

          {/* CUSTOMER INFO */}
          <div className="hidden min-w-0 text-left sm:block">
            <div className="flex items-center gap-1.5">
              {isCompany ? (
                <Building2 size={12} className="shrink-0 text-slate-400 dark:text-slate-500" />
              ) : (
                <User size={12} className="shrink-0 text-slate-400 dark:text-slate-500" />
              )}
              <p className="max-w-[150px] truncate text-sm font-semibold text-slate-800 dark:text-slate-100 transition-colors group-hover:text-[#00A3C4]">
                {customerName}
              </p>
            </div>
            <p className="mt-0.5 max-w-[150px] truncate text-[11px] font-medium text-slate-400 dark:text-slate-500">
              {profile?.customerCode ?? "No customer ID"}
            </p>
          </div>
        </button>
      </div>
    </header>
  );
}
