import { Link } from "react-router-dom";
import { Settings2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import SecuritySettings from "../components/SecuritySettings";
import AppearanceSettings from "../components/AppearanceSettings";
import LanguageSettings from "../components/LanguageSettings";

export default function SettingsPage() {
  const { t } = useTranslation("settings");

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex items-start gap-4">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-50 text-[#00A3C4] dark:bg-blue-950 dark:text-blue-300 border border-cyan-100">
          <Settings2 size={24} aria-hidden="true" />
        </div>

        <div className="min-w-0">
          {/* Breadcrumb Navigation */}
          <nav aria-label="Breadcrumb" className="mb-1 flex flex-wrap items-center gap-2 text-xs font-semibold">
            <Link
              to="/dashboard"
              className="text-slate-500 transition-colors hover:text-[#00A3C4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A3C4]"
            >
              Dashboard
            </Link>
            <span className="text-slate-300" aria-hidden="true">/</span>
            <span className="text-[#00A3C4]" aria-current="page">Settings</span>
          </nav>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {t("title", { defaultValue: "Settings" })}
          </h1>

          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            {t("description", {
              defaultValue:
                "Manage your preferences and personalize your banking experience.",
            })}
          </p>
        </div>
      </header>

      <div className="space-y-6">
        <SecuritySettings />
        <AppearanceSettings />
        <LanguageSettings />
      </div>
    </main>
  );
}
