import { useState, type ReactNode } from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

interface AdminLayoutProps {
  children: ReactNode;
  pageTitle?: string;
}

export default function AdminLayout({ children, pageTitle }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="relative flex h-screen w-full overflow-hidden bg-[#F4F7FC] text-slate-900 font-sans selection:bg-sky-500 selection:text-white">
      {/* Dynamic Ambient Liquid Mesh Orbs in Background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 h-[480px] w-[480px] rounded-full bg-gradient-to-br from-sky-400/20 to-blue-500/10 blur-[120px]" />
        <div className="absolute top-1/4 -right-32 h-[500px] w-[500px] rounded-full bg-gradient-to-bl from-indigo-400/15 via-purple-300/10 to-transparent blur-[140px]" />
        <div className="absolute -bottom-40 left-1/4 h-[550px] w-[550px] rounded-full bg-gradient-to-tr from-cyan-300/20 to-sky-200/15 blur-[130px]" />
        <div className="absolute top-2/3 right-1/4 h-80 w-80 rounded-full bg-rose-200/15 blur-[120px]" />
      </div>

      {/* Frosted Glass Stationary Sidebar */}
      <Sidebar isOpen={sidebarOpen} />

      {/* Main Content Column */}
      <div className="relative z-10 flex flex-1 flex-col h-full min-w-0 overflow-hidden">
        {/* Frosted Glass Sticky Navbar */}
        <Navbar
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
          pageTitle={pageTitle}
        />

        {/* Independently Scrollable Main Viewport */}
        <main className="flex-1 overflow-y-auto scroll-smooth p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
