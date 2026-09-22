import type { Account } from "../types/accountTypes";
import type {
  Customer,
  Transaction,
} from "../types/customerTypes";

export const customer: Customer = {
  id: "CUS001",
  customerId: "CUS-00123",
  fullName: "Su Thet Hlyar",
  email: "suthet@example.com",
  phone: "09 123 456 789",
  address: "Yangon, Myanmar",
  role: "Customer",
  profileImage:
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200",
};

export const accounts: Account[] = [
  {
    id: "ACC001",
    accountNumber: "0001 2345 6789",
    accountType: "SAVING",
    accountName: "Saving Account",
    balance: 3250000,
    availableBalance: 3250000,
    currency: "MMK",
    status: "ACTIVE",
    openDate: "2023-01-12",
  },
  {
    id: "ACC002",
    accountNumber: "0009 8765 4321",
    accountType: "CURRENT",
    accountName: "Current Account",
    balance: 2000000,
    availableBalance: 2000000,
    currency: "MMK",
    status: "ACTIVE",
    openDate: "2024-02-15",
  },
];

export const transactions: Transaction[] = [
  {
    id: "TX001",
    accountId: "ACC001",
    description: "Transfer to Mg Mg",
    type: "TRANSFER",
    amount: -100000,
    date: "2025-09-11",
    status: "COMPLETED",
  },
  {
    id: "TX002",
    accountId: "ACC001",
    description: "Salary Deposit",
    type: "DEPOSIT",
    amount: 500000,
    date: "2025-09-10",
    status: "COMPLETED",
  },
  {
    id: "TX003",
    accountId: "ACC001",
    description: "Online Payment (Shop)",
    type: "PAYMENT",
    amount: -50000,
    date: "2025-09-08",
    status: "COMPLETED",
  },
  {
    id: "TX004",
    accountId: "ACC001",
    description: "ATM Withdrawal",
    type: "WITHDRAWAL",
    amount: -200000,
    date: "2025-09-05",
    status: "COMPLETED",
  },
];