import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toBlob } from "html-to-image";
import {
  Building2,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Clock,
  RotateCcw,
  Info,
  Copy,
  Check,
  Printer,
  ArrowLeft,
  Share2,
  Download,
  Home,
  History,
  Loader2,
  X,
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

interface TransactionDetailContentProps {
  transaction: CusTransactionHistoryItemDTO;
  onBack: () => void;
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

/* -------------------------------------------------------------------------- */
/* Social & Chat Icons for Desktop Receipt Sharing                            */
/* -------------------------------------------------------------------------- */

const TelegramIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
  </svg>
);

const ViberIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M19.78 14.54c-.5-.33-1.03-.61-1.58-.84-.53-.22-1.11-.27-1.63-.07-.36.14-.68.39-.96.68l-.57.57c-.23.23-.55.33-.86.23-.9-.29-2.27-1.1-3.26-2.09-.99-.99-1.8-2.36-2.09-3.26-.1-.31 0-.63.23-.86l.57-.57c.29-.28.54-.6.68-.96.2-.52.15-1.1-.07-1.63-.23-.55-.51-1.08-.84-1.58-.45-.67-1.14-1.07-1.94-1.11-.8-.04-1.57.28-2.11.87l-.46.5c-.75.82-1.12 1.91-1.02 3 .27 2.8 1.92 6.09 4.38 8.55 2.46 2.46 5.75 4.11 8.55 4.38 1.09.1 2.18-.27 3-1.02l.5-.46c.59-.54.91-1.31.87-2.11-.04-.8-.44-1.49-1.11-1.94m-5.08-10.7c3.48.33 6.22 3.07 6.55 6.55m-6.55-4.14c1.98.27 3.54 1.83 3.81 3.81" />
  </svg>
);

const MessengerIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 2C6.477 2 2 6.145 2 11.258c0 2.91 1.455 5.518 3.735 7.185V22l3.415-1.874c.905.25 1.865.385 2.85.385 5.523 0 10-4.145 10-9.253C22 6.145 17.523 2 12 2zm1.06 12.38l-2.695-2.875-5.258 2.875 5.786-6.142 2.76 2.875 5.193-2.875-5.786 6.142z" />
  </svg>
);

const WhatsAppIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.888 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

const isMobileDevice = (): boolean => {
  if (typeof window === "undefined") return false;
  const userAgent = navigator.userAgent || "";
  return /Android|iPhone|iPad|iPod|Mobile/i.test(userAgent);
};

