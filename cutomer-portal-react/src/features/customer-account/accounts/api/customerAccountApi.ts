import api from "../../../../config/api";
import type {
  CustomerAccount,
  TransferLimitInfo,
  UpdateTransferLimitPayload,
} from "../types/accountTypes";

export async function getMyAccounts(): Promise<CustomerAccount[]> {
  const response = await api.get<CustomerAccount[]>("/accounts");

  return response.data;
}

export async function getMyAccount(
  accountNumber: string
): Promise<CustomerAccount> {
  const response = await api.get<CustomerAccount>(
    `/accounts/${encodeURIComponent(accountNumber)}`
  );

  return response.data;
}

export async function getAccountTransferLimits(
  accountNumber: string
): Promise<TransferLimitInfo> {
  const response = await api.get<TransferLimitInfo>(
    `/accounts/${encodeURIComponent(accountNumber)}/transfer-limits`
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