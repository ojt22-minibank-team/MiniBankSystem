import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import type {
  SettingsState,
  ThemePreference,
} from "../../types/settingsTypes";

import { getStoredTheme } from "../utils/ThemeStorage";

const initialState: SettingsState = {
  theme: getStoredTheme(),
};

const settingsSlice = createSlice({
  name: "settings",
  initialState,
  reducers: {
    setTheme(state, action: PayloadAction<ThemePreference>) {
      state.theme = action.payload;
    },
  },
});

export const { setTheme } = settingsSlice.actions;

export default settingsSlice.reducer;