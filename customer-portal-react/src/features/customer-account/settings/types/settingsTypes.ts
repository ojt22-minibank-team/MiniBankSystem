export type ThemePreference = "light" | "dark" | "system";

export type LanguagePreference = "en" | "my";

export interface SettingsState {
  theme: ThemePreference;
  notificationsEnabled: boolean;
   language: LanguagePreference;
}

export interface SettingsPreferences {
  theme: ThemePreference;
  notificationsEnabled: boolean;
  language: LanguagePreference;
}