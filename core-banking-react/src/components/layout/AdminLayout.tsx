import { useState, useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { forceLogout } from '../../features/auth/authSlice';
import type { AppDispatch } from '../../lib/redux';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

interface AdminLayoutProps {
  children: ReactNode;
  pageTitle?: string;
}

export default function AdminLayout({ children, pageTitle }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    const channel = new BroadcastChannel('staff_auth_sync');

    channel.onmessage = (event: MessageEvent) => {
      if (event.data === 'LOGOUT') {
        dispatch(forceLogout());
        navigate('/login', { replace: true });
      }
    };

    return () => {
      channel.close();
    };
  }, [dispatch, navigate]);

  return (
    <div className="relative flex h-screen w-full overflow-hidden bg-[#F8FAFC] text-slate-900 font-sans selection:bg-sky-500 selection:text-white">
      {/* Fixed / Stationary Clean White Sidebar */}
      <Sidebar isOpen={sidebarOpen} />

      {/* Main Content Column (independently scrollable) */}
      <div className="relative z-10 flex flex-1 flex-col h-full min-w-0 overflow-hidden bg-[#F8FAFC]">
        {/* Sticky/Fixed Navbar at top of main area */}
        <Navbar
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
          pageTitle={pageTitle}
        />

        {/* The ONLY independently scrollable viewport area */}
        <main className="flex-1 overflow-y-auto scroll-smooth p-4 sm:p-6 lg:p-8 animate-fluid-enter">
          {children}
        </main>
      </div>
    </div>
  );
}
