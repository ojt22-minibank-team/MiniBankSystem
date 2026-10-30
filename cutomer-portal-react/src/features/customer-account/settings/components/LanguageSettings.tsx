import { useState } from "react";
import { Check, ChevronDown, ChevronRight, Languages } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useAppDispatch, useAppSelector } from "../../../../lib/redux";
import { setLanguage } from "../store/SettingsSlice";
import { saveLanguage } from "../utils/SettingsStorage";
import type { LanguagePreference } from "../types/settingsTypes";

const languages: {
  value: LanguagePreference;
  labelKey: string;
  defaultLabel: string;
  descKey: string;
  defaultDesc: string;
  badge: string;
}[] = [
  {
    value: "en",
    labelKey: "english",
    defaultLabel: "English",
    descKey: "englishDesc",
    defaultDesc: "English (US)",
    badge: "EN",
  },
  {
    value: "my",
    labelKey: "myanmar",
    defaultLabel: "မြန်မာ",
    descKey: "myanmarDesc",
    defaultDesc: "Myanmar (Burmese)",
    badge: "MY",
  },
];

export default function LanguageSettings() {
  const dispatch = useAppDispatch();
  const language = useAppSelector((state) => state.settings.language);
  const { t, i18n } = useTranslation("settings");
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);

  const selectedLanguage =
    languages.find((item) => item.value === language) ?? languages[0];

  async function handleLanguageChange(nextLanguage: LanguagePreference) {
    if (i18n.resolvedLanguage !== nextLanguage) {
      try {
        await i18n.changeLanguage(nextLanguage);
      } catch (error) {
        console.error("Failed to change language:", error);
        return;
      }
    }

    dispatch(setLanguage(nextLanguage));
    saveLanguage(nextLanguage);
    setIsLanguageOpen(false);
  }

  return (
    <div className="space-y-3">


      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-[#0A192F]">
        <button
          type="button"
          onClick={() => setIsLanguageOpen((prev) => !prev)}
          aria-expanded={isLanguageOpen}
          aria-controls="language-options"
          className="flex w-full items-center gap-3 p-4 text-left transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#00A3C4] dark:hover:bg-slate-800/60"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            <Languages size={20} />
          </span>

          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-slate-900 dark:text-white">
              {t("displayLanguage", {
                defaultValue: "Display Language",
              })}
            </span>

            <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
              {t(selectedLanguage.labelKey, {
                defaultValue: selectedLanguage.defaultLabel,
              })}
            </span>
          </span>

          {isLanguageOpen ? (
            <ChevronDown
              size={18}
              className="shrink-0 text-slate-500"
              aria-hidden="true"
            />
          ) : (
            <ChevronRight
              size={18}
              className="shrink-0 text-slate-500"
              aria-hidden="true"
            />
          )}
        </button>

        {isLanguageOpen && (
          <div
            id="language-options"
            className="border-t border-slate-200 p-2 dark:border-slate-700"
          >
            {languages.map((item) => {
              const selected = language === item.value;

              return (
                <button
                  key={item.value}
                  type="button"
                  aria-pressed={selected}
                  disabled={i18n.isInitialized === false}
                  onClick={() => void handleLanguageChange(item.value)}
                  className={[
                    "flex w-full items-center gap-3 rounded-lg p-3 text-left transition",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#00A3C4]",
                    selected
                      ? "bg-cyan-50 dark:bg-cyan-950/40"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800/60",
                    "disabled:cursor-not-allowed disabled:opacity-60",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "flex size-10 shrink-0 items-center justify-center rounded-lg text-xs font-bold",
                      selected
                        ? "bg-cyan-100 text-[#00A3C4] dark:bg-blue-900 dark:text-blue-300"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
                    ].join(" ")}
                  >
                    {item.badge}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-slate-900 dark:text-white">
                      {t(item.labelKey, {
                        defaultValue: item.defaultLabel,
                      })}
                    </span>

                    <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">
                      {t(item.descKey, {
                        defaultValue: item.defaultDesc,
                      })}
                    </span>
                  </span>

                  {selected && (
                    <Check
                      size={18}
                      className="shrink-0 text-[#00A3C4] dark:text-blue-400"
                      aria-hidden="true"
                    />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}