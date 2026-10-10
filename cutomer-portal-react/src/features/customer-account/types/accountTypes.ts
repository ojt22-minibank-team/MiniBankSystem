export type AccountTypes = "SAVING" | "CURRENT";

export type AccountStatus =
  | "ACTIVE"
  | "FROZEN"
  | "SUSPENDED";

export interface Account {
  id: string;
  accountNumber: string;
  accountType: AccountTypes;
  accountName: string;
  balance: number;
  availableBalance: number;
  currency: string;
  status: AccountStatus;
  openDate: string;
}
