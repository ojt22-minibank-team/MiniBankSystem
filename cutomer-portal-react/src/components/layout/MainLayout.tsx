import { Outlet } from "react-router-dom";
import { useEffect, useSyncExternalStore } from "react";

import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

import { ToastContainer } from "../../features/notifications/components/ToastContainer";

import { setProfile } from "../../features/customer-account/profile/store/ProfileSlice";
import { getMyProfile } from "../../features/customer-account/profile/api/profileApi";

import { fetchMyAccounts } from "../../features/customer-account/accounts/stores/accountsSlice";

import { useAppDispatch, useAppSelector } from "../../lib/redux";

import {
  getAuthenticationGeneration,
  hasTokens,
  isAuthenticationGenerationCurrent,
  subscribeToAuthenticationChanges,
} from "../../utils/tokenStorage";

export default function MainLayout() {
  const dispatch = useAppDispatch();

  const profile = useAppSelector((state) => state.profile.profile);
  const accounts = useAppSelector((state) => state.accounts.accounts);

  const authenticationGeneration = useSyncExternalStore(
    subscribeToAuthenticationChanges,
    getAuthenticationGeneration,
  );

  // Load profile for the current authenticated session.
  useEffect(() => {
    if (profile) return;

    const generation = authenticationGeneration;

    if (
      !hasTokens() ||
      !isAuthenticationGenerationCurrent(generation)
    ) {
      return;
    }

    let cancelled = false;

    const loadProfile = async () => {
      try {
        const data = await getMyProfile();

        if (
          cancelled ||
          !isAuthenticationGenerationCurrent(generation)
        ) {
          return;
        }

        dispatch(setProfile(data));
      } catch (error) {
        if (
          cancelled ||
          !isAuthenticationGenerationCurrent(generation)
        ) {
          return;
        }

        console.error(
          "Failed to initialize customer profile:",
          error,
        );
      }
    };

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [profile, dispatch, authenticationGeneration]);

  // Load accounts for the current authenticated session.
  useEffect(() => {
    if (accounts.length > 0) return;

    if (
      !hasTokens() ||
      !isAuthenticationGenerationCurrent(authenticationGeneration)
    ) {
      return;
    }

    void dispatch(fetchMyAccounts());
  }, [accounts.length, dispatch, authenticationGeneration]);

  return (
    <div className="min-h-screen bg-[#F4F6F9] dark:bg-[#060E1A] text-[#0A192F] dark:text-slate-100 flex flex-col transition-colors duration-200">
      <ToastContainer />

      <Sidebar />

      <Navbar />

      <main className="ml-64 pt-20 flex-1 bg-[#F4F6F9] dark:bg-[#060E1A] transition-colors duration-200">
        <div className="p-4 sm:p-6 lg:p-8 min-h-[calc(100vh-5rem)] bg-[#F4F6F9] dark:bg-[#060E1A] transition-colors duration-200">
          <Outlet />
        </div>
      </main>
    </div>
  );
}