import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import type {
  LanguagePreference,
  SettingsState,
  ThemePreference,
} from "../types/settingsTypes";

import { getStoredTheme } from "../utils/ThemeStorage";
import {
  getStoredLanguage,
  getStoredNotificationsEnabled,
} from "../utils/SettingsStorage";

export const getInitialSettingsState = (): SettingsState => ({
  theme: getStoredTheme(),
  notificationsEnabled: getStoredNotificationsEnabled(),
  language: getStoredLanguage(),
});

const initialState: SettingsState = getInitialSettingsState();

const settingsSlice = createSlice({
  name: "settings",
  initialState,
  reducers: {
    setTheme(state, action: PayloadAction<ThemePreference>) {
      state.theme = action.payload;
    },

    setNotificationsEnabled(
      state,
      action: PayloadAction<boolean>,
    ) {
      state.notificationsEnabled = action.payload;
    },

    setLanguage(
      state,
      action: PayloadAction<LanguagePreference>,
    ) {
      state.language = action.payload;
    },

    resetSettings() {
      return getInitialSettingsState();
    },
  },
});

export const {
  setTheme,
  setNotificationsEnabled,
  setLanguage,
  resetSettings,
} = settingsSlice.actions;

export default settingsSlice.reducer;
