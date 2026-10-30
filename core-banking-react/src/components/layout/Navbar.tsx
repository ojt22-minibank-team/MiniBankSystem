import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/hooks/useAuth';

interface NavbarProps {
  onToggleSidebar?: () => void;
  pageTitle?: string;
}

export default function Navbar({ onToggleSidebar, pageTitle = 'Dashboard' }: NavbarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const { isAdmin, isTeller } = useAuth();

  const handleQuickAction = () => {
    if (isAdmin || isTeller) {
      navigate('/admin/transfers');
    } else {
      navigate('/admin/dashboard');
    }
  };

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between px-6 sm:px-8 py-3.5 bg-white border-b border-slate-200/80 shadow-[0_1px_3px_0_rgba(15,23,42,0.02)]">
      {/* Left: Mobile Toggle + Page Title */}
      <div className="flex items-center gap-3.5">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="rounded-lg p-2 bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors focus:outline-none lg:hidden cursor-pointer"
            aria-label="Toggle sidebar"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
        )}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {pageTitle}
          </h1>
          <p className="hidden sm:block text-[11px] text-slate-400 font-medium -mt-0.5">
            EKARAJ BANK Core Banking Portal
          </p>
        </div>
      </div>

      {/* Right: Clean Search + Primary CTA */}
      <div className="flex items-center gap-3">
        {/* Search Input */}
        <div className="relative w-44 sm:w-64">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search accounts, clients..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50/70 py-1.5 pl-8.5 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-100 transition-all shadow-xs"
          />
        </div>

        {/* Primary CTA */}
        {(isAdmin || isTeller) && (
          <button
            type="button"
            onClick={handleQuickAction}
            className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white px-3.5 py-2 text-xs font-semibold shadow-xs transition-all duration-200 ease-in-out hover:-translate-y-0.5 active:translate-y-0 shrink-0 cursor-pointer"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span>New Transfer</span>
          </button>
        )}
      </div>
    </header>
  );
}
