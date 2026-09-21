
import {
  Bell,
  Search,
  ChevronDown,
} from "lucide-react";

import { customer } from "../../features/customer-account/data/mockData";

export default function Navbar() {
  return (
    <header className="fixed left-64 right-0 top-0 z-20 flex h-20 items-center justify-between border-b border-slate-200 bg-white px-8">
      {/* Search */}
      <div className="relative w-80">
        <Search
          size={18}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />

        <input
          type="text"
          placeholder="Search..."
          className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
        />
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-6">
        {/* Notification */}
        <button
          type="button"
          aria-label="Notifications"
          className="relative rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
        >
          <Bell size={20} />

          {/* Notification Badge */}
          <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
        </button>

        {/* Profile */}
        <button
          type="button"
          className="flex items-center gap-3 rounded-lg p-1.5 transition hover:bg-slate-50"
        >
          <img
            src={customer.profileImage}
            alt={`${customer.fullName} profile`}
            className="h-10 w-10 rounded-full object-cover"
          />

          <div className="text-left">
            <p className="text-sm font-semibold text-slate-800">
              {customer.fullName}
            </p>

            <p className="text-xs text-slate-400">
              {customer.role}
            </p>
          </div>

          <ChevronDown
            size={16}
            className="text-slate-400"
          />
        </button>
      </div>
    </header>
  );
}
