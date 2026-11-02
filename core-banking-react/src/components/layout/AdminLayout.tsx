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
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} />

      {/* Main content area */}
      <div className="flex flex-1 flex-col min-w-0">
        <Navbar
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
          pageTitle={pageTitle}
        />
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
