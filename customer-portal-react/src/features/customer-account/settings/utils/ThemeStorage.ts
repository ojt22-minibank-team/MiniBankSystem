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
  const id = userId !== undefined ? userId : getCurrentCustomerSubject();
  return id ? `${BASE_THEME_KEY}_${id}` : BASE_THEME_KEY;
};

export function getStoredTheme(userId?: string | null): ThemePreference {
  const id = userId !== undefined ? userId : getCurrentCustomerSubject();
  // When no user is authenticated, unauthenticated/login pages remain on default "system"
  if (!id) {
    return "system";
  }

  const storedTheme = localStorage.getItem(getThemeKey(id));

  return isThemePreference(storedTheme)
    ? storedTheme
    : "system";
}

export function saveTheme(theme: ThemePreference, userId?: string | null): void {
  const id = userId !== undefined ? userId : getCurrentCustomerSubject();
  if (!id) {
    return;
  }

  localStorage.setItem(getThemeKey(id), theme);
}
