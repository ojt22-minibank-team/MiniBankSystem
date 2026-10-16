import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getMyAccounts } from '../api/customerAccountApi';
import type { CustomerAccount } from '../types/accountTypes';
import { submitP2PTransfer } from '../../transfer/store/transferSlice';

interface AccountsState {
  accounts: CustomerAccount[];
  loading: boolean;
  error: string | null;
}

const initialState: AccountsState = {
  accounts: [],
  loading: false,
  error: null,
};

export const fetchMyAccounts = createAsyncThunk(
  'accounts/fetchMyAccounts',
  async (_, { rejectWithValue }) => {
    try {
      const data = await getMyAccounts();
      return data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to load accounts.'
      );
    }
  }
);

const accountsSlice = createSlice({
  name: 'accounts',
  initialState,
  reducers: {
    clearAccounts: (state) => {
      state.accounts = [];
      state.loading = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyAccounts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMyAccounts.fulfilled, (state, action) => {
        state.loading = false;
        state.accounts = action.payload;
      })
      .addCase(fetchMyAccounts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(submitP2PTransfer.fulfilled, (state, action) => {
        const { sourceAccountNumber, totalDebitedAmount } = action.payload;
        const sourceAcc = state.accounts.find(
          (a) => a.accountNumber === sourceAccountNumber
        );
        if (sourceAcc) {
          sourceAcc.availableBalance = Math.max(
            0,
            (Number(sourceAcc.availableBalance) || 0) - Number(totalDebitedAmount)
          );
          sourceAcc.currentBalance = Math.max(
            0,
            (Number(sourceAcc.currentBalance) || 0) - Number(totalDebitedAmount)
          );
        }
      });
  },
});

export const { clearAccounts } = accountsSlice.actions;
export default accountsSlice.reducer;
