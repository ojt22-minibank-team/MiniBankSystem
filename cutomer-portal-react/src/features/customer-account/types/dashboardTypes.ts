
export type CustomerType = "PERSONAL" | "COMPANY";

export type DashboardAccountType = "SAVINGS" | "CURRENT";

export type DashboardAccountStatus =
  | "ACTIVE"
  | "DORMANT"
  | "FROZEN"
  | "CLOSED";

export interface DashboardAccount {
  accountNumber: string;
  accountCategory: string;
  accountType: DashboardAccountType;
  currency: string;
  currentBalance: number;
  availableBalance: number;
  status: DashboardAccountStatus;
  jointAccount: boolean;
}

export interface DashboardResponse {
  customerCode: string;
  fullName: string;
  customerType: CustomerType;
  totalBalance: number;
  accountCount: number;
  accounts: DashboardAccount[];
}
