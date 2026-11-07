
import type { ThemePreference } from "../types/settingsTypes";
import { getCurrentCustomerSubject } from "../../../../utils/tokenStorage";

const BASE_THEME_KEY = "customer-portal-theme";

const isThemePreference = (
  value: string | null,
): value is ThemePreference =>
  value === "light" ||
  value === "dark" ||
  value === "system";

const getThemeKey = (userId?: string | null): string => {
  const id =
    userId !== undefined
      ? userId
      : getCurrentCustomerSubject();

  return id
    ? `${BASE_THEME_KEY}_${id}`
    : BASE_THEME_KEY;
};

export function getStoredTheme(
  userId?: string | null,
): ThemePreference {
  const id =
    userId !== undefined
      ? userId
      : getCurrentCustomerSubject();

  // Login / unauthenticated pages use the last saved theme.
  if (!id) {
    const storedTheme = localStorage.getItem(BASE_THEME_KEY);

    return isThemePreference(storedTheme)
      ? storedTheme
      : "system";
  }

  // Authenticated customers use their own theme preference.
  const storedTheme = localStorage.getItem(getThemeKey(id));

  return isThemePreference(storedTheme)
    ? storedTheme
    : "system";
}

export function saveTheme(
  theme: ThemePreference,
  userId?: string | null,
): void {
  const id =
    userId !== undefined
      ? userId
      : getCurrentCustomerSubject();

  // Save the latest theme for unauthenticated / login pages.
  localStorage.setItem(BASE_THEME_KEY, theme);

  // Also preserve each customer's individual preference.
  if (id) {
    localStorage.setItem(getThemeKey(id), theme);
  }
}
