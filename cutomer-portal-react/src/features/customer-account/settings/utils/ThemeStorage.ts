import type { ThemePreference } from "../../types/settingsTypes";

const THEME_STORAGE_KEY = "customer-portal-theme";

const isThemePreference = (
  value: string | null,
): value is ThemePreference =>
  value === "light" ||
  value === "dark" ||
  value === "system";

export function getStoredTheme(): ThemePreference {
  const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);

  return isThemePreference(storedTheme)
    ? storedTheme
    : "system";
}

export function saveTheme(theme: ThemePreference): void {
  localStorage.setItem(THEME_STORAGE_KEY, theme);
}