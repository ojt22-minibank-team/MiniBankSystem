export type AccountType = "SAVING" | "CURRENT";

export type AccountStatus =
  | "ACTIVE"
  | "FROZEN"
  | "SUSPENDED";

export type TransactionType =
  | "TRANSFER"
  | "DEPOSIT"
  | "WITHDRAWAL"
  | "PAYMENT";

export type TransactionStatus =
  | "COMPLETED"
  | "PENDING"
  | "FAILED";

export interface Account {
  id: string;
  accountNumber: string;
  accountType: AccountType;
  accountName: string;
  balance: number;
  availableBalance: number;
  currency: string;
  status: AccountStatus;
  openDate: string;
}

export interface Transaction {
  id: string;
  accountId: string;
  description: string;
  type: TransactionType;
  amount: number;
  date: string;
  status: TransactionStatus;
}

export interface Customer {
  id: string;
  customerId: string;
  fullName: string;
  email: string;
  phone: string;
  address: string;
  role: string;
  profileImage: string;
}