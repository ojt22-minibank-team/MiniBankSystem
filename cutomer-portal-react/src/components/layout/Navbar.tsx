
import {
  Bell,
  Search,
  ChevronDown,
  HelpCircle,
  ShieldCheck,
} from "lucide-react";

import { customer } from "../../features/customer-account/data/mockData";

export default function Navbar() {
  return (
    <header className="fixed left-64 right-0 top-0 z-20 flex h-20 items-center justify-between border-b border-slate-200 bg-white px-8">

      {/* =====================================================
          LEFT - SEARCH
      ====================================================== */}
      <div className="flex items-center">
        <div className="relative w-[360px]">

          <Search
            size={18}
            strokeWidth={2}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            type="search"
            placeholder="Search accounts or transactions"
            aria-label="Search accounts or transactions"
            className="
              h-10
              w-full
              rounded-xl
              border
              border-slate-200
              bg-slate-50
              pl-10
              pr-4
              text-sm
              text-slate-700
              placeholder:text-slate-400
              outline-none
              transition-all
              duration-200
              hover:border-slate-300
              focus:border-[#0878E8]
              focus:bg-white
              focus:ring-4
              focus:ring-blue-50
            "
          />
        </div>
      </div>

      {/* =====================================================
          RIGHT SECTION
      ====================================================== */}
      <div className="flex items-center gap-2">

        {/* Help */}
        <button
          type="button"
          aria-label="Help and Support"
          className="
            flex
            h-10
            w-10
            items-center
            justify-center
            rounded-xl
            text-slate-500
            transition
            hover:bg-slate-50
            hover:text-[#08295C]
            focus:outline-none
            focus:ring-2
            focus:ring-blue-100
          "
        >
          <HelpCircle size={19} strokeWidth={2} />
        </button>

        {/* Notifications */}
        <button
          type="button"
          aria-label="Notifications"
          className="
            relative
            flex
            h-10
            w-10
            items-center
            justify-center
            rounded-xl
            text-slate-500
            transition
            hover:bg-slate-50
            hover:text-[#08295C]
            focus:outline-none
            focus:ring-2
            focus:ring-blue-100
          "
        >
          <Bell size={19} strokeWidth={2} />

          {/* Notification Badge */}
          <span
            className="
              absolute
              right-2
              top-2
              h-2
              w-2
              rounded-full
              bg-red-500
              ring-2
              ring-white
            "
          />
        </button>

        {/* Divider */}
        <div className="mx-3 h-8 w-px bg-slate-200" />

        {/* =================================================
            SECURITY STATUS
        ================================================== */}
        <div className="hidden items-center gap-2 xl:flex">

          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50">
            <ShieldCheck
              size={16}
              strokeWidth={2}
              className="text-emerald-600"
            />
          </div>

          <div className="leading-tight">
            <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
              Security
            </p>

            <p className="text-xs font-semibold text-emerald-600">
              Protected
            </p>
          </div>
        </div>

        {/* =================================================
            PROFILE
        ================================================== */}
        <button
          type="button"
          aria-label="Open profile menu"
          className="
            group
            ml-3
            flex
            items-center
            gap-3
            rounded-xl
            p-1.5
            pr-2.5
            transition
            hover:bg-slate-50
            focus:outline-none
            focus:ring-2
            focus:ring-blue-100
          "
        >

          {/* Avatar */}
          <div className="relative shrink-0">

            <img
              src={customer.profileImage}
              alt={`${customer.fullName} profile`}
              className="
                h-10
                w-10
                rounded-full
                object-cover
                ring-2
                ring-slate-100
              "
            />

            {/* Online Status */}
            <span
              className="
                absolute
                bottom-0
                right-0
                h-2.5
                w-2.5
                rounded-full
                bg-emerald-500
                ring-2
                ring-white
              "
            />
          </div>

          {/* Customer Info */}
          <div className="hidden min-w-0 text-left sm:block">

            <p className="max-w-[150px] truncate text-sm font-semibold text-slate-800">
              {customer.fullName}
            </p>

            <p className="mt-0.5 text-[11px] font-medium text-slate-400">
              {customer.role}
            </p>

          </div>

          {/* Dropdown */}
          <ChevronDown
            size={16}
            strokeWidth={2}
            className="
              text-slate-400
              transition-transform
              duration-200
              group-hover:text-slate-600
            "
          />
        </button>
      </div>
    </header>
  );
}

