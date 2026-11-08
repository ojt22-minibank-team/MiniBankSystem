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
  getCurrentCustomerSubject,
  hasTokens,
  isAuthenticationGenerationCurrent,
  subscribeToAuthenticationChanges,
} from "../../utils/tokenStorage";

import { getStoredTheme } from "../../features/customer-account/settings/utils/ThemeStorage";
import {
  getStoredLanguage,
  getStoredNotificationsEnabled,
} from "../../features/customer-account/settings/utils/SettingsStorage";
import {
  setTheme,
  setLanguage,
  setNotificationsEnabled,
} from "../../features/customer-account/settings/store/SettingsSlice";
import i18n from "../../i18n";

export default function MainLayout() {
  const dispatch = useAppDispatch();

  const profile = useAppSelector((state) => state.profile.profile);
  const accounts = useAppSelector((state) => state.accounts.accounts);

  const authenticationGeneration = useSyncExternalStore(
    subscribeToAuthenticationChanges,
    getAuthenticationGeneration,
  );

  // Synchronize settings for the current authenticated user session.
  useEffect(() => {
    if (!hasTokens()) return;

    const userId = getCurrentCustomerSubject();
    const storedTheme = getStoredTheme(userId);
    const storedLanguage = getStoredLanguage(userId);
    const storedNotifications = getStoredNotificationsEnabled(userId);

    dispatch(setTheme(storedTheme));
    dispatch(setLanguage(storedLanguage));
    dispatch(setNotificationsEnabled(storedNotifications));

    if (i18n.language !== storedLanguage) {
      void i18n.changeLanguage(storedLanguage);
    }
  }, [dispatch, authenticationGeneration]);

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

  // Automatically refresh accounts and balances when incoming funds or transfers arrive
  useEffect(() => {
    const handleIncomingFund = (e: Event) => {
      const customEvent = e as CustomEvent<{ transferDirection?: string; title?: string; message?: string }>;
      const noti = customEvent?.detail;
      const titleLower = (noti?.title || "").toLowerCase();
      const messageLower = (noti?.message || "").toLowerCase();
      const isReceived =
        noti?.transferDirection === "RECEIVED" ||
        titleLower.includes("received") ||
        messageLower.includes("you received");

      if (isReceived) {
        dispatch(fetchMyAccounts());
      }
    };

    window.addEventListener("ws-notification-received", handleIncomingFund);
    return () => window.removeEventListener("ws-notification-received", handleIncomingFund);
  }, [dispatch]);

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
