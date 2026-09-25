
import {
  LayoutDashboard,
  WalletCards,
  ArrowLeftRight,
  History,
  Users,
  User,
  Settings,
  HelpCircle,
  LogOut,
  Building2,
  ChevronRight,
} from "lucide-react";
import { NavLink } from "react-router-dom";

const mainMenuItems = [
  {
    name: "Dashboard",
    path: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "My Accounts",
    path: "/accounts",
    icon: WalletCards,
  },
  {
    name: "Transfer & Payments",
    path: "/transfer",
    icon: ArrowLeftRight,
  },
  {
    name: "Transaction History",
    path: "/transaction",
    icon: History,
  },
  {
    name: "Beneficiaries",
    path: "/beneficiaries",
    icon: Users,
  },
];

const accountMenuItems = [
  {
    name: "Profile",
    path: "/profile",
    icon: User,
  },
  {
    name: "Settings",
    path: "/settings",
    icon: Settings,
  },
  {
    name: "Help & Support",
    path: "/support",
    icon: HelpCircle,
  },
];

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 z-30 flex h-screen w-64 flex-col border-r border-slate-200 bg-white">

      {/* =====================================================
          BRAND
      ====================================================== */}
      <div className="flex h-20 shrink-0 items-center border-b border-slate-100 px-6">
        <div className="flex items-center gap-3">

          {/* Bank Logo */}
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#08295C] text-white shadow-sm">
            <Building2
              size={21}
              strokeWidth={2.2}
            />
          </div>

          {/* Brand */}
          <div className="min-w-0">
            <h1 className="text-[17px] font-bold tracking-tight text-[#08295C]">
              MiniBank
            </h1>

            <p className="text-[11px] font-medium text-slate-400">
              Customer Portal
            </p>
          </div>
        </div>
      </div>

      {/* =====================================================
          NAVIGATION
      ====================================================== */}
      <nav className="flex-1 overflow-y-auto px-4 py-6">

        {/* Main Navigation */}
        <div className="mb-7">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
            Banking
          </p>

          <div className="space-y-1">
            {mainMenuItems.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200 ${
                      isActive
                        ? "bg-[#EAF3FF] font-semibold text-[#0878E8]"
                        : "font-medium text-slate-600 hover:bg-slate-50 hover:text-[#08295C]"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {/* Icon Container */}
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-all duration-200 ${
                          isActive
                            ? "bg-[#0878E8] text-white shadow-sm"
                            : "bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-[#08295C]"
                        }`}
                      >
                        <Icon
                          size={17}
                          strokeWidth={isActive ? 2.3 : 2}
                        />
                      </div>

                      {/* Label */}
                      <span className="flex-1 truncate">
                        {item.name}
                      </span>

                      {/* Active Indicator */}
                      {isActive && (
                        <ChevronRight
                          size={15}
                          strokeWidth={2.5}
                          className="shrink-0 text-[#0878E8]"
                        />
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        </div>

        {/* Account Navigation */}
        <div>
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
            Account
          </p>

          <div className="space-y-1">
            {accountMenuItems.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200 ${
                      isActive
                        ? "bg-[#EAF3FF] font-semibold text-[#0878E8]"
                        : "font-medium text-slate-600 hover:bg-slate-50 hover:text-[#08295C]"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-all duration-200 ${
                          isActive
                            ? "bg-[#0878E8] text-white shadow-sm"
                            : "bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-[#08295C]"
                        }`}
                      >
                        <Icon
                          size={17}
                          strokeWidth={isActive ? 2.3 : 2}
                        />
                      </div>

                      <span className="flex-1 truncate">
                        {item.name}
                      </span>

                      {isActive && (
                        <ChevronRight
                          size={15}
                          strokeWidth={2.5}
                          className="shrink-0 text-[#0878E8]"
                        />
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        </div>
      </nav>

      {/* =====================================================
          CUSTOMER PROFILE + LOGOUT
      ====================================================== */}
      <div className="shrink-0 border-t border-slate-100 p-4">

        {/* Customer Card */}
        <div className="mb-3 rounded-xl bg-slate-50 p-3">

          <div className="flex items-center gap-3">

            {/* Avatar */}
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#08295C] text-xs font-bold text-white">
              JD
            </div>

            {/* Customer Info */}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-800">
                John Doe
              </p>

              <p className="truncate text-[11px] text-slate-400">
                Personal Account
              </p>
            </div>
          </div>
        </div>

        {/* Logout */}
        <button
          type="button"
          className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 transition-all duration-200 hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-200"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 transition-colors duration-200 group-hover:bg-red-100">
            <LogOut size={17} />
          </div>

          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}

