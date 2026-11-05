import api from "../../../../config/api";
import type {
  CusTransactionHistoryResponseDTO,
  TransactionHistoryQueryParams,
} from "../types/transactionHistoryTypes";

/**
 * Fetches paginated transaction history for the given account with optional filters.
 */
export async function getTransactions(
  params: TransactionHistoryQueryParams,
  signal?: AbortSignal
): Promise<CusTransactionHistoryResponseDTO> {
  const queryParams: Record<string, string | number> = {
    accountNumber: params.accountNumber,
    page: params.page ?? 0,
    size: params.size ?? 10,
  };

  if (params.status && params.status.trim() !== "") {
    queryParams.status = params.status.trim();
  }

  if (params.transactionType && params.transactionType.trim() !== "") {
    queryParams.transactionType = params.transactionType.trim();
  }

  if (params.fromDate && params.fromDate.trim() !== "") {
    queryParams.fromDate = params.fromDate.trim();
  }

  if (params.toDate && params.toDate.trim() !== "") {
    queryParams.toDate = params.toDate.trim();
  }

  if (params.minAmount !== undefined && !Number.isNaN(params.minAmount)) {
    queryParams.minAmount = params.minAmount;
  }

  if (params.maxAmount !== undefined && !Number.isNaN(params.maxAmount)) {
    queryParams.maxAmount = params.maxAmount;
  }

  const response = await api.get<CusTransactionHistoryResponseDTO>("/transactions", {
    params: queryParams,
    signal,
  });

  return response.data;
}

/**
 * Discovers distinct transaction statuses existing for the customer's account.
 */
export async function getTransactionStatuses(
  accountNumber: string,
  signal?: AbortSignal
): Promise<string[]> {
  const response = await api.get<string[]>("/transactions/statuses", {
    params: { accountNumber },
    signal,
  });

  return Array.isArray(response.data) ? response.data : [];
}

/**
 * Discovers distinct transaction types existing for the customer's account.
 */
export async function getTransactionTypes(
  accountNumber: string,
  signal?: AbortSignal
): Promise<string[]> {
  const response = await api.get<string[]>("/transactions/types", {
    params: { accountNumber },
    signal,
  });

  return Array.isArray(response.data) ? response.data : [];
}
