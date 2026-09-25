
import {
  LayoutDashboard,
  WalletCards,
  ArrowLeftRight,
  History,
  User,
  Settings,
  LogOut,
} from "lucide-react";
import { NavLink } from "react-router-dom";

const menuItems = [
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
    name: "Transfer",
    path: "/transfer",
    icon: ArrowLeftRight,
  },
  {
    name: "Transaction History",
    path: "/transaction",
    icon: History,
  },
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
];

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 z-30 flex h-screen w-64 flex-col bg-[#08295C] text-white">
      {/* Logo */}
      <div className="flex h-20 items-center gap-3 border-b border-white/10 px-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-xl">
          🏦
        </div>

        <div className="min-w-0">
          <h1 className="text-lg font-bold tracking-tight">
            MiniBank
          </h1>

          <p className="text-xs text-blue-200">
            Customer Portal
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1.5 overflow-y-auto px-4 py-6">
        {menuItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-4 py-3 text-sm transition ${
                  isActive
                    ? "bg-[#0878E8] font-semibold text-white shadow-sm"
                    : "text-blue-100 hover:bg-white/10 hover:text-white"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={19}
                    strokeWidth={isActive ? 2.3 : 2}
                    className="shrink-0"
                  />

                  <span className="truncate">
                    {item.name}
                  </span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="border-t border-white/10 p-4">
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm text-blue-100 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          <LogOut size={19} className="shrink-0" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
