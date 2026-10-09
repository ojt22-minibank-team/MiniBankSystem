import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getMyAccounts } from '../api/customerAccountApi';
import type { CustomerAccount } from '../types/accountTypes';

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
      });
  },
});

export const { clearAccounts } = accountsSlice.actions;
export default accountsSlice.reducer;
