
import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import { setProfile } from "../../features/customer-account/profile/ProfileSlice";
import { getMyProfile } from "../../features/customer-account/api/profileApi";
import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../../lib/redux";

export default function MainLayout() {
   const dispatch = useAppDispatch();

  const profile = useAppSelector(
    (state) => state.profile.profile
  );

  useEffect(() => {
    if (profile) {
      return;
    }

    const loadProfile = async () => {
      try {
        const data = await getMyProfile();

        dispatch(setProfile(data));
      } catch (error) {
        console.error(
          "Failed to initialize customer profile:",
          error
        );
      }
    };

    void loadProfile();
  }, [profile, dispatch]);
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
