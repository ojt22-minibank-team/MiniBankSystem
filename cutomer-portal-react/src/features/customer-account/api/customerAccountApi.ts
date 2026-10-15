import api from "../../../config/api";
import type { CustomerAccount } from "../types/accountTypes";

export async function getMyAccounts(): Promise<CustomerAccount[]> {
  const response = await api.get<CustomerAccount[]>("/accounts");

  return response.data;
}

export async function getMyAccount(
  accountNumber: string
): Promise<CustomerAccount> {
  const response = await api.get<CustomerAccount>(
    `/accounts/${accountNumber}`
  );

  return response.data;
}