import { useEffect, useState } from "react";
import {
  X,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Clock,
  Copy,
  Check,
  Building2,
  Info,
  Printer,
  RotateCcw,
} from "lucide-react";
import type { CusTransactionHistoryItemDTO } from "../types/transactionHistoryTypes";
import {
  formatTransactionAmount,
  formatTransactionDateTime,
  formatTypeLabel,
} from "../types/transactionHistoryTypes";
import TransactionStatusBadge from "./TransactionStatusBadge";
import TransferReceiptView from "../../../transfer/components/TransferReceiptView";
import { mapHistoryItemToTransferReceiptData } from "../utils/transactionReceiptAdapter";

interface TransactionDetailModalProps {
  transaction: CusTransactionHistoryItemDTO | null;
  onClose: () => void;
}

type DetailViewMode =
  | "SUCCESS_RECEIPT"
  | "FAILED"
  | "REJECTED"
  | "CANCELLED"
  | "REVERSED"
  | "PROCESSING";

function getViewMode(status?: string): DetailViewMode {
  const norm = (status || "").toUpperCase();
  switch (norm) {
    case "COMPLETED":
      return "SUCCESS_RECEIPT";
    case "FAILED":
      return "FAILED";
    case "REJECTED":
      return "REJECTED";
    case "CANCELLED":
      return "CANCELLED";
    case "REVERSED":
      return "REVERSED";
    case "INITIATED":
    case "PENDING_AUTHORIZATION":
    case "HELD":
    default:
      return "PROCESSING";
  }
}

function maskAccount(accNo?: string | null): string {
  if (!accNo || accNo.trim().length === 0) return "-";
  const clean = accNo.trim();
  const digits = clean.replace(/\D/g, "");
  if (digits.length >= 4) {
    return `•••• •••• ${digits.slice(-4)}`;
  }
  if (digits.length > 0) {
    return `•••• •••• ${digits}`;
  }
  return clean;
}

