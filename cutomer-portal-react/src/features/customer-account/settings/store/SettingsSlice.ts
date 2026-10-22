
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

const initialState: SettingsState = {
  theme: getStoredTheme(),
  notificationsEnabled: getStoredNotificationsEnabled(),
  language: getStoredLanguage(),
};

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
  },
});

export const {
  setTheme,
  setNotificationsEnabled,
  setLanguage,
} = settingsSlice.actions;

export default settingsSlice.reducer;
