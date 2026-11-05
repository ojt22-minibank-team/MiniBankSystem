import type React from "react";

export interface TransferReceiptData {
  transactionRef: string;
  amount: number;
  currency: string;
  serviceFee: number;
  totalDebitedAmount?: number | null;

  completedAt: string;

  sourceAccountNumber: string;
  sourceDisplayName?: string;

  destinationAccountNumber: string;
  destinationDisplayName?: string;

  direction?: "IN" | "OUT" | "NONE";
  isOwnAccount?: boolean;

  description?: string | null;
  status: string;

  badgeLabel?: string;
  transactionType?: string;
}

export interface TransferReceiptViewProps {
  data: TransferReceiptData;
  showQr?: boolean;
  actions?: React.ReactNode;
  onCopyReference?: () => void;
  className?: string;
  onClose?: () => void;
}

export function mapP2PResponseToReceiptData(
  result: {
    transactionRef: string;
    amount: number;
    currency?: string;
    serviceFee?: number;
    totalDebitedAmount?: number;
    completedAt?: string;
    sourceAccountNumber: string;
    destinationAccountNumber: string;
    description?: string;
    status?: string;
  },
  recipientName?: string,
  isOwnAccount?: boolean
): TransferReceiptData {
  const serviceFee = Number(result.serviceFee || 0);
  const amount = Number(result.amount);
  const totalDebited =
    result.totalDebitedAmount != null
      ? Number(result.totalDebitedAmount)
      : amount + serviceFee;

  return {
    transactionRef: result.transactionRef,
    amount,
    currency: result.currency || "MMK",
    serviceFee,
    totalDebitedAmount: totalDebited,
    completedAt: result.completedAt || new Date().toISOString(),
    sourceAccountNumber: result.sourceAccountNumber,
    sourceDisplayName: "My Account",
    destinationAccountNumber: result.destinationAccountNumber,
    destinationDisplayName: isOwnAccount ? "My Account" : (recipientName || "Verified Account"),
    direction: "OUT",
    isOwnAccount: Boolean(isOwnAccount),
    description: result.description || null,
    status: result.status || "COMPLETED",
    badgeLabel: isOwnAccount ? "OWN ACCOUNT TRANSFER" : "P2P TRANSFER",
    transactionType: "TRANSFER",
  };
}
