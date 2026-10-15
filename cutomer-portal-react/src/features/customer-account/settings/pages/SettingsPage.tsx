import {  Settings2 } from "lucide-react";

import AppearanceSettings from "../components/AppearanceSettings";

export default function SettingsPage() {
  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex items-start gap-4">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
          <Settings2 size={24} aria-hidden="true" />
        </div>

        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Settings
          </h1>

          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            Manage your preferences and personalize your banking experience.
          </p>
        </div>
      </header>

      <div className="space-y-5">
        <AppearanceSettings />
      </div>
    </main>
  );
}