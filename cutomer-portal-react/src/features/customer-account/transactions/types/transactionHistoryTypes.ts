import type { CustomerAccount } from "../../accounts/types/accountTypes";

export interface CusTransactionHistoryItemDTO {
  transactionRef: string;
  transactionDate: string;
  transactionType: string;
  status: string;
  direction: "IN" | "OUT" | "NONE";
  amount: number;
  currency: string;
  serviceFee: number;
  description: string;
  sourceAccountNumber: string | null;
  destinationAccountNumber: string | null;
  failureCode: string | null;
  failureMessage: string | null;
  initiatedAt: string;
  completedAt: string | null;
  counterpartyName: string | null;
  isOwnAccount: boolean;
  displayTitle: string;
}

export interface CusTransactionHistoryResponseDTO {
  content: CusTransactionHistoryItemDTO[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface TransactionHistoryQueryParams {
  accountNumber: string;
  status?: string;
  transactionType?: string;
  fromDate?: string;
  toDate?: string;
  minAmount?: number;
  maxAmount?: number;
  page?: number;
  size?: number;
}

export interface TransactionFilterDraft {
  status: string;
  transactionType: string;
  fromDate: string;
  toDate: string;
  minAmount: string;
  maxAmount: string;
}

export interface TransactionFilterApplied {
  status: string;
  transactionType: string;
  fromDate: string;
  toDate: string;
  minAmount?: number;
  maxAmount?: number;
}

/**
 * Pure helper for default account selection:
 * Priority 1: First ACTIVE CURRENT account
 * Priority 2: First ACTIVE account of any type
 * Priority 3: Empty string ""
 */
export function getDefaultSelectedAccountNumber(accounts: CustomerAccount[]): string {
  const activeCurrent = accounts.find(
    (a) => a.accountType === "CURRENT" && a.status === "ACTIVE"
  );
  if (activeCurrent) {
    return activeCurrent.accountNumber;
  }

  const firstActive = accounts.find((a) => a.status === "ACTIVE");
  if (firstActive) {
    return firstActive.accountNumber;
  }

  return "";
}

/**
 * Converts backend status string to readable title-case label:
 * e.g. "PENDING_AUTHORIZATION" -> "Pending Authorization"
 */
export function formatStatusLabel(status: string): string {
  if (!status) return "";
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Converts backend transaction type string to readable title-case label:
 * e.g. "INTERNAL_TRANSFER" -> "Internal Transfer", "OTC_DEPOSIT" -> "OTC Deposit"
 */
export function formatTypeLabel(type: string): string {
  if (!type) return "";
  return type
    .split("_")
    .map((word) => {
      const upper = word.toUpperCase();
      if (upper === "OTC" || upper === "P2P" || upper === "ATM" || upper === "QR") {
        return upper;
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

/**
 * Formats ISO date string into DD MMM YYYY HH:mm
 * e.g. "06 Oct 2026 10:30"
 */
export function formatTransactionDateTime(isoString: string): string {
  if (!isoString) return "-";
  try {
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return isoString;
    const day = String(d.getDate()).padStart(2, "0");
    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${day} ${month} ${year} ${hours}:${minutes}`;
  } catch {
    return isoString;
  }
}

/**
 * Formats amount strictly adhering to neutral colors and directional prefix:
 * IN:   +<amount> <currency>
 * OUT:  -<amount> <currency>
 * NONE: <amount> <currency>
 */
export function formatTransactionAmount(
  amount: number,
  currency: string,
  direction: "IN" | "OUT" | "NONE"
): string {
  const formattedNumber = Number(amount || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const curr = currency || "MMK";

  if (direction === "IN") {
    return `+${formattedNumber} ${curr}`;
  }
  if (direction === "OUT") {
    return `-${formattedNumber} ${curr}`;
  }
  return `${formattedNumber} ${curr}`;
}
