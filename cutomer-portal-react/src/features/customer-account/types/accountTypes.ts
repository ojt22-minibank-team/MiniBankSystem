export type AccountTypes = "SAVING" | "CURRENT";

export type AccountStatus =
  | "ACTIVE"
  | "FROZEN"
  | "SUSPENDED";

export interface CustomerAccount {
  accountNumber: string;
  accountCategory: string;
  accountType: string;
  currency: string;
  currentBalance: number;
  availableBalance: number;
  minimumBalance: number;
  dailyTransferLimit: number;
  status: string;
  jointAccount: boolean;
  requiredApprovals: number;
  openedAt: string;
  closedAt: string | null;
}
