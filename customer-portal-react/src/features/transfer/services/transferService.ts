import api from '../../../config/api';

import type {
  P2PTransferRequest,
  P2PTransferResponse,
  AccountLookupResponse,
} from '../types/transferTypes';

export interface FeeCalculationResponse {
  fee: number;
  amount: number;
  totalDebitedAmount: number;
  feeType?: string;
  feeValue?: number;
  feeCode?: string;
  currency?: string;
}

export const lookupDestinationAccount = async (
  accountNumber: string
): Promise<AccountLookupResponse> => {
  const response = await api.get<AccountLookupResponse>(
    `/transfers/lookup/${accountNumber}`
  );
  return response.data;
};

export const calculateTransferFee = async (
  amount: number
): Promise<FeeCalculationResponse> => {
  const response = await api.get<FeeCalculationResponse>(
    `/transfers/calculate-fee`,
    { params: { amount } }
  );
  return response.data;
};

export const executeP2PTransfer = async (
  transferData: P2PTransferRequest
): Promise<P2PTransferResponse> => {
  const response = await api.post<P2PTransferResponse>(
    '/transfers/p2p',
    transferData
  );
  return response.data;
};
