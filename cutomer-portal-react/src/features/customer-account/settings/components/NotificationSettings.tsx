
import { Bell, BellOff } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";

import type { RootState, AppDispatch } from "../../../../lib/redux";
import { setNotificationsEnabled } from "../store/SettingsSlice";

export default function NotificationSettings() {
  const dispatch = useDispatch<AppDispatch>();

  const enabled = useSelector(
    (state: RootState) => state.settings.notificationsEnabled,
  );

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-6">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#0878E8] dark:bg-blue-950 dark:text-blue-300">
          {enabled ? (
            <Bell size={20} aria-hidden="true" />
          ) : (
            <BellOff size={20} aria-hidden="true" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-slate-900 dark:text-white">
            App Notifications
          </h2>

          <p className="mt-1 text-sm leading-5 text-slate-500 dark:text-slate-400">
            {enabled
              ? "In-app notifications are enabled."
              : "In-app notifications are turned off."}
          </p>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Enable in-app notifications"
          onClick={() =>
            dispatch(setNotificationsEnabled(!enabled))
          }
          className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0878E8] focus-visible:ring-offset-2 ${
            enabled ? "bg-[#0878E8]" : "bg-slate-300 dark:bg-slate-600"
          }`}
        >
          <span
            className={`pointer-events-none mt-0.5 size-5 rounded-full bg-white shadow-sm transition-transform ${
              enabled ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>
    </section>
  );
}
