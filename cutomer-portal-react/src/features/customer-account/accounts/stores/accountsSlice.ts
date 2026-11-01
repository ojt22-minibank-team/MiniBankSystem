import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

import { getMyAccounts } from "../api/customerAccountApi";
import type { CustomerAccount } from "../types/accountTypes";
import { submitP2PTransfer } from "../../../transfer/store/transferSlice";

interface AccountsState {
  accounts: CustomerAccount[];
  loading: boolean;
  error: string | null;
  currentRequestId: string | null;
  activeTransferRequestId: string | null;
}

const initialState: AccountsState = {
  accounts: [],
  loading: false,
  error: null,
  currentRequestId: null,
  activeTransferRequestId: null,
};

export const fetchMyAccounts = createAsyncThunk<
  CustomerAccount[],
  void,
  { rejectValue: string }
>(
  "accounts/fetchMyAccounts",
  async (_, { rejectWithValue, signal }) => {
    try {
      return await getMyAccounts(signal);
    } catch (error: unknown) {
      if (signal.aborted) {
        throw error;
      }

      if (axios.isAxiosError<{ message?: string }>(error)) {
        return rejectWithValue(
          error.response?.data?.message || "Failed to load accounts."
        );
      }

      return rejectWithValue("Failed to load accounts.");
    }
  }
);

const accountsSlice = createSlice({
  name: "accounts",
  initialState,
  reducers: {
    clearAccounts: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      // Fetch accounts
      .addCase(fetchMyAccounts.pending, (state, action) => {
        state.loading = true;
        state.error = null;
        state.currentRequestId = action.meta.requestId;
      })
      .addCase(fetchMyAccounts.fulfilled, (state, action) => {
        if (state.currentRequestId !== action.meta.requestId) return;

        state.loading = false;
        state.accounts = action.payload;
        state.currentRequestId = null;
      })
      .addCase(fetchMyAccounts.rejected, (state, action) => {
        if (state.currentRequestId !== action.meta.requestId) return;

        state.loading = false;
        state.currentRequestId = null;

        if (action.meta.aborted) return;

        state.error = action.payload ?? "Failed to load accounts.";
      })

      // Track the active transfer request
      .addCase(submitP2PTransfer.pending, (state, action) => {
        state.activeTransferRequestId = action.meta.requestId;
      })
      .addCase(submitP2PTransfer.fulfilled, (state, action) => {
        if (state.activeTransferRequestId !== action.meta.requestId) return;

        const { sourceAccountNumber, totalDebitedAmount } = action.payload;

        const sourceAccount = state.accounts.find(
          (account) => account.accountNumber === sourceAccountNumber
        );

        if (sourceAccount) {
          sourceAccount.availableBalance = Math.max(
            0,
            (Number(sourceAccount.availableBalance) || 0) -
              Number(totalDebitedAmount)
          );

          sourceAccount.currentBalance = Math.max(
            0,
            (Number(sourceAccount.currentBalance) || 0) -
              Number(totalDebitedAmount)
          );
        }

        state.activeTransferRequestId = null;
      })
      .addCase(submitP2PTransfer.rejected, (state, action) => {
        if (state.activeTransferRequestId !== action.meta.requestId) return;

        state.activeTransferRequestId = null;
      });
  },
});

export const { clearAccounts } = accountsSlice.actions;

export default accountsSlice.reducer;