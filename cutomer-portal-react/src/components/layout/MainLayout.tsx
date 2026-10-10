
import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

export default function MainLayout() {
  return (
    <div className="min-h-screen bg-[#F5F7FB]">
      {/* Sidebar */}
      <Sidebar />

      {/* Top Navbar */}
      <Navbar />

      {/* Main Content */}
      <main className="ml-64 pt-20">
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
