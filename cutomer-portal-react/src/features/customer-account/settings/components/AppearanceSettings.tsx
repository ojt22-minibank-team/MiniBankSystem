import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Monitor,
  Moon,
  Sun,
} from "lucide-react";

import { useAppDispatch, useAppSelector } from "../../../../lib/redux";
import { setTheme } from "../store/SettingsSlice";
import type { ThemePreference } from "../types/settingsTypes";

const themes: {
  value: ThemePreference;
  label: string;
  description: string;
  Icon: typeof Sun;
}[] = [
  {
    value: "light",
    label: "Light",
    description: "Use the light appearance",
    Icon: Sun,
  },
  {
    value: "dark",
    label: "Dark",
    description: "Use the dark appearance",
    Icon: Moon,
  },
  {
    value: "system",
    label: "System",
    description: "Follow your device appearance",
    Icon: Monitor,
  },
];

export default function AppearanceSettings() {
  const dispatch = useAppDispatch();
  const selectedTheme = useAppSelector((state) => state.settings.theme);
  const { t } = useTranslation("settings");
  const [isThemeOpen, setIsThemeOpen] = useState(false);

  const selectedOption =
    themes.find((theme) => theme.value === selectedTheme) ?? themes[2];

  return (
    <div className="space-y-3">

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-[#0A192F]">
        <button
          type="button"
          onClick={() => setIsThemeOpen((prev) => !prev)}
          aria-expanded={isThemeOpen}
          aria-controls="theme-options"
          className="flex w-full items-center gap-3 p-4 text-left transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-500 dark:hover:bg-slate-800/60"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            <selectedOption.Icon size={20} />
          </span>

          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-slate-900 dark:text-white">
              {t("theme", { defaultValue: "Theme" })}
            </span>
            <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
              {t(`themeOptions.${selectedTheme}`, {
                defaultValue: selectedOption.label,
              })}
            </span>
          </span>

          {isThemeOpen ? (
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

        {isThemeOpen && (
          <div
            id="theme-options"
            className="border-t border-slate-200 p-2 dark:border-slate-700"
          >
            {themes.map(({ value, label, description, Icon }) => {
              const isSelected = selectedTheme === value;

              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    dispatch(setTheme(value));
                    setIsThemeOpen(false);
                  }}
                  aria-pressed={isSelected}
                  className={`flex w-full items-center gap-3 rounded-lg p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-500 ${
                    isSelected
                      ? "bg-cyan-50 dark:bg-cyan-950/40"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800/60"
                  }`}
                >
                  <Icon
                    size={19}
                    className={
                      isSelected
                        ? "shrink-0 text-cyan-700 dark:text-cyan-300"
                        : "shrink-0 text-slate-500 dark:text-slate-400"
                    }
                    aria-hidden="true"
                  />

                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-slate-900 dark:text-white">
                      {t(`themeOptions.${value}`, { defaultValue: label })}
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">
                      {t(`themeDescriptions.${value}`, {
                        defaultValue: description,
                      })}
                    </span>
                  </span>

                  {isSelected && (
                    <Check
                      size={18}
                      className="shrink-0 text-cyan-600 dark:text-cyan-300"
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