import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import { ToastContainer } from "../../features/notifications/components/ToastContainer";
import { setProfile } from "../../features/customer-account/profile/store/ProfileSlice";
import { getMyProfile } from "../../features/customer-account/profile/api/profileApi";
import { fetchMyAccounts } from "../../features/customer-account/accounts/stores/accountsSlice";
import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../../lib/redux";

export default function MainLayout() {
  const dispatch = useAppDispatch();

  const profile = useAppSelector((state) => state.profile.profile);
  const accounts = useAppSelector((state) => state.accounts.accounts);

  // Load profile once on mount
  useEffect(() => {
    if (profile) return;

    const loadProfile = async () => {
      try {
        const data = await getMyProfile();
        dispatch(setProfile(data));
      } catch (error) {
        console.error("Failed to initialize customer profile:", error);
      }
    };

    void loadProfile();
  }, [profile, dispatch]);

  // Load accounts once on mount
  useEffect(() => {
    if (accounts.length > 0) return;
    dispatch(fetchMyAccounts());
  }, [accounts.length, dispatch]);

  return (
    <div className="min-h-screen bg-[#F4F6F9] dark:bg-[#060E1A] text-[#0A192F] dark:text-slate-100 flex flex-col transition-colors duration-200">
      {/* Real-time Toast Notifications */}
      <ToastContainer />

      {/* Sidebar */}
      <Sidebar />

      {/* Top Navbar */}
      <Navbar />

      {/* Main Content */}
      <main className="ml-64 pt-20 flex-1 bg-[#F4F6F9] dark:bg-[#060E1A] transition-colors duration-200">
        <div className="p-4 sm:p-6 lg:p-8 min-h-[calc(100vh-5rem)] bg-[#F4F6F9] dark:bg-[#060E1A] transition-colors duration-200">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
