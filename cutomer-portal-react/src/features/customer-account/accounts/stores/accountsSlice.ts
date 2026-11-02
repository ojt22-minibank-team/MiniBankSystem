
import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import axios from "axios";

import { getMyAccounts } from "../api/customerAccountApi";
import type {
  CustomerAccount,
  AccountStatus,
} from "../types/accountTypes";

interface AccountsState {
  accounts: CustomerAccount[];
  loading: boolean;
  error: string | null;
  currentRequestId: string | null;
  latestStatusByAccount: Record<string, AccountStatus>;
}

interface ThunkState {
  accounts: AccountsState;
}

const createInitialState = (): AccountsState => ({
  accounts: [],
  loading: false,
  error: null,
  currentRequestId: null,
  latestStatusByAccount: {},
});

const LOAD_ERROR = "Failed to load accounts. Please try again.";

export const fetchMyAccounts = createAsyncThunk<
  CustomerAccount[],
  void,
  { state: ThunkState; rejectValue: string }
>(
  "accounts/fetchMyAccounts",
  async (_, { rejectWithValue, signal }) => {
    try {
      return await getMyAccounts(signal);
    } catch (error: unknown) {
      if (signal.aborted) throw error;

      if (axios.isAxiosError<{ message?: string }>(error)) {
        const message = error.response?.data?.message;

        return rejectWithValue(
          typeof message === "string" && message.trim()
            ? message
            : LOAD_ERROR,
        );
      }

      return rejectWithValue(LOAD_ERROR);
    }
  },
  {
    condition: (_, { getState }) => !getState().accounts.loading,
  },
);

const accountsSlice = createSlice({
  name: "accounts",
  initialState: createInitialState(),

  reducers: {
    clearAccounts: () => createInitialState(),

    updateAccountStatus: (
      state,
      action: PayloadAction<{
        accountNumber: string;
        status: AccountStatus;
      }>,
    ) => {
      const { accountNumber, status } = action.payload;

      // Keep the latest WebSocket status even if the account
      // has not been loaded into Redux yet.
      state.latestStatusByAccount[accountNumber] = status;

      const account = state.accounts.find(
        (item) => item.accountNumber === accountNumber,
      );

      if (account) {
        account.status = status;
      }
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(fetchMyAccounts.pending, (state, action) => {
        state.loading = true;
        state.error = null;
        state.currentRequestId = action.meta.requestId;
      })
      .addCase(fetchMyAccounts.fulfilled, (state, action) => {
        if (state.currentRequestId !== action.meta.requestId) return;

        // Preserve the latest WebSocket status over potentially stale API data.
        state.accounts = action.payload.map((account) => ({
          ...account,
          status:
            state.latestStatusByAccount[account.accountNumber] ??
            account.status,
        }));

        state.loading = false;
        state.error = null;
        state.currentRequestId = null;
      })
      .addCase(fetchMyAccounts.rejected, (state, action) => {
        if (state.currentRequestId !== action.meta.requestId) return;

        state.loading = false;
        state.currentRequestId = null;

        if (action.meta.aborted) return;

        state.error = action.payload ?? LOAD_ERROR;
      });
  },
});

export const {
  clearAccounts,
  updateAccountStatus,
} = accountsSlice.actions;

export default accountsSlice.reducer;