async function copyImageToClipboard(blob: Blob): Promise<boolean> {
  if (
    typeof ClipboardItem !== "undefined" &&
    navigator.clipboard &&
    navigator.clipboard.write
  ) {
    try {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

export default function TransactionDetailContent({
  transaction,
  onBack,
}: TransactionDetailContentProps) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState<boolean>(false);
  const [isSharing, setIsSharing] = useState<boolean>(false);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [shareImageBlob, setShareImageBlob] = useState<Blob | null>(null);
  const [shareImageUrl, setShareImageUrl] = useState<string | null>(null);
  const [imageCopied, setImageCopied] = useState<boolean>(false);

  // Clean up print isolation class if unmounted while printing
  useEffect(() => {
    return () => {
      document.body.classList.remove("printing-transaction-history-receipt");
    };
  }, []);

  // Clean up object URL when component unmounts
  useEffect(() => {
    return () => {
      if (shareImageUrl) {
        URL.revokeObjectURL(shareImageUrl);
      }
    };
  }, [shareImageUrl]);

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
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Ignore clipboard write failures gracefully
    }
  };

  const getReceiptBlob = async (element: HTMLElement): Promise<Blob> => {
    const blob = await toBlob(element, {
      pixelRatio: 2,
      backgroundColor: "#ffffff",
      filter: (node: Node) => {
        if (node instanceof HTMLElement && node.classList.contains("no-print")) {
          return false;
        }
        return true;
      },
    });
    if (!blob) throw new Error("Failed to generate image blob");
    return blob;
  };

  const handleShare = async () => {
    if (isSharing) return;
    setIsSharing(true);

    try {
      const receiptElement =
        (document.getElementById("receipt-capture-area") as HTMLElement) ||
        (document.querySelector(".print-receipt-container") as HTMLElement);

      if (!receiptElement) {
        throw new Error("Receipt element not found");
      }

      const blob = await getReceiptBlob(receiptElement);
      const filename = `ekaraj-receipt-${transaction.transactionRef || Date.now()}.png`;
      const file = new File([blob], filename, { type: "image/png" });

      if (
        isMobileDevice() &&
        typeof navigator !== "undefined" &&
        navigator.share &&
        navigator.canShare &&
        navigator.canShare({ files: [file] })
      ) {
        try {
          await navigator.share({
            files: [file],
            title: "EKARAJ BANK Transfer Receipt",
            text: `Official EKARAJ BANK Transfer Receipt\nRef: ${transaction.transactionRef}\nAmount: ${Number(transaction.amount).toLocaleString()} ${transaction.currency || "MMK"}`,
          });
          return;
        } catch (shareErr: unknown) {
          if ((shareErr as Error)?.name === "AbortError") {
            return;
          }
        }
      }

      const copiedOk = await copyImageToClipboard(blob);
      setImageCopied(copiedOk);

      if (shareImageUrl) {
        URL.revokeObjectURL(shareImageUrl);
      }
      setShareImageBlob(blob);
      setShareImageUrl(URL.createObjectURL(blob));
      setShowShareModal(true);
    } catch (err) {
      console.error("Failed to share receipt image:", err);
      if (typeof navigator !== "undefined" && navigator.share) {
        try {
          await navigator.share({
            title: "EKARAJ BANK Transfer Receipt",
            text: `EKARAJ BANK Transfer Receipt\nRef: ${transaction.transactionRef}\nAmount: ${Number(transaction.amount).toLocaleString()} ${transaction.currency || "MMK"}`,
          });
        } catch {
          // User cancelled
        }
      }
    } finally {
      setIsSharing(false);
    }
  };

  const handleShareToTelegram = async () => {
    if (shareImageBlob) {
      const ok = await copyImageToClipboard(shareImageBlob);
      if (ok) setImageCopied(true);
    }
    window.open("https://web.telegram.org", "_blank", "noopener,noreferrer");
  };

  const handleShareToViber = async () => {
    if (shareImageBlob) {
      const ok = await copyImageToClipboard(shareImageBlob);
      if (ok) setImageCopied(true);
    }
    try {
      window.location.href = "viber://";
    } catch {
      window.open("https://www.viber.com", "_blank", "noopener,noreferrer");
    }
  };

  const handleShareToMessenger = async () => {
    if (shareImageBlob) {
      const ok = await copyImageToClipboard(shareImageBlob);
      if (ok) setImageCopied(true);
    }
    window.open("https://www.messenger.com", "_blank", "noopener,noreferrer");
  };

  const handleShareToWhatsApp = async () => {
    if (shareImageBlob) {
      const ok = await copyImageToClipboard(shareImageBlob);
      if (ok) setImageCopied(true);
    }
    window.open("https://web.whatsapp.com", "_blank", "noopener,noreferrer");
  };

  const handlePrint = () => {
    const originalTitle = document.title;
    const printClassName = "printing-transaction-history-receipt";

    const cleanup = () => {
      document.body.classList.remove(printClassName);
      document.title = originalTitle;
      window.removeEventListener("afterprint", cleanup);
    };

    window.addEventListener("afterprint", cleanup);
    document.body.classList.add(printClassName);
    document.title = "";
    window.print();
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

  // For COMPLETED INTERNAL_TRANSFER, reuse the official TransferReceiptView
  if (isCompleted && isInternalTransfer) {
    const receiptData = mapHistoryItemToTransferReceiptData(transaction);

    return (
      <div className="w-full max-w-xl mx-auto print:max-w-none print:m-0">
        <TransferReceiptView
          data={receiptData}
          showQr={true}
          onClose={onBack}
          className="transaction-history-receipt-print shadow-xl rounded-3xl"
          actions={
            <div className="space-y-3 pt-1">
              {/* Row of 3 Primary Action Buttons: [ Share Receipt ] [ Download PDF ] [ Copy Ref ] */}
              <div className="grid grid-cols-3 gap-2">
                {/* 1. Share Receipt */}
                <button
                  type="button"
                  onClick={handleShare}
                  disabled={isSharing}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-1.5 sm:px-2 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 font-bold text-xs text-slate-700 transition shadow-2xs disabled:opacity-75 disabled:cursor-wait cursor-pointer"
                  title="Share Receipt (opens social apps & copies slip to clipboard)"
                >
                  {isSharing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#00A3C4] shrink-0" />
                      <span className="truncate">Sharing...</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-3.5 h-3.5 text-[#00A3C4] shrink-0" />
                      <span className="truncate">Share Receipt</span>
                    </>
                  )}
                </button>

                {/* 2. Download PDF */}
                <button
                  type="button"
                  onClick={handlePrint}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-1.5 sm:px-2 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 font-bold text-xs text-slate-700 transition shadow-2xs cursor-pointer"
                  title="Download or Print PDF receipt"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="truncate">Download PDF</span>
                </button>

                {/* 3. Copy Ref */}
                <button
                  type="button"
                  onClick={handleCopyRef}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-1.5 sm:px-2 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 font-bold text-xs text-slate-700 transition shadow-2xs cursor-pointer"
                  title="Copy transaction reference code"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="text-emerald-700 truncate">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="truncate">Copy Ref</span>
                    </>
                  )}
                </button>
              </div>

              {/* Secondary Return / Navigation Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => navigate("/dashboard")}
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-slate-200 bg-white font-bold text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition cursor-pointer"
                >
                  <Home className="w-3.5 h-3.5 text-slate-400" />
                  <span>Dashboard</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/transaction")}
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-slate-200 bg-white font-bold text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition cursor-pointer"
                >
                  <History className="w-3.5 h-3.5 text-slate-400" />
                  <span>Transaction History</span>
                </button>
              </div>
            </div>
          }
        />

        {/* Interactive Desktop Share Modal */}
        {showShareModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in"
              onClick={() => setShowShareModal(false)}
            />
            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm p-5 text-slate-800 animate-in zoom-in-95 border border-slate-100 max-h-[92vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-cyan-50 text-[#00A3C4] flex items-center justify-center">
                    <Share2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 leading-tight">
                      Share Transfer Receipt
                    </h3>
                    <p className="text-[10px] font-medium text-slate-400">
                      EKARAJ BANK Official Slip
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowShareModal(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Receipt Preview Thumbnail */}
              {shareImageUrl && (
                <div className="mb-3 p-1.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-center overflow-hidden">
                  <img
                    src={shareImageUrl}
                    alt="Receipt Preview"
                    className="max-h-40 w-auto object-contain rounded-xl shadow-2xs"
                  />
                </div>
              )}

              {/* Status Banner */}
              {imageCopied && (
                <div className="mb-3 p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-2 text-xs font-bold animate-in fade-in">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Slip image copied! Press <strong>Ctrl + V</strong> in your chat to paste.
                  </span>
                </div>
              )}

              {/* Quick Copy Image Button */}
              <div className="mb-3">
                <button
                  type="button"
                  onClick={async () => {
                    if (shareImageBlob) {
                      const ok = await copyImageToClipboard(shareImageBlob);
                      setImageCopied(ok);
                    }
                  }}
                  className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl font-bold text-xs transition duration-200 shadow-sm cursor-pointer ${
                    imageCopied
                      ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20"
                      : "bg-[#00A3C4] hover:bg-[#0891B2] text-white shadow-cyan-500/20"
                  }`}
                >
                  {imageCopied ? (
                    <>
                      <Check className="w-4 h-4 shrink-0" />
                      <span>Slip Image Copied to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 shrink-0" />
                      <span>Copy Slip Image</span>
                    </>
                  )}
                </button>
              </div>

              {/* Social / Chat Share Apps */}
              <div className="pt-3 border-t border-slate-100">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
                  Open Chat App to Paste
                </p>

                <div className="grid grid-cols-4 gap-2">
                  {/* Telegram */}
                  <button
                    type="button"
                    onClick={handleShareToTelegram}
                    className="flex flex-col items-center justify-center p-2 rounded-2xl border border-slate-200 hover:border-[#229ED9] hover:bg-[#229ED9]/5 transition group cursor-pointer"
                    title="Open Telegram Web"
                  >
                    <div className="w-8 h-8 rounded-xl bg-[#229ED9]/10 text-[#229ED9] flex items-center justify-center group-hover:scale-110 transition">
                      <TelegramIcon className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-700 mt-1">Telegram</span>
                  </button>

                  {/* Viber */}
                  <button
                    type="button"
                    onClick={handleShareToViber}
                    className="flex flex-col items-center justify-center p-2 rounded-2xl border border-slate-200 hover:border-[#7360F2] hover:bg-[#7360F2]/5 transition group cursor-pointer"
                    title="Open Viber App"
                  >
                    <div className="w-8 h-8 rounded-xl bg-[#7360F2]/10 text-[#7360F2] flex items-center justify-center group-hover:scale-110 transition">
                      <ViberIcon className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-700 mt-1">Viber</span>
                  </button>

                  {/* Messenger */}
                  <button
                    type="button"
                    onClick={handleShareToMessenger}
                    className="flex flex-col items-center justify-center p-2 rounded-2xl border border-slate-200 hover:border-[#0084FF] hover:bg-[#0084FF]/5 transition group cursor-pointer"
                    title="Open Messenger"
                  >
                    <div className="w-8 h-8 rounded-xl bg-[#0084FF]/10 text-[#0084FF] flex items-center justify-center group-hover:scale-110 transition">
                      <MessengerIcon className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-700 mt-1">Messenger</span>
                  </button>

                  {/* WhatsApp */}
                  <button
                    type="button"
                    onClick={handleShareToWhatsApp}
                    className="flex flex-col items-center justify-center p-2 rounded-2xl border border-slate-200 hover:border-[#25D366] hover:bg-[#25D366]/5 transition group cursor-pointer"
                    title="Open WhatsApp Web"
                  >
                    <div className="w-8 h-8 rounded-xl bg-[#25D366]/10 text-[#25D366] flex items-center justify-center group-hover:scale-110 transition">
                      <WhatsAppIcon className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-700 mt-1">WhatsApp</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl mx-auto">
      <div className="transaction-history-receipt-print relative w-full overflow-hidden rounded-3xl bg-white shadow-xl border border-slate-200 flex flex-col print-receipt-container">
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
          </div>
        </div>

        {/* Status & Amount Summary Banner */}
        <div className="bg-white px-6 py-5 text-center border-b border-slate-100 shrink-0">
          <div
            className={`inline-flex items-center justify-center w-12 h-12 rounded-full border mb-2.5 shadow-xs ${statusIconWrapper}`}
          >
            {statusIcon}
          </div>
          <h3 className="text-lg font-black text-slate-900 tracking-tight">
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

        {/* Card Body */}
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

        {/* Footer / Actions */}
        <div className="no-print p-4 sm:p-5 bg-slate-50/80 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-end gap-3 shrink-0">
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
            onClick={onBack}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-6 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-[#0878E8]"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
            <span>Back to Transactions</span>
          </button>
        </div>
      </div>
    </div>
  );
}
