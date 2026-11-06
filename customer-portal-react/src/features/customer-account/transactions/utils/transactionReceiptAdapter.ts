import type { CusTransactionHistoryItemDTO } from "../types/transactionHistoryTypes";
import type { TransferReceiptData } from "../../../transfer/types/transferReceiptTypes";

/**
 * Adapts a customer transaction history item into the shared TransferReceiptData model.
 * 
 * Rules:
 * - Own-account transfers: "Own Source Account" / "Own Destination Account"
 * - Outgoing transfers: source = "My Account", destination = counterpartyName || "Recipient"
 * - Incoming transfers: source = counterpartyName || "Sender", destination = "My Account"
 * - Total debited: calculated for OUT (amount + fee), null for IN
 */
export function mapHistoryItemToTransferReceiptData(
  transaction: CusTransactionHistoryItemDTO
): TransferReceiptData {
  const isOutgoing = transaction.direction === "OUT";
  const isIncoming = transaction.direction === "IN";
  const amount = Number(transaction.amount);
  const serviceFee = Number(transaction.serviceFee ?? 0);

  // Total Debited: strictly for outgoing transfers; suppressed (null) for incoming credits
  const totalDebitedAmount = isOutgoing ? amount + serviceFee : null;

  let sourceDisplayName: string;
  let destinationDisplayName: string;

  if (transaction.isOwnAccount) {
    sourceDisplayName = "Own Source Account";
    destinationDisplayName = "Own Destination Account";
  } else if (isIncoming) {
    sourceDisplayName = transaction.counterpartyName?.trim() || "Sender";
    destinationDisplayName = "My Account";
  } else {
    // Outgoing transfer
    sourceDisplayName = "My Account";
    destinationDisplayName = transaction.counterpartyName?.trim() || "Recipient";
  }

  const completedAt =
    transaction.completedAt ||
    transaction.initiatedAt ||
    transaction.transactionDate ||
    new Date().toISOString();

  return {
    transactionRef: transaction.transactionRef,
    amount,
    currency: transaction.currency || "MMK",
    serviceFee,
    totalDebitedAmount,
    completedAt,
    sourceAccountNumber: transaction.sourceAccountNumber || "",
    sourceDisplayName,
    destinationAccountNumber: transaction.destinationAccountNumber || "",
    destinationDisplayName,
    direction: transaction.direction,
    isOwnAccount: Boolean(transaction.isOwnAccount),
    description: transaction.description || null,
    status: transaction.status,
    badgeLabel: "INTERNAL TRANSFER",
    transactionType: transaction.transactionType,
  };
}
