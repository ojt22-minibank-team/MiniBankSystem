import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/hooks/useAuth';

interface NavbarProps {
  onToggleSidebar?: () => void;
  pageTitle?: string;
}

export default function Navbar({ onToggleSidebar, pageTitle = 'Dashboard' }: NavbarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4 shadow-sm">
      {/* Left — hamburger + page title */}
      <div className="flex items-center gap-4">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Toggle sidebar"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
        <h1 className="text-lg font-semibold text-gray-800">{pageTitle}</h1>
      </div>

      {/* Right — user info + logout */}
      <div className="flex items-center gap-4">
        {/* Role badges */}
        <div className="hidden sm:flex items-center gap-2">
          {user?.roles?.map((role) => (
            <span
              key={role}
              className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700"
            >
              {role}
            </span>
          ))}
        </div>

        {/* Username */}
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
            {user?.username?.charAt(0).toUpperCase() ?? 'A'}
          </div>
          <span className="hidden md:block text-sm font-medium text-gray-700">
            {user?.username}
          </span>
        </div>

        {/* Logout button */}
        <button
          onClick={handleLogout}
          className="hidden sm:flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:border-red-300 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Logout
        </button>
      </div>
    </header>
  );
}
