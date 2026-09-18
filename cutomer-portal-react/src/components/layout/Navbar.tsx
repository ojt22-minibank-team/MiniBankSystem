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
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />

        <input
          type="text"
          placeholder="Search..."
          className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-blue-500"
        />
      </div>

      {/* Right */}
      <div className="flex items-center gap-6">

        <button className="relative text-slate-500">
          <Bell size={20} />

          <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-red-500" />
        </button>

        <div className="flex items-center gap-3">

          <img
            src={customer.profileImage}
            alt="profile"
            className="h-10 w-10 rounded-full object-cover"
          />

          <div>
            <p className="text-sm font-semibold text-slate-800">
              {customer.fullName}
            </p>

            <p className="text-xs text-slate-400">
              {customer.role}
            </p>
          </div>

          <ChevronDown size={16} className="text-slate-400" />

        </div>
      </div>
    </header>
  );
}