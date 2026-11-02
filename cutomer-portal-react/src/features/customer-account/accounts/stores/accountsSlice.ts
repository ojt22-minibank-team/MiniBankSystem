
import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import axios from "axios";

import { getMyAccounts } from "../api/customerAccountApi";
import type {
  CustomerAccount,
  AccountStatus,
} from "../types/accountTypes";
import { submitP2PTransfer } from "../../../transfer/store/transferSlice";

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
      })

      // Immediate balance updates on P2P Transfer (Debit source, Credit destination if self-transfer)
      .addCase(submitP2PTransfer.fulfilled, (state, action) => {
        const { sourceAccountNumber, destinationAccountNumber, amount, totalDebitedAmount } = action.payload;

        // 1. Debit Source Account (subtract totalDebitedAmount including fee)
        const sourceAcc = state.accounts.find(
          (acc) => acc.accountNumber?.trim() === sourceAccountNumber?.trim()
        );
        if (sourceAcc) {
          const debited = Number(totalDebitedAmount) || Number(amount);
          sourceAcc.availableBalance = Math.max(
            0,
            (Number(sourceAcc.availableBalance) || 0) - debited
          );
          sourceAcc.currentBalance = Math.max(
            0,
            (Number(sourceAcc.currentBalance) || 0) - debited
          );
        }

        // 2. Credit Destination Account (If it is a Self-Transfer between user's own accounts)
        if (destinationAccountNumber) {
          const destAcc = state.accounts.find(
            (acc) => acc.accountNumber?.trim() === destinationAccountNumber?.trim()
          );
          if (destAcc) {
            const credited = Number(amount);
            destAcc.availableBalance = (Number(destAcc.availableBalance) || 0) + credited;
            destAcc.currentBalance = (Number(destAcc.currentBalance) || 0) + credited;
          }
        }
      });
  },
});

export const {
  clearAccounts,
  updateAccountStatus,
} = accountsSlice.actions;

export default accountsSlice.reducer;
