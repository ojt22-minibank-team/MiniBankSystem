import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

import type { CustomerProfile } from "../types/profileTypes";

interface ProfileState {
  profile: CustomerProfile | null;
}

const initialState: ProfileState = {
  profile: null,
};

const profileSlice = createSlice({
  name: "profile",
  initialState,
  reducers: {
    setProfile: (
      state,
      action: PayloadAction<CustomerProfile>
    ) => {
      state.profile = action.payload;
    },

    clearProfile: (state) => {
      state.profile = null;
    },
  },
});

export const {
  setProfile,
  clearProfile,
} = profileSlice.actions;

export default profileSlice.reducer;