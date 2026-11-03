import axiosInstance from '../lib/axios';
import { API_ENDPOINTS } from '../config/api.config';
import type {
  StaffTransactionSummary,
  StaffTransactionDetail,
  StaffTransactionSearchParams,
  StaffTransactionStats,
  SpringPage,
} from '../types/transactions.types';

export const transactionApi = {
  search: async (
    params: StaffTransactionSearchParams = {},
    signal?: AbortSignal
  ): Promise<SpringPage<StaffTransactionSummary>> => {
    const cleanParams: Record<string, string | number> = {};
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '' && value !== 'ALL') {
        cleanParams[key] = value;
      }
    }

    const response = await axiosInstance.get<SpringPage<StaffTransactionSummary>>(
      API_ENDPOINTS.STAFF_TRANSACTIONS.BASE,
      {
        params: cleanParams,
        signal,
      }
    );
    return response.data;
  },

  getByIdentifier: async (
    identifier: string,
    signal?: AbortSignal
  ): Promise<StaffTransactionDetail> => {
    const response = await axiosInstance.get<StaffTransactionDetail>(
      API_ENDPOINTS.STAFF_TRANSACTIONS.BY_IDENTIFIER(identifier),
      { signal }
    );
    return response.data;
  },

  getStats: async (signal?: AbortSignal): Promise<StaffTransactionStats> => {
    const response = await axiosInstance.get<StaffTransactionStats>(
      API_ENDPOINTS.STAFF_TRANSACTIONS.STATS,
      { signal }
    );
    return response.data;
  },
};
