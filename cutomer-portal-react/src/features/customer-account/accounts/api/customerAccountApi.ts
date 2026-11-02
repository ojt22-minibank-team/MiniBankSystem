import api from "../../../../config/api";
import type {
  CustomerAccount,
  TransferLimitInfo,
  UpdateTransferLimitPayload,
} from "../types/accountTypes";

export async function getMyAccounts(
  signal?: AbortSignal
): Promise<CustomerAccount[]> {
  const response = await api.get<CustomerAccount[]>("/accounts", {
    signal,
  });

  return response.data;
}

export async function getMyAccount(
  accountNumber: string,
  signal?: AbortSignal
): Promise<CustomerAccount> {
  const response = await api.get<CustomerAccount>(
    `/accounts/${encodeURIComponent(accountNumber)}`,
    { signal }
  );

  return response.data;
}

export async function getAccountTransferLimits(
  accountNumber: string,
  signal?: AbortSignal
): Promise<TransferLimitInfo> {
  const response = await api.get<TransferLimitInfo>(
    `/accounts/${encodeURIComponent(accountNumber)}/transfer-limits`,
    { signal }
  );

  return response.data;
}

export async function updateAccountTransferLimits(
  accountNumber: string,
  payload: UpdateTransferLimitPayload
): Promise<TransferLimitInfo> {
  const response = await api.put<TransferLimitInfo>(
    `/accounts/${encodeURIComponent(accountNumber)}/transfer-limits`,
    payload
  );

  return response.data;
}