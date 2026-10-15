
export type AccountType = "SAVINGS" | "CURRENT";

export type AccountStatus =
  | "ACTIVE"
  | "DORMANT"
  | "FROZEN"
  | "CLOSED";

export type AccountCategory =
  | "RETAIL"
  | "CORPORATE"
  | "INTERNAL";

export interface CustomerAccount {
  accountNumber: string;
  accountCategory: AccountCategory;
  accountType: AccountType;
  currency: string;
  currentBalance: number;
  availableBalance: number;
  minimumBalance: number;
  dailyTransferLimit: number;
  status: AccountStatus;
  jointAccount: boolean;
  requiredApprovals: number;
  openedAt: string;
  closedAt: string | null;
}

export interface Account {
  id: string;
  accountNumber: string;
  accountType: string;
  accountName: string;
  balance: number;
  availableBalance: number;
  currency: string;
  status: string;
  openDate: string;
}
