
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import axios from "axios";

import { getCustomerDashboard } from "../api/dashboardApi";
import type { DashboardResponse } from "../types/dashboardTypes";

type DashboardStatus = "idle" | "pending" | "succeeded" | "failed";

interface DashboardState {
  data: DashboardResponse | null;
  status: DashboardStatus;
  error: string | null;
  currentRequestId: string | null;
}

const initialState: DashboardState = {
  data: null,
  status: "idle",
  error: null,
  currentRequestId: null,
};

export const fetchDashboard = createAsyncThunk<
  DashboardResponse,
  void,
  { rejectValue: string }
>(
  "dashboard/fetchDashboard",
  async (_, { rejectWithValue, signal }) => {
    try {
      return await getCustomerDashboard(signal);
    } catch (error: unknown) {
      if (signal.aborted) {
        throw error;
      }

      if (axios.isAxiosError<{ message?: string }>(error)) {
        const message = error.response?.data?.message;

        return rejectWithValue(
          typeof message === "string" && message.trim()
            ? message
            : "Unable to load dashboard. Please try again.",
        );
      }

      return rejectWithValue(
        "Unable to load dashboard. Please try again.",
      );
    }
  },
);

const dashboardSlice = createSlice({
  name: "dashboard",
  initialState,
  reducers: {
    setDashboard: (
      state,
      action: PayloadAction<DashboardResponse>,
    ) => {
      state.data = action.payload;
      state.status = "succeeded";
      state.error = null;
      state.currentRequestId = null;
    },

    clearDashboard: (state) => {
      state.data = null;
      state.status = "idle";
      state.error = null;
      state.currentRequestId = null;
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboard.pending, (state, action) => {
        state.status = "pending";
        state.error = null;
        state.currentRequestId = action.meta.requestId;
      })

      .addCase(fetchDashboard.fulfilled, (state, action) => {
        if (state.currentRequestId !== action.meta.requestId) {
          return;
        }

        state.data = action.payload;
        state.status = "succeeded";
        state.error = null;
        state.currentRequestId = null;
      })

      .addCase(fetchDashboard.rejected, (state, action) => {
        if (state.currentRequestId !== action.meta.requestId) {
          return;
        }

        state.currentRequestId = null;

        if (action.meta.aborted) {
          state.status = state.data ? "succeeded" : "idle";
          return;
        }

        state.status = "failed";
        state.error =
          action.payload ??
          action.error.message ??
          "Unable to load dashboard. Please try again.";
      });
  },
});

export const {
  setDashboard,
  clearDashboard,
} = dashboardSlice.actions;

export default dashboardSlice.reducer;
