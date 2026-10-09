import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { P2PTransferRequest, P2PTransferResponse } from '../types/transfer.types';
import { executeP2PTransfer } from '../services/transferService';

interface TransferState {
  loading: boolean;
  success: boolean;
  error: string | null;
  transactionResult: P2PTransferResponse | null;
}

const initialState: TransferState = {
  loading: false,
  success: false,
  error: null,
  transactionResult: null,
};

export const submitP2PTransfer = createAsyncThunk(
  'transfer/submitP2P',
  async (data: P2PTransferRequest, { rejectWithValue }) => {
    try {
      const response = await executeP2PTransfer(data);
      return response;
    } catch (error: any) {
      // Backend က ပြန်ပို့မယ့် Error Message ကို ယူပါမယ်
      return rejectWithValue(
        error.response?.data?.message || 'Transfer failed. Please try again later.'
      );
    }
  }
);

const transferSlice = createSlice({
  name: 'transfer',
  initialState,
  reducers: {
    resetTransferState: (state) => {
      state.loading = false;
      state.success = false;
      state.error = null;
      state.transactionResult = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(submitP2PTransfer.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(submitP2PTransfer.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.transactionResult = action.payload;
      })
      .addCase(submitP2PTransfer.rejected, (state, action) => {
        state.loading = false;
        state.success = false;
        state.error = action.payload as string;
      });
  },
});

export const { resetTransferState } = transferSlice.actions;
export default transferSlice.reducer;