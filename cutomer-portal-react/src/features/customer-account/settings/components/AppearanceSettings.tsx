import { useAppDispatch, useAppSelector } from "../../../../lib/redux";
import { setTheme } from "../store/SettingsSlice";
import type { ThemePreference } from "../../types/settingsTypes";
import SettingsSection from "./SettingsSection";
import ThemeOption from "./ThemeOption";

const themes: ThemePreference[] = ["light", "dark", "system"];

export default function AppearanceSettings() {
  const dispatch = useAppDispatch();
  const selectedTheme = useAppSelector(
    (state) => state.settings.theme,
  );

  return (
    <SettingsSection
      title="Appearance"
      description="Customize how your banking portal looks on this device."
    >
      <div>
        <h3 className="text-sm font-medium text-slate-800 dark:text-slate-200">
          Theme preference
        </h3>

        <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
          Choose the appearance that works best for you.
        </p>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {themes.map((theme) => (
          <ThemeOption
            key={theme}
            value={theme}
            selected={selectedTheme === theme}
            onSelect={(value) => dispatch(setTheme(value))}
          />
        ))}
      </div>
    </SettingsSection>
  );
}