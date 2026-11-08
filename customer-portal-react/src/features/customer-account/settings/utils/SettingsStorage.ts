import type { LanguagePreference } from "../types/settingsTypes";
import { getCurrentCustomerSubject } from "../../../../utils/tokenStorage";

const BASE_STORAGE_KEYS = {
  notificationsEnabled: "customer-portal-notifications-enabled",
  language: "customer-portal-language",
} as const;

const getKey = (baseKey: string, userId?: string | null): string => {
  const id = userId !== undefined ? userId : getCurrentCustomerSubject();
  return id ? `${baseKey}_${id}` : baseKey;
};

/**
 * Returns the saved in-app notification preference for the user.
 * Defaults to enabled when no preference exists.
 */
export function getStoredNotificationsEnabled(userId?: string | null): boolean {
  const id = userId !== undefined ? userId : getCurrentCustomerSubject();
  if (!id) {
    return true;
  }

  try {
    const value = localStorage.getItem(
      getKey(BASE_STORAGE_KEYS.notificationsEnabled, id),
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
 * Saves the in-app notification preference for the user.
 */
export function saveNotificationsEnabled(enabled: boolean, userId?: string | null): void {
  const id = userId !== undefined ? userId : getCurrentCustomerSubject();
  if (!id) {
    return;
  }

  try {
    localStorage.setItem(
      getKey(BASE_STORAGE_KEYS.notificationsEnabled, id),
      String(enabled),
    );
  } catch (error) {
    console.error("Failed to save notification preference:", error);
  }
}

/**
 * Returns the saved language preference for the user.
 * Defaults to English when no valid preference exists.
 */
export function getStoredLanguage(userId?: string | null): LanguagePreference {
  const id = userId !== undefined ? userId : getCurrentCustomerSubject();
  if (!id) {
    return "en";
  }

  try {
    const value = localStorage.getItem(
      getKey(BASE_STORAGE_KEYS.language, id),
    );

    if (value === "en" || value === "my") {
      return value;
    }
  } catch (error) {
    console.error("Failed to read language preference:", error);
  }

  return "en";
}

/**
 * Saves the selected language preference for the user.
 */
export function saveLanguage(language: LanguagePreference, userId?: string | null): void {
  const id = userId !== undefined ? userId : getCurrentCustomerSubject();
  if (!id) {
    return;
  }

  try {
    localStorage.setItem(
      getKey(BASE_STORAGE_KEYS.language, id),
      language,
    );
  } catch (error) {
    console.error("Failed to save language preference:", error);
  }
}
