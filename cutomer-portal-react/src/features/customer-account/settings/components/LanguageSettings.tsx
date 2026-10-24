
import { Languages } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useAppDispatch, useAppSelector } from "../../../../lib/redux";
import { setLanguage } from "../store/SettingsSlice";
import { saveLanguage } from "../utils/SettingsStorage";
import type { LanguagePreference } from "../types/settingsTypes";

const languages: {
  value: LanguagePreference;
  label: string;
}[] = [
  { value: "en", label: "English" },
  { value: "my", label: "မြန်မာ" },
];

export default function LanguageSettings() {
  const dispatch = useAppDispatch();

  const language = useAppSelector(
    (state) => state.settings.language,
  );

  const { t, i18n } = useTranslation("settings");

  async function handleLanguageChange(
    nextLanguage: LanguagePreference,
  ) {
    if (i18n.resolvedLanguage === nextLanguage) {
      dispatch(setLanguage(nextLanguage));
      saveLanguage(nextLanguage);
      return;
    }

    try {
      await i18n.changeLanguage(nextLanguage);

      dispatch(setLanguage(nextLanguage));
      saveLanguage(nextLanguage);
    } catch (error) {
      console.error("Failed to change language:", error);
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-6">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#0878E8] dark:bg-blue-950 dark:text-blue-300">
          <Languages size={20} aria-hidden="true" />
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-slate-900 dark:text-white">
            {t("language")}
          </h2>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {t("languageDescription")}
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            {languages.map(({ value, label }) => {
              const selected = language === value;

              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => void handleLanguageChange(value)}
                  className={`rounded-lg border px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0878E8] ${
                    selected
                      ? "border-[#0878E8] bg-blue-50 text-[#0878E8] dark:bg-blue-950 dark:text-blue-300"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
