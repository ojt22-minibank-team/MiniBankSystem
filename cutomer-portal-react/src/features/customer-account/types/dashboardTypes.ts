export interface DashboardAccount {
  accountNumber: string;
  accountCategory: string;
  accountType: string;
  currency: string;
  currentBalance: number;
  availableBalance: number;
  status: string;
  jointAccount: boolean;
}

export interface DashboardResponse {
  customerCode: string;
  fullName: string;
  totalBalance: number;
  accountCount: number;
  accounts: DashboardAccount[];
}