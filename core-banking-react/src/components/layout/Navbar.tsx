interface NavbarProps {
  onToggleSidebar?: () => void;
  pageTitle?: string;
}

export default function Navbar({ onToggleSidebar, pageTitle = 'Dashboard' }: NavbarProps) {
  return (
    <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6 py-3 shadow-xs min-w-0 shrink-0">
      {/* Left — hamburger + page title */}
      <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1 mr-2">
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="shrink-0 rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer active:scale-95 transition-all"
            aria-label="Toggle sidebar"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
        <h1 className="text-base sm:text-lg font-bold text-gray-800 truncate whitespace-nowrap">
          {pageTitle}
        </h1>
      </div>
    </header>
  );
}
