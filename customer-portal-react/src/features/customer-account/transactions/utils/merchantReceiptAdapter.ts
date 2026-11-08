import type { CusTransactionHistoryItemDTO } from "../types/transactionHistoryTypes";
import type {
  PaymentReceipt as MerchantReceiptData,
  PaymentDetails,
} from "../../../merchant-payment/types/merchantPayment";

export interface MerchantReceiptProps {
  receipt: MerchantReceiptData;
  details: PaymentDetails;
  selectedAccount: string;
}

/**
 * Pure adapter converting a CusTransactionHistoryItemDTO into props for PaymentReceipt.
 *
 * Rules:
 * - merchantName: counterpartyName || "Verified Merchant"
 * - orderId: externalReference || "" (never manufactured or faked)
 * - amount: number (transaction.amount)
 * - currency: transaction.currency || "MMK"
 * - selectedAccount: sourceAccountNumber || fallbackAccountNumber || ""
 * - coreLedgerReference: transactionRef
 * - timestamp: completedAt || initiatedAt || transactionDate
 * - success: status === "COMPLETED"
 * - status: transaction.status
 */
export function mapHistoryItemToPaymentReceiptProps(
  transaction: CusTransactionHistoryItemDTO,
  fallbackAccountNumber?: string | null
): MerchantReceiptProps {
  const merchantName =
    transaction.counterpartyName && transaction.counterpartyName.trim().length > 0
      ? transaction.counterpartyName.trim()
      : "Verified Merchant";

  const orderId =
    transaction.externalReference && transaction.externalReference.trim().length > 0
      ? transaction.externalReference.trim()
      : "";

  const amount = Number(transaction.amount || 0);
  const currency = transaction.currency?.trim() || "MMK";

  const selectedAccount =
    transaction.sourceAccountNumber && transaction.sourceAccountNumber.trim().length > 0
      ? transaction.sourceAccountNumber.trim()
      : fallbackAccountNumber && fallbackAccountNumber.trim().length > 0
        ? fallbackAccountNumber.trim()
        : "";

  const coreLedgerReference = transaction.transactionRef;

  const timestamp =
    transaction.completedAt ||
    transaction.initiatedAt ||
    transaction.transactionDate ||
    new Date().toISOString();

  const success = transaction.status === "COMPLETED";
  const status = transaction.status;

  return {
    receipt: {
      success,
      message: "Payment Successful",
      paymentToken: transaction.transactionRef,
      coreLedgerReference,
      amount,
      currency,
      timestamp,
    },
    details: {
      merchantName,
      orderId,
      amount,
      currency,
      status,
    },
    selectedAccount,
  };
}
