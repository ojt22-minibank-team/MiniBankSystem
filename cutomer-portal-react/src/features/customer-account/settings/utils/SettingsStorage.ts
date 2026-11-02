
import type { LanguagePreference } from "../types/settingsTypes";

const STORAGE_KEYS = {
  notificationsEnabled: "customer-portal-notifications-enabled",
  language: "customer-portal-language",
} as const;

/**
 * Returns the saved in-app notification preference.
 * Defaults to enabled when no preference exists.
 */
export function getStoredNotificationsEnabled(): boolean {
  try {
    const value = localStorage.getItem(
      STORAGE_KEYS.notificationsEnabled,
    );

    if (value === null) {
      return true;
    }

    return value === "true";
  } catch (error) {
    console.error("Failed to read notification preference:", error);
    return true;
  }
}

/**
 * Saves the in-app notification preference.
 */
export function saveNotificationsEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(
      STORAGE_KEYS.notificationsEnabled,
      String(enabled),
    );
  } catch (error) {
    console.error("Failed to save notification preference:", error);
  }
}

/**
 * Returns the saved language preference.
 * Defaults to English when no valid preference exists.
 */
export function getStoredLanguage(): LanguagePreference {
  try {
    const value = localStorage.getItem(STORAGE_KEYS.language);

    if (value === "en" || value === "my") {
      return value;
    }
  } catch (error) {
    console.error("Failed to read language preference:", error);
  }

  return "en";
}

/**
 * Saves the selected language preference.
 */
export function saveLanguage(language: LanguagePreference): void {
  try {
    localStorage.setItem(STORAGE_KEYS.language, language);
  } catch (error) {
    console.error("Failed to save language preference:", error);
  }
}
