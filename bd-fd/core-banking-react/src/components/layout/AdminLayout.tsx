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