export default function TransactionDetailModal({
  transaction,
  onClose,
}: TransactionDetailModalProps) {
  const [copied, setCopied] = useState<boolean>(false);

  // ESC key listener for modal dismissal
  useEffect(() => {
    if (!transaction) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [transaction, onClose]);

  // Ensure body print class is cleanly removed if modal unmounts while printing
  useEffect(() => {
    return () => {
      document.body.classList.remove("printing-transaction-history-receipt");
    };
  }, []);

  if (!transaction) return null;

  const viewMode = getViewMode(transaction.status);
  const isCompleted = viewMode === "SUCCESS_RECEIPT";
  const isInternalTransfer = transaction.transactionType === "INTERNAL_TRANSFER";
  const isExternalPayment = transaction.transactionType === "EXTERNAL_PAYMENT";
  const isRefund = transaction.transactionType === "REFUND";
  const isDeposit = transaction.transactionType === "OTC_DEPOSIT";
  const isWithdrawal = transaction.transactionType === "OTC_WITHDRAWAL";
  const isLedger = transaction.transactionType === "LEDGER_ADJUSTMENT";

  // Date Resolution: completedAt for COMPLETED, otherwise initiatedAt
  const displayRawDate = isCompleted
    ? transaction.completedAt || transaction.initiatedAt || transaction.transactionDate
    : transaction.initiatedAt || transaction.transactionDate;
  const displayFormattedDate = formatTransactionDateTime(displayRawDate);
  const dateLabel = isCompleted ? "Completed Date & Time" : "Initiated Date & Time";

  // Primary title resolution
  const primaryTitle =
    transaction.displayTitle && transaction.displayTitle.trim().length > 0
      ? transaction.displayTitle.trim()
      : transaction.description && transaction.description.trim().length > 0
        ? transaction.description.trim()
        : formatTypeLabel(transaction.transactionType) || "Transaction";

  const handleCopyRef = async () => {
    try {
      await navigator.clipboard.writeText(transaction.transactionRef);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard write failures gracefully
    }
  };

  const handlePrint = () => {
    const originalTitle = document.title;
    const printClassName = "printing-transaction-history-receipt";

    const cleanup = () => {
      document.body.classList.remove(printClassName);
      document.title = originalTitle;
      window.removeEventListener("afterprint", cleanup);
    };

    // Listen to afterprint event (fires on both print confirmation and cancellation)
    window.addEventListener("afterprint", cleanup);

    // 1. Add print isolation class to body
    document.body.classList.add(printClassName);

    // 2. Clear document title (existing convention to suppress browser print header)
    document.title = "";

    // 3. Open native print dialog
    window.print();

    // 4. Fallback cleanup in case afterprint does not fire in some browsers
    setTimeout(cleanup, 1000);
  };

  // Status-specific banner headings and icons
  let statusHeading: string;
  let statusIcon: React.ReactNode;
  let statusIconWrapper: string;

  switch (viewMode) {
    case "SUCCESS_RECEIPT":
      statusHeading = "Transaction Successful";
      statusIcon = <CheckCircle2 className="h-6 w-6 text-emerald-600" aria-hidden="true" />;
      statusIconWrapper = "bg-emerald-50 border-emerald-200";
      break;
    case "FAILED":
      statusHeading = "Transaction Failed";
      statusIcon = <AlertCircle className="h-6 w-6 text-rose-600" aria-hidden="true" />;
      statusIconWrapper = "bg-rose-50 border-rose-200";
      break;
    case "REJECTED":
      statusHeading = "Transaction Rejected";
      statusIcon = <XCircle className="h-6 w-6 text-rose-600" aria-hidden="true" />;
      statusIconWrapper = "bg-rose-50 border-rose-200";
      break;
    case "CANCELLED":
      statusHeading = "Transaction Cancelled";
      statusIcon = <XCircle className="h-6 w-6 text-slate-500" aria-hidden="true" />;
      statusIconWrapper = "bg-slate-100 border-slate-200";
      break;
    case "REVERSED":
      statusHeading = "Transaction Reversed & Refunded";
      statusIcon = <RotateCcw className="h-6 w-6 text-indigo-600" aria-hidden="true" />;
      statusIconWrapper = "bg-indigo-50 border-indigo-200";
      break;
    case "PROCESSING":
    default:
      if (transaction.status === "PENDING_AUTHORIZATION") {
        statusHeading = "Pending Authorization";
        statusIcon = <Clock className="h-6 w-6 text-amber-600" aria-hidden="true" />;
        statusIconWrapper = "bg-amber-50 border-amber-200";
      } else if (transaction.status === "HELD") {
        statusHeading = "Transaction On Hold";
        statusIcon = <AlertCircle className="h-6 w-6 text-purple-600" aria-hidden="true" />;
        statusIconWrapper = "bg-purple-50 border-purple-200";
      } else {
        statusHeading = "Transaction Initiated";
        statusIcon = <Clock className="h-6 w-6 text-blue-600" aria-hidden="true" />;
        statusIconWrapper = "bg-blue-50 border-blue-200";
      }
      break;
  }

  // Calculate Total Debited for outgoing completed transactions
  const isOutgoing = transaction.direction === "OUT";
  const serviceFeeNum = Number(transaction.serviceFee || 0);
  const totalDebitedNum = isOutgoing && isCompleted ? Number(transaction.amount || 0) + serviceFeeNum : null;

  // If this is a completed INTERNAL_TRANSFER, reuse the shared TransferReceiptView
  if (isCompleted && isInternalTransfer) {
    const receiptData = mapHistoryItemToTransferReceiptData(transaction);

    return (
      <div
        className="transaction-history-receipt-backdrop fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 sm:p-6 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="transaction-detail-title"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-xl print:static print:w-full print:max-w-none print:m-0"
        >
          <TransferReceiptView
            data={receiptData}
            showQr={true}
            onClose={onClose}
            className="transaction-history-receipt-print max-h-[90vh] overflow-y-auto"
            actions={
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-[#0878E8]"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-500" />
                  <span>Print Receipt</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-[#0878E8]"
                >
                  Close
                </button>
              </div>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className="transaction-history-receipt-backdrop fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 sm:p-6 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="transaction-detail-title"
    >
      <div
        className="transaction-history-receipt-print relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white shadow-2xl transition-all border border-slate-200 animate-in zoom-in-95 duration-200 flex flex-col print-receipt-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Bank Header */}
        <div className="bg-[#08295C] px-6 py-4 text-white flex items-center justify-between border-b border-blue-900/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/20 text-blue-300 border border-blue-400/30">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-black tracking-wider uppercase text-white">Mini Bank</h2>
              <p className="text-[10px] text-blue-200 font-medium">Transaction Activity Detail</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-blue-800/60 text-blue-200 border border-blue-700/50">
              {formatTypeLabel(transaction.transactionType)}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="no-print p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-blue-800/80 transition-colors focus:outline-none focus:ring-2 focus:ring-white/40"
              aria-label="Close transaction details"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Status & Amount Summary Banner */}
        <div className="bg-white px-6 py-5 text-center border-b border-slate-100 shrink-0">
          <div
            className={`inline-flex items-center justify-center w-12 h-12 rounded-full border mb-2.5 shadow-xs ${statusIconWrapper}`}
          >
            {statusIcon}
          </div>
          <h3 id="transaction-detail-title" className="text-lg font-black text-slate-900 tracking-tight">
            {statusHeading}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">{primaryTitle}</p>

          <div className="mt-3 inline-block bg-slate-50 border border-slate-200/80 px-5 py-2 rounded-2xl">
            <div className="text-2xl sm:text-3xl font-black tracking-tight tabular-nums text-slate-900">
              {isCompleted
                ? formatTransactionAmount(transaction.amount, transaction.currency, transaction.direction)
                : formatTransactionAmount(transaction.amount, transaction.currency, "NONE")}
            </div>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 space-y-5 flex-1">
          {/* Status-specific Alerts / Notice Banners */}
          {viewMode === "REVERSED" && (
            <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-800 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <RotateCcw className="w-4 h-4 shrink-0 text-indigo-600" />
                <span>
                  {transaction.failureMessage?.trim() || "This transfer was automatically reversed and refunded."}
                </span>
              </div>
              <p className="text-[11px] text-indigo-700 pl-5">
                Funds have been credited back to your account.
              </p>
              {transaction.failureCode?.trim() && (
                <p className="text-[11px] font-mono text-indigo-700 pl-5">
                  Reversal Code: {transaction.failureCode.trim()}
                </p>
              )}
            </div>
          )}

          {viewMode === "FAILED" && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>
                  {transaction.failureMessage?.trim() || "The transaction could not be completed."}
                </span>
              </div>
              {transaction.failureCode?.trim() && (
                <p className="text-[11px] font-mono text-rose-700 pl-5">
                  Reference Code: {transaction.failureCode.trim()}
                </p>
              )}
            </div>
          )}

          {viewMode === "REJECTED" && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <XCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>
                  {transaction.failureMessage?.trim() || "The transaction was rejected by policy rules."}
                </span>
              </div>
              {transaction.failureCode?.trim() && (
                <p className="text-[11px] font-mono text-rose-700 pl-5">
                  Reason Code: {transaction.failureCode.trim()}
                </p>
              )}
            </div>
          )}

          {viewMode === "CANCELLED" && (
            <div className="p-3.5 rounded-2xl bg-slate-100 border border-slate-200 text-xs text-slate-700 space-y-1">
              <div className="flex items-center gap-1.5 font-medium">
                <Info className="w-4 h-4 shrink-0 text-slate-500" />
                <span>
                  {transaction.failureMessage?.trim() || "This transaction was cancelled prior to settlement."}
                </span>
              </div>
              {transaction.failureCode?.trim() && (
                <p className="text-[11px] font-mono text-slate-600 pl-5">
                  Cancellation Code: {transaction.failureCode.trim()}
                </p>
              )}
            </div>
          )}

          {viewMode === "PROCESSING" && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
              <Clock className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              <span>
                {transaction.status === "PENDING_AUTHORIZATION"
                  ? "This transaction is currently awaiting authorization or signatory approval."
                  : transaction.status === "HELD"
                    ? "This transaction is temporarily on hold pending review."
                    : "This transaction is currently being processed by the core banking engine."}
              </span>
            </div>
          )}

          {/* Accounts & Parties Visual Section */}
          {isInternalTransfer && (
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* From Box */}
                <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-xs">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">
                    {transaction.isOwnAccount
                      ? "From: Own Account"
                      : transaction.direction === "IN"
                        ? "From (Sender)"
                        : "From (My Account)"}
                  </span>
                  <p className="text-xs font-semibold text-slate-900 truncate">
                    {transaction.isOwnAccount
                      ? "Own Source Account"
                      : transaction.direction === "IN"
                        ? transaction.counterpartyName || "External Sender"
                        : "My Account"}
                  </p>
                  <p className="text-[11px] font-mono font-medium text-slate-600 mt-0.5">
                    {maskAccount(transaction.sourceAccountNumber)}
                  </p>
                </div>

                {/* To Box */}
                <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-xs">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">
                    {transaction.isOwnAccount
                      ? "To: Own Account"
                      : transaction.direction === "IN"
                        ? "To (My Account)"
                        : "To (Recipient)"}
                  </span>
                  <p className="text-xs font-semibold text-slate-900 truncate">
                    {transaction.isOwnAccount
                      ? "Own Destination Account"
                      : transaction.direction === "IN"
                        ? "My Account"
                        : transaction.counterpartyName || "Recipient"}
                  </p>
                  <p className="text-[11px] font-mono font-medium text-slate-600 mt-0.5">
                    {maskAccount(transaction.destinationAccountNumber)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {isExternalPayment && (
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-xs">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">
                    Paid From (Account)
                  </span>
                  <p className="text-xs font-semibold text-slate-900">My Account</p>
                  <p className="text-[11px] font-mono font-medium text-slate-600 mt-0.5">
                    {maskAccount(transaction.sourceAccountNumber)}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-xs">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">
                    Paid To (Merchant)
                  </span>
                  <p className="text-xs font-semibold text-slate-900 truncate">
                    {transaction.counterpartyName || "Verified Merchant"}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Commercial Settlement</p>
                </div>
              </div>
            </div>
          )}

          {isRefund && (
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-xs">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">
                  Credited To Account
                </span>
                <p className="text-xs font-semibold text-slate-900">My Account</p>
                <p className="text-[11px] font-mono font-medium text-slate-600 mt-0.5">
                  {maskAccount(transaction.destinationAccountNumber)}
                </p>
              </div>
            </div>
          )}

          {(isDeposit || isWithdrawal || isLedger) && (
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-xs">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">
                  {isDeposit ? "Credited Account" : "Debited Account"}
                </span>
                <p className="text-xs font-semibold text-slate-900">My Account</p>
                <p className="text-[11px] font-mono font-medium text-slate-600 mt-0.5">
                  {maskAccount(transaction.sourceAccountNumber || transaction.destinationAccountNumber)}
                </p>
              </div>
            </div>
          )}

          {/* Detailed Breakdown */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 space-y-2.5 text-xs">
            {/* Reference with copy */}
            <div className="flex justify-between items-center py-1 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Transaction Reference</span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">
                  {transaction.transactionRef}
                </span>
                <button
                  type="button"
                  onClick={handleCopyRef}
                  className="no-print text-slate-400 hover:text-blue-600 transition-colors p-1 rounded-md hover:bg-slate-100"
                  title="Copy Reference"
                  aria-label="Copy transaction reference"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            {/* Date & Time */}
            <div className="flex justify-between items-center py-1 border-b border-slate-100">
              <span className="text-slate-500 font-medium">{dateLabel}</span>
              <span className="font-medium text-slate-800">{displayFormattedDate}</span>
            </div>

            {/* Transaction Type */}
            <div className="flex justify-between items-center py-1 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Transaction Type</span>
              <span className="font-medium text-slate-800">
                {formatTypeLabel(transaction.transactionType)}
              </span>
            </div>

            {/* Base Amount */}
            <div className="flex justify-between items-center py-1 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Amount</span>
              <span className="font-bold text-slate-900 tabular-nums">
                {formatTransactionAmount(transaction.amount, transaction.currency, "NONE")}
              </span>
            </div>

            {/* Service Fee: Always shown, visually neutral */}
            <div className="flex justify-between items-center py-1 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Service Fee</span>
              <span className="font-medium text-slate-800 tabular-nums">
                {formatTransactionAmount(transaction.serviceFee, transaction.currency, "NONE")}
              </span>
            </div>

            {/* Total Debited: For outgoing completed only */}
            {totalDebitedNum !== null && (
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-700 font-semibold">Total Debited</span>
                <span className="font-bold text-slate-900 tabular-nums">
                  -{formatTransactionAmount(totalDebitedNum, transaction.currency, "NONE")}
                </span>
              </div>
            )}

            {/* Status Badge */}
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-500 font-medium">Status</span>
              <TransactionStatusBadge status={transaction.status} />
            </div>

            {/* Note / Memo: Only when description is nonblank */}
            {transaction.description && transaction.description.trim().length > 0 && (
              <div className="pt-2 border-t border-slate-100">
                <span className="text-slate-500 font-medium block mb-1">Note</span>
                <div className="rounded-xl bg-slate-50 p-2.5 text-xs text-slate-700 italic border border-slate-100">
                  "{transaction.description.trim()}"
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="no-print p-4 sm:p-5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
          {isCompleted && (
            <button
              type="button"
              onClick={handlePrint}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-[#0878E8]"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>Print Receipt</span>
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-[#0878E8]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
