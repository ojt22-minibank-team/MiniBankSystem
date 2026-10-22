
export const CUSTOMER_TYPES = {
  PERSONAL: "PERSONAL",
  COMPANY: "COMPANY",
} as const;

export type CustomerType =
  (typeof CUSTOMER_TYPES)[keyof typeof CUSTOMER_TYPES];

export const ACCOUNT_TYPES = {
  SAVINGS: "SAVINGS",
  CURRENT: "CURRENT",
} as const;

export type DashboardAccountType =
  (typeof ACCOUNT_TYPES)[keyof typeof ACCOUNT_TYPES];

export const ACCOUNT_STATUSES = {
  ACTIVE: "ACTIVE",
  DORMANT: "DORMANT",
  FROZEN: "FROZEN",
  CLOSED: "CLOSED",
} as const;

export type DashboardAccountStatus =
  (typeof ACCOUNT_STATUSES)[keyof typeof ACCOUNT_STATUSES];

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
