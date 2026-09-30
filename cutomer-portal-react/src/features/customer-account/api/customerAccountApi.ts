import type { CustomerAccount } from "../types/accountTypes";
import { apiClient } from "../../../services/apiClient";

export async function getMyAccounts(): Promise<CustomerAccount[]> {
  const response = await apiClient("/api/customer/accounts", {
    method: "GET",
  });

  if (!response.ok) {
    throw new Error(
      `Failed to load accounts: ${response.status}`
    );
  }

  return response.json();
}

export async function getMyAccount(
  accountNumber: string
): Promise<CustomerAccount> {
  const response = await apiClient(
    `/api/customer/accounts/${accountNumber}`,
    {
      method: "GET",
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to load account: ${response.status}`
    );
  }

  return response.json();
}