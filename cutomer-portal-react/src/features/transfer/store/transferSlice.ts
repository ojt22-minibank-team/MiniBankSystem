import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { P2PTransferRequest, P2PTransferResponse } from '../types/transferTypes';
import { executeP2PTransfer } from '../services/transferService';
import {
  getAuthenticationGeneration,
  isAuthenticationGenerationCurrent,
  hasTokens,
} from '../../../utils/tokenStorage';

interface TransferState {
  loading: boolean;
  success: boolean;
  error: string | null;
  transactionResult: P2PTransferResponse | null;
  currentRequestId: string | null;
}

const initialState: TransferState = {
  loading: false,
  success: false,
  error: null,
  transactionResult: null,
  currentRequestId: null,
};

export interface P2PTransferResult extends P2PTransferResponse {
  _sessionGeneration?: number;
}

export const submitP2PTransfer = createAsyncThunk(
  'transfer/submitP2P',
  async (data: P2PTransferRequest, { rejectWithValue }) => {
    const generation = getAuthenticationGeneration();
    try {
      const response = await executeP2PTransfer(data);
      return {
        ...response,
        _sessionGeneration: generation,
      };
    } catch (error: any) {
      const status = error.response?.status;
      const message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Transfer failed. Please try again later.';
      const code = error.response?.data?.code || error.code;
      return rejectWithValue({
        status,
        message,
        code,
        _sessionGeneration: generation,
      });
    }
  }
);

const transferSlice = createSlice({
  name: 'transfer',
  initialState,
  reducers: {
    clearTransferError: (state) => {
      state.error = null;
    },
    resetTransferState: (state) => {
      state.loading = false;
      state.success = false;
      state.error = null;
      state.transactionResult = null;
      state.currentRequestId = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(submitP2PTransfer.pending, (state, action) => {
        state.loading = true;
        state.error = null;
        state.currentRequestId = action.meta.requestId;
      })
      .addCase(submitP2PTransfer.fulfilled, (state, action) => {
        const payload = action.payload as any;
        const payloadGen = payload?._sessionGeneration;
        const currentGen = getAuthenticationGeneration();

        // Generation Ownership Check: Ignore stale transfer completion from previous session
        if (
          !hasTokens() ||
          !isAuthenticationGenerationCurrent(currentGen) ||
          state.currentRequestId !== action.meta.requestId ||
          (typeof payloadGen === 'number' && payloadGen !== currentGen)
        ) {
          return;
        }

        state.loading = false;
        state.success = true;
        state.transactionResult = action.payload;
        state.currentRequestId = null;
      })
      .addCase(submitP2PTransfer.rejected, (state, action) => {
        const payload = action.payload as any;
        const payloadGen = payload?._sessionGeneration;
        const currentGen = getAuthenticationGeneration();

        // Generation Ownership Check: Ignore stale transfer failure from previous session
        if (
          !hasTokens() ||
          !isAuthenticationGenerationCurrent(currentGen) ||
          state.currentRequestId !== action.meta.requestId ||
          (typeof payloadGen === 'number' && payloadGen !== currentGen)
        ) {
          return;
        }

        state.loading = false;
        state.success = false;
        state.error = (typeof payload === 'string' ? payload : payload?.message) || 'Transfer failed.';
        state.currentRequestId = null;
      });
  },
});

export const { resetTransferState, clearTransferError } = transferSlice.actions;
export default transferSlice.reducer;
