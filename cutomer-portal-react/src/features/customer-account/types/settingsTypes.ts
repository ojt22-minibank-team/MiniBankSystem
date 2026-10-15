export type ThemePreference = "light" | "dark" | "system";

export interface SettingsState {
  theme: ThemePreference;
}

export interface SettingsPreferences {
  theme: ThemePreference;
}