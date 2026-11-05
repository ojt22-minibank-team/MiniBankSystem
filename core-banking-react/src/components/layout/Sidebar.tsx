import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/hooks/useAuth';
import ekarajCrown from '../../assets/ekaraj-crown-transparent.png';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
}

interface SidebarProps {
  isOpen?: boolean;
}

export default function Sidebar({ isOpen = true }: SidebarProps) {
  const { logout, user, isAdmin, isAuditor } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const displayName = user?.username
    ? user.username.charAt(0).toUpperCase() + user.username.slice(1)
    : 'Admin';

  const userRole = user?.roles?.[0]?.replace('ROLE_', '') || 'ADMIN';
  const userEmail = `${displayName.toLowerCase()}@ekarajbank.com.mm`;

  // Navigation Links matching user specification and core banking routes
  const navItems: NavItem[] = [
    {
      to: '/admin/dashboard',
      label: 'Dashboard',
      icon: (
        <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
        </svg>
      ),
    },
    {
      to: '/admin/accounts',
      label: 'Customer Accounts',
      icon: (
        <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
        </svg>
      ),
    },
    {
      to: '/admin/customers',
      label: 'Customers',
      icon: (
        <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
        </svg>
      ),
    },
    {
      to: '/admin/transfers',
      label: 'Transactions',
      icon: (
        <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
        </svg>
      ),
    },
    {
      to: '/admin/otc',
      label: 'VIP Overdrafts & OTC',
      icon: (
        <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  if (isAdmin || isAuditor) {
    navItems.push({
      to: '/admin/staff',
      label: 'Staff Management',
      icon: (
        <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
        </svg>
      ),
    });
  }

  if (isAdmin) {
    navItems.push({
      to: '/admin/system-rules',
      label: 'System Rules',
      icon: (
        <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" />
        </svg>
      ),
    });
  }

  navItems.push({
    to: '/admin/announcements',
    label: 'Announcements',
    icon: (
      <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
      </svg>
    ),
  });

  if (isAdmin || isAuditor) {
    navItems.push(
      {
        to: '/admin/reporting',
        label: 'Operational Analytics',
        icon: (
          <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
          </svg>
        ),
      },
      {
        to: '/admin/audit-logs',
        label: 'Audit Logs',
        icon: (
          <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
          </svg>
        ),
      }
    );
  }

  return (
    <aside
      className={[
        'flex flex-col h-full bg-white border-r border-slate-200/80 shadow-[1px_0_2px_0_rgba(15,23,42,0.02)] z-30 shrink-0 select-none transition-all duration-300 ease-in-out',
        isOpen ? 'w-64' : 'w-0 -translate-x-full lg:w-64 lg:translate-x-0',
      ].join(' ')}
    >
      {/* ── EKARAJ BANK Brand Header with Real Crown Logo ────────── */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          {/* Animated 3D Floating Crown Logo */}
          <div className="relative group">
            <div className="absolute -inset-1 rounded-full bg-sky-400/20 blur-md opacity-0 group-hover:opacity-100 transition duration-500" />
            <img
              src={ekarajCrown}
              alt="EKARAJ BANK"
              className="relative h-9 w-auto object-contain filter drop-shadow-[0_2px_8px_rgba(2,132,199,0.25)] transition-transform duration-300 group-hover:scale-105 group-hover:-translate-y-0.5 animate-gentle-float"
            />
          </div>
          <div>
            <span className="text-[15px] font-black tracking-tight text-slate-900 block leading-tight">
              EKARAJ BANK
            </span>
            <span className="text-[10px] font-bold text-sky-600 block tracking-wider uppercase mt-0.5">
              ဧကရာဇ် ဘဏ် · Core Portal
            </span>
          </div>
        </div>
      </div>

      {/* ── Admin Profile Card ───────────────────────────────── */}
      <div className="px-4 py-3.5 border-b border-slate-100 shrink-0 bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-100 text-sky-700 font-bold text-xs border border-sky-200/80 shadow-xs">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white animate-pulse" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1">
              <h3 className="text-xs font-bold text-slate-900 truncate">
                {displayName}
              </h3>
              <span className="rounded-full bg-sky-100 text-sky-700 px-1.5 py-0.5 text-[9px] font-bold uppercase">
                {userRole}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate mt-0.5">
              {userEmail}
            </p>
          </div>
        </div>
      </div>

      {/* ── Navigation Links (Flex-1 & Scrollable) ────────────── */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Navigation
        </p>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 px-3 py-2 text-xs transition-all duration-200 ease-in-out rounded-r-lg',
                isActive
                  ? 'border-l-4 border-sky-500 bg-sky-50/70 text-sky-600 font-semibold shadow-xs'
                  : 'text-[#475569] hover:text-slate-900 hover:bg-slate-50 hover:translate-x-0.5 font-medium',
              ].join(' ')
            }
          >
            <span className="shrink-0">{item.icon}</span>
            <span className="truncate">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* ── Permanently Pinned Logout Button at the Bottom ────── */}
      <div className="mt-auto border-t border-slate-100 p-3 shrink-0">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold text-[#475569] hover:text-rose-600 hover:bg-rose-50 transition-all duration-200 ease-in-out focus:outline-none cursor-pointer"
        >
          <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
          </svg>
          <span>Log out</span>
        </button>
      </div>
    </aside>
  );
}
