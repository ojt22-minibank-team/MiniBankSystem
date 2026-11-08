import { useState, useMemo } from "react";
import {
  Copy,
  Check,
  QrCode,
  X,
  ArrowRight,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  AlertOctagon,
  Landmark,
} from "lucide-react";
import { QRCodeView } from "../../../components/common/QRCodeView";
import { EkarajCrown } from "../../../components/common/EkarajLogo";
import type {
  TransferReceiptViewProps,
  TransferReceiptData,
} from "../types/transferReceiptTypes";

const maskAccount = (accNo?: string | null): string => {
  if (!accNo) return "-";
  const trimmed = accNo.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length >= 4) {
    return `**** ${digits.slice(-4)}`;
  }
  if (digits.length > 0) {
    return `**** ${digits}`;
  }
  return trimmed || "-";
};

const bulletMaskAccount = (accNo?: string | null): string => {
  if (!accNo) return "-";
  const trimmed = accNo.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length >= 6) {
    return `••••••${digits.slice(-6)}`;
  }
  if (digits.length >= 4) {
    return `••••${digits.slice(-4)}`;
  }
  if (digits.length > 0) {
    return `••••${digits}`;
  }
  return trimmed || "-";
};

const formatCurrencyAmount = (val: number | null | undefined, currency: string = "MMK"): string => {
  if (val == null || isNaN(Number(val))) return `${currency} 0.00`;
  return `${currency} ${Number(val).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const normalizeDisplayName = (name?: string | null, fallback: string = "My Account"): string => {
  if (!name) return fallback;
  const trimmed = name.trim();
  if (trimmed.toLowerCase() === "your account") return "My Account";
  return trimmed || fallback;
};

interface StatusConfig {
  title: string;
  badgeLabel: string;
  theme: "success" | "pending" | "failed";
  transferTypeLabel: string;
}

function resolveTypeLabel(
  typeUpper: string,
  descLower: string,
  direction?: "IN" | "OUT" | "NONE",
  isOwnAccount?: boolean
): string {
  if (typeUpper.includes("PAYMENT") || descLower.includes("payment") || descLower.includes("merchant")) {
    return "Merchant Payment";
  }
  if (typeUpper.includes("WITHDRAW") || descLower.includes("withdraw")) {
    return "Cash Withdrawal";
  }
  if (typeUpper.includes("DEPOSIT") || descLower.includes("deposit")) {
    return "Cash Deposit";
  }
  if (isOwnAccount) {
    return "Own Account Transfer";
  }
  if (direction === "IN") {
    return "Incoming Transfer";
  }
  return "Outgoing Transfer";
}

function resolveStatusConfig(data: TransferReceiptData): StatusConfig {
  const statusUpper = (data.status || "COMPLETED").toUpperCase().trim();
  const typeUpper = (data.transactionType || data.badgeLabel || "").toUpperCase().trim();
  const descLower = (data.description || "").toLowerCase();
  const transferTypeLabel = resolveTypeLabel(typeUpper, descLower, data.direction, data.isOwnAccount);

  // 0. Reversed / Refunded Cases
  if (statusUpper === "REVERSED" || statusUpper === "REFUNDED") {
    return {
      title: "Transfer Reversed & Refunded",
      badgeLabel: "REVERSED",
      theme: "failed",
      transferTypeLabel,
    };
  }

  // 1. Failed / Cancelled / Rejected Cases
  if (
    statusUpper === "FAILED" ||
    statusUpper === "REJECTED" ||
    statusUpper === "CANCELLED" ||
    statusUpper === "DECLINED"
  ) {
    let title = "Transfer Failed";
    if (typeUpper.includes("PAYMENT") || descLower.includes("merchant") || descLower.includes("payment")) {
      title = "Payment Failed";
    } else if (typeUpper.includes("WITHDRAW") || descLower.includes("withdraw")) {
      title = "Withdrawal Failed";
    } else if (typeUpper.includes("DEPOSIT") || descLower.includes("deposit")) {
      title = "Deposit Failed";
    } else if (data.isOwnAccount) {
      title = "Internal Transfer Failed";
    }
    return {
      title,
      badgeLabel: statusUpper,
      theme: "failed",
      transferTypeLabel,
    };
  }

  // 2. Pending / Processing / Queued Cases
  if (
    statusUpper === "PROCESSING" ||
    statusUpper === "PENDING" ||
    statusUpper === "QUEUED" ||
    statusUpper === "IN_PROGRESS" ||
    statusUpper === "SUBMITTED"
  ) {
    return {
      title: "Processing",
      badgeLabel: statusUpper === "PENDING" ? "PENDING" : "PROCESSING",
      theme: "pending",
      transferTypeLabel,
    };
  }

  // 3. Successful Cases
  let title: string;
  if (typeUpper.includes("PAYMENT") || descLower.includes("merchant") || descLower.includes("payment")) {
    title = "Payment Successful";
  } else if (typeUpper.includes("WITHDRAW") || descLower.includes("withdraw")) {
    title = "Withdrawal Successful";
  } else if (typeUpper.includes("DEPOSIT") || descLower.includes("deposit")) {
    title = "Deposit Successful";
  } else if (data.isOwnAccount) {
    title = "Internal Transfer Successful";
  } else if (data.direction === "IN") {
    title = "Funds Received";
  } else {
    title = "Transfer Successful";
  }

  return {
    title,
    badgeLabel: data.status || "COMPLETED",
    theme: "success",
    transferTypeLabel,
  };
}

export default function TransferReceiptView({
  data,
  showQr = true,
  actions,
  onCopyReference,
  className = "",
  onClose,
}: TransferReceiptViewProps) {
  const [copied, setCopied] = useState<boolean>(false);
  const [showQrModal, setShowQrModal] = useState<boolean>(false);

  const typeUpper = (data.transactionType || data.badgeLabel || "").toUpperCase().trim();
  const descLower = (data.description || "").toLowerCase();
  const isDeposit = typeUpper.includes("DEPOSIT") || descLower.includes("deposit");
  const isWithdrawal = typeUpper.includes("WITHDRAW") || descLower.includes("withdraw");

  const completedDate = useMemo(() => {
    if (!data.completedAt) return "";
    const d = new Date(data.completedAt);
    if (isNaN(d.getTime())) return data.completedAt;
    const dateStr = d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const timeStr = d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    return `${dateStr}, ${timeStr}`;
  }, [data.completedAt]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(data.transactionRef);
      setCopied(true);
      onCopyReference?.();
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Ignore clipboard write failures gracefully
    }
  };

  // Comprehensive Status, Title & Type Config
  const statusConfig = useMemo(() => resolveStatusConfig(data), [data]);

  // Balance summary resolutions for deposit / withdrawal
  const resolvedAvailBalance = useMemo(() => {
    if (data.availableBalance != null) return data.availableBalance;
    if (data.previousBalance != null) {
      return isDeposit
        ? data.previousBalance + data.amount
        : Math.max(0, data.previousBalance - data.amount - (data.serviceFee || 0));
    }
    return null;
  }, [data.availableBalance, data.previousBalance, data.amount, data.serviceFee, isDeposit]);

  const resolvedPrevBalance = useMemo(() => {
    if (data.previousBalance != null) return data.previousBalance;
    if (data.availableBalance != null) {
      return isDeposit
        ? Math.max(0, data.availableBalance - data.amount)
        : data.availableBalance + data.amount + (data.serviceFee || 0);
    }
    return null;
  }, [data.previousBalance, data.availableBalance, data.amount, data.serviceFee, isDeposit]);

  // Neutral transaction QR payload formatted cleanly for mobile cameras
  const qrPayload = useMemo(() => {
    if (isDeposit) {
      const acctDigits = (data.destinationAccountNumber || data.sourceAccountNumber || "").replace(/\D/g, "");
      const maskedAcc = acctDigits.length >= 6 ? `******${acctDigits.slice(-6)}` : acctDigits.length >= 4 ? `****${acctDigits.slice(-4)}` : acctDigits || "-";
      return [
        `EKARAJ BANK OFFICIAL RECEIPT`,
        `Type: Cash Deposit`,
        `Ref ID: ${data.transactionRef}`,
        `Deposit Amount: + ${Number(data.amount).toLocaleString()} ${data.currency || "MMK"}`,
        `Credited Account: ${maskedAcc} (${data.accountHolderName || data.destinationDisplayName || "Account Holder"})`,
        `Date: ${completedDate}`,
        `Status: ${statusConfig.badgeLabel}`,
      ].join("\n");
    }

    if (isWithdrawal) {
      const acctDigits = (data.sourceAccountNumber || data.destinationAccountNumber || "").replace(/\D/g, "");
      const maskedAcc = acctDigits.length >= 6 ? `******${acctDigits.slice(-6)}` : acctDigits.length >= 4 ? `****${acctDigits.slice(-4)}` : acctDigits || "-";
      return [
        `EKARAJ BANK OFFICIAL RECEIPT`,
        `Type: Cash Withdrawal`,
        `Ref ID: ${data.transactionRef}`,
        `Withdrawal Amount: - ${Number(data.amount).toLocaleString()} ${data.currency || "MMK"}`,
        `Debited Account: ${maskedAcc} (${data.accountHolderName || data.sourceDisplayName || "Account Holder"})`,
        `Date: ${completedDate}`,
        `Status: ${statusConfig.badgeLabel}`,
      ].join("\n");
    }

    const senderDigits = (data.sourceAccountNumber || "").replace(/\D/g, "");
    const senderMasked =
      senderDigits.length >= 4
        ? `**** ${senderDigits.slice(-4)}`
        : maskAccount(data.sourceAccountNumber);

    const recipientDigits = (data.destinationAccountNumber || "").replace(/\D/g, "");
    const recipientMasked =
      recipientDigits.length >= 4
        ? `**** ${recipientDigits.slice(-4)}`
        : maskAccount(data.destinationAccountNumber);

    return [
      `EKARAJ BANK OFFICIAL RECEIPT`,
      `Ref ID: ${data.transactionRef}`,
      `Amount: ${Number(data.amount).toLocaleString()} ${data.currency || "MMK"}`,
      `Sender: ${data.isOwnAccount ? "My Account" : senderMasked}`,
      `Recipient: ${data.isOwnAccount ? "My Account" : (data.destinationDisplayName || "Recipient")} (${recipientMasked})`,
      `Date: ${completedDate}`,
      `Status: ${statusConfig.badgeLabel}`,
    ].join("\n");
  }, [data, isDeposit, isWithdrawal, completedDate, statusConfig.badgeLabel]);

  // Memo Resolution: Display sender's typed memo, or default to "Internal Transfer" if not provided
  const formattedMemo = useMemo(() => {
    const raw = (data.description || "").trim();

    // Discard legacy system notification messages that were mistakenly stored as description
    const isSystemNotificationSentence =
      raw.toLowerCase().startsWith("you have transferred") ||
      raw.toLowerCase().startsWith("you received") ||
      raw.toLowerCase().startsWith("p2p fund transfer");

    if (!raw || isSystemNotificationSentence) {
      if (statusConfig.theme === "failed") {
        return "Transaction Failed";
      }
      return statusConfig.transferTypeLabel || "Internal Transfer";
    }

    return raw.startsWith('"') && raw.endsWith('"') ? raw : `"${raw}"`;
  }, [data.description, statusConfig.theme, statusConfig.transferTypeLabel]);

  // Direction Resolution: "Incoming" for received receipts, "Outgoing" for sender receipts
  const directionLabel = useMemo(() => {
    if (data.direction === "IN") return "Incoming";
    if (data.direction === "OUT") return "Outgoing";
    const badgeUpper = (data.badgeLabel || "").toUpperCase();
    if (badgeUpper.includes("RECEIVED") || badgeUpper.includes("INCOMING")) {
      return "Incoming";
    }
    return "Outgoing";
  }, [data.direction, data.badgeLabel]);

  return (
    <>
      {/* Transaction QR Modal */}
      {showQr && showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in"
            onClick={() => setShowQrModal(false)}
          />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 text-center animate-in zoom-in-95">
            <button
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="w-12 h-12 rounded-2xl bg-cyan-50 text-[#00A3C4] flex items-center justify-center mx-auto mb-3">
              <QrCode className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-slate-900">
              Encoded Transaction Details
            </h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Scan this QR with any device to view encoded transaction details.
            </p>

            <div className="flex justify-center mb-4">
              <QRCodeView value={qrPayload} size={160} />
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl text-[11px] font-mono text-left text-slate-600 space-y-1 border border-slate-100">
              <p>
                <strong>Bank:</strong> EKARAJ BANK
              </p>
              <p>
                <strong>Ref ID:</strong> {data.transactionRef}
              </p>
              <p>
                <strong>Type:</strong> {statusConfig.transferTypeLabel}
              </p>
              <p>
                <strong>Status:</strong> {data.status || "COMPLETED"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Official Banking E-Receipt Card */}
      <div
        className={`print-receipt-container max-w-xl mx-auto bg-white rounded-3xl print:rounded-2xl shadow-2xl print:shadow-none border border-slate-200 print:border-slate-300 overflow-hidden relative print:break-inside-avoid ${className}`}
      >
        {/* Printable/Shareable Receipt Slip Body */}
        <div id="receipt-capture-area" className="relative bg-white overflow-hidden print:break-inside-avoid">
          {/* Background Security Watermark (Center of Slip, 7% opacity) */}
          <div
            className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden z-0 select-none"
            aria-hidden="true"
          >
            <img
              src="/ekaraj-crown-transparent.png"
              alt=""
              className="w-56 h-56 sm:w-64 sm:h-64 print:w-72 print:h-72 object-contain opacity-[0.07] grayscale contrast-125 select-none"
            />
          </div>

          {/* Official Bank Header: EKARAJ BANK with Official Receipt directly below */}
          <div className="receipt-header-section bg-[#EFF6FF] dark:bg-[#071328] px-5 sm:px-6 py-4 print:py-4.5 print:px-8 text-[#001D77] dark:text-white flex items-center justify-between border-b border-blue-100 dark:border-slate-800 relative z-10">
            <div>
              <h2 className="text-base sm:text-lg print:text-xl font-black tracking-wide uppercase text-[#001D77] dark:text-blue-300 leading-tight">
                EKARAJ BANK
              </h2>
              <p className="text-[10px] print:text-xs text-[#4B5869] dark:text-slate-400 font-semibold tracking-wider uppercase mt-0.5">
                Official Transaction Receipt
              </p>
            </div>

            <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
              <EkarajCrown size={38} className="drop-shadow-md print:w-9 print:h-9" />
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="no-print p-1.5 -mr-1.5 sm:-mr-2 rounded-lg text-slate-400 hover:text-[#001D77] hover:bg-blue-100/60 dark:hover:bg-slate-800 dark:hover:text-blue-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-slate-700 cursor-pointer"
                  aria-label="Close receipt"
                  title="Close"
                >
                  <X className="w-5 h-5 stroke-[2.2]" />
                </button>
              )}
            </div>
          </div>

          {/* Hero Section: Status & Amount */}
          <div className="receipt-hero-section bg-white/95 px-6 pt-5 pb-3 print:pt-6 print:pb-4 text-center relative z-10">
            <div className="inline-flex items-center justify-center gap-2 mb-2 print:mb-1.5">
              {statusConfig.theme === "failed" ? (
                <div className="w-6 h-6 sm:w-6.5 sm:h-6.5 print:w-7 print:h-7 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-xs shadow-rose-500/40 shrink-0">
                  <AlertOctagon className="w-3.5 h-3.5 sm:w-4 sm:h-4 print:w-4.5 print:h-4.5 stroke-[2.5]" />
                </div>
              ) : statusConfig.theme === "pending" ? (
                <div className="w-6 h-6 sm:w-6.5 sm:h-6.5 print:w-7 print:h-7 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-xs shadow-amber-500/40 shrink-0">
                  <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 print:w-4.5 print:h-4.5 stroke-[2.5]" />
                </div>
              ) : (
                <div className="w-6 h-6 sm:w-6.5 sm:h-6.5 print:w-7 print:h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs shadow-emerald-500/40 shrink-0">
                  <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 print:w-4.5 print:h-4.5 stroke-[3]" />
                </div>
              )}
              <span
                className={`font-black text-base sm:text-lg print:text-lg tracking-tight ${
                  statusConfig.theme === "failed"
                    ? "text-rose-600"
                    : statusConfig.theme === "pending"
                    ? "text-amber-600"
                    : "text-emerald-600"
                }`}
              >
                {statusConfig.title}
              </span>
            </div>

            <div>
              <p className="text-3xl sm:text-4xl print:text-[34px] font-black tracking-tight text-slate-900 leading-tight">
                {Number(data.amount).toLocaleString()} {data.currency || "MMK"}
              </p>
            </div>
          </div>

          {/* Account / Pathway Section */}
          {isDeposit ? (
            <div className="receipt-account-section p-4 sm:p-5 print:px-8 print:py-4 bg-slate-50/70 border-b border-slate-100 relative z-10 space-y-3">
              {/* Credited Account Card */}
              <div className="bg-white rounded-2xl print:rounded-xl border border-slate-200/90 p-4 print:p-4 shadow-2xs space-y-3">
                <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-600">
                      <ArrowDownLeft className="w-3 h-3 stroke-[2.5]" />
                    </div>
                    <span className="font-extrabold text-slate-700">Credited Account</span>
                  </div>
                  <span className="text-[10px] text-emerald-700 font-extrabold bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-full">
                    CASH INFLOW
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
                  <div>
                    <p className="text-[10px] print:text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Account Holder
                    </p>
                    <p className="text-xs sm:text-sm font-black text-slate-900 truncate mt-0.5">
                      {data.accountHolderName || data.destinationDisplayName || "Account Holder"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] print:text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Account Number
                    </p>
                    <p className="text-xs sm:text-sm font-bold text-slate-700 font-mono tracking-wider truncate mt-0.5">
                      {bulletMaskAccount(data.destinationAccountNumber || data.sourceAccountNumber)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] print:text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Account Type
                    </p>
                    <p className="text-xs sm:text-sm font-bold text-slate-700 truncate mt-0.5">
                      {data.accountType || "Savings Account"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Balance Summary Card */}
              <div className="bg-white rounded-2xl print:rounded-xl border border-slate-200/90 p-4 print:p-4 shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-1.5">
                    <Landmark className="w-3.5 h-3.5 text-[#00A3C4]" />
                    <span className="font-extrabold text-slate-700">Balance Summary</span>
                  </div>
                </div>

                <div className="divide-y divide-slate-100 text-xs sm:text-[13px]">
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-slate-500 font-medium">Previous Balance</span>
                    <span className="font-mono font-bold text-slate-700">
                      {formatCurrencyAmount(resolvedPrevBalance, data.currency)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-slate-600 font-semibold">Deposit Amount</span>
                    <span className="font-mono font-black text-emerald-600">
                      + {formatCurrencyAmount(data.amount, data.currency)}
                    </span>
                  </div>

                  {Number(data.serviceFee || 0) > 0 && (
                    <div className="flex items-center justify-between py-1.5">
                      <span className="text-slate-500 font-medium">Service Fee</span>
                      <span className="font-mono font-bold text-slate-600">
                        {formatCurrencyAmount(data.serviceFee, data.currency)}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-slate-800 font-black">Available Balance</span>
                    <span className="font-mono font-black text-slate-900 text-sm sm:text-base">
                      {formatCurrencyAmount(resolvedAvailBalance, data.currency)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : isWithdrawal ? (
            <div className="receipt-account-section p-4 sm:p-5 print:px-8 print:py-4 bg-slate-50/70 border-b border-slate-100 relative z-10 space-y-3">
              {/* Debited Account Card */}
              <div className="bg-white rounded-2xl print:rounded-xl border border-slate-200/90 p-4 print:p-4 shadow-2xs space-y-3">
                <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-600">
                      <ArrowUpRight className="w-3 h-3 stroke-[2.5]" />
                    </div>
                    <span className="font-extrabold text-slate-700">Debited Account</span>
                  </div>
                  <span className="text-[10px] text-amber-700 font-extrabold bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-full">
                    CASH OUTFLOW
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
                  <div>
                    <p className="text-[10px] print:text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Account Holder
                    </p>
                    <p className="text-xs sm:text-sm font-black text-slate-900 truncate mt-0.5">
                      {data.accountHolderName || data.sourceDisplayName || "Account Holder"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] print:text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Account Number
                    </p>
                    <p className="text-xs sm:text-sm font-bold text-slate-700 font-mono tracking-wider truncate mt-0.5">
                      {bulletMaskAccount(data.sourceAccountNumber || data.destinationAccountNumber)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] print:text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Account Type
                    </p>
                    <p className="text-xs sm:text-sm font-bold text-slate-700 truncate mt-0.5">
                      {data.accountType || "Savings Account"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Balance Summary Card */}
              <div className="bg-white rounded-2xl print:rounded-xl border border-slate-200/90 p-4 print:p-4 shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-1.5">
                    <Landmark className="w-3.5 h-3.5 text-[#00A3C4]" />
                    <span className="font-extrabold text-slate-700">Balance Summary</span>
                  </div>
                </div>

                <div className="divide-y divide-slate-100 text-xs sm:text-[13px]">
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-slate-500 font-medium">Previous Balance</span>
                    <span className="font-mono font-bold text-slate-700">
                      {formatCurrencyAmount(resolvedPrevBalance, data.currency)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-slate-600 font-semibold">Withdrawal Amount</span>
                    <span className="font-mono font-black text-slate-800">
                      - {formatCurrencyAmount(data.amount, data.currency)}
                    </span>
                  </div>

                  {Number(data.serviceFee || 0) > 0 && (
                    <div className="flex items-center justify-between py-1.5">
                      <span className="text-slate-500 font-medium">Service Fee</span>
                      <span className="font-mono font-bold text-amber-600">
                        - {formatCurrencyAmount(data.serviceFee, data.currency)}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-slate-800 font-black">Available Balance</span>
                    <span className="font-mono font-black text-slate-900 text-sm sm:text-base">
                      {formatCurrencyAmount(resolvedAvailBalance, data.currency)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* FROM ➔ TO Transfer Pathway Card */
            <div className="receipt-pathway-section p-4 sm:p-5 print:px-8 print:py-4 bg-slate-50/70 border-b border-slate-100 relative z-10">
              <div className="bg-white rounded-2xl print:rounded-xl border border-slate-200/90 p-4 print:p-4 shadow-2xs">
                {/* Header: FROM  →  TO */}
                <div className="flex items-center justify-between text-[10px] print:text-xs font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2 print:pb-1.5 mb-3 print:mb-2.5">
                  <span className="text-slate-500 font-extrabold">FROM</span>
                  <div className="w-6 h-6 print:w-5.5 print:h-5.5 rounded-full bg-cyan-50 border border-cyan-200/80 flex items-center justify-center">
                    <ArrowRight className="w-3.5 h-3.5 print:w-3.5 print:h-3.5 text-[#00A3C4]" />
                  </div>
                  <span className="text-slate-500 font-extrabold">TO</span>
                </div>

                {/* Accounts Row */}
                <div className="grid grid-cols-2 gap-4 print:gap-8 text-left items-start">
                  {/* Sender */}
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-xs sm:text-sm print:text-sm font-black text-slate-900 truncate">
                      {data.isOwnAccount
                        ? "My Account"
                        : data.direction === "IN"
                        ? normalizeDisplayName(data.sourceDisplayName, "Sender")
                        : "My Account"}
                    </p>
                    <p className="text-xs print:text-[13px] font-bold text-slate-600 truncate font-mono">
                      {maskAccount(data.sourceAccountNumber)}
                    </p>
                  </div>

                  {/* Recipient */}
                  <div className="text-right space-y-0.5 min-w-0">
                    <p className="text-xs sm:text-sm print:text-sm font-black text-slate-900 truncate">
                      {data.isOwnAccount
                        ? "My Account"
                        : data.direction === "IN"
                        ? "My Account"
                        : normalizeDisplayName(data.destinationDisplayName, "Recipient")}
                    </p>
                    <p className="text-xs print:text-[13px] font-bold text-slate-600 truncate font-mono">
                      {maskAccount(data.destinationAccountNumber)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Transaction Details (Sequential Order 1 to 8) */}
          <div className="receipt-details-wrapper px-6 pt-3.5 pb-2.5 print:px-8 print:pt-3.5 print:pb-2.5 bg-white/95 border-b border-slate-100 relative z-10">
            <div className="border-b border-slate-200/80 pb-2 mb-2 print:pb-2 print:mb-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 print:text-[11px]">
                Transaction Details
              </h4>
            </div>

            <div className="receipt-details-list divide-y divide-slate-100 text-xs sm:text-[13px] print:text-sm">
              {/* 1. Transaction ID */}
              <div className="flex items-center justify-between py-2 sm:py-2.5 print:py-2 gap-3">
                <span className="text-slate-600 font-semibold shrink-0 print:text-[13px]">Transaction ID</span>
                <div className="flex items-center justify-end gap-1.5 min-w-0 max-w-[65%]">
                  <span className="font-mono font-bold text-slate-900 bg-slate-100 print:bg-transparent border border-slate-200/80 print:border-0 px-2 print:px-0 py-0.5 rounded-md truncate print:text-[13px]">
                    {data.transactionRef}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="no-print text-slate-400 hover:text-cyan-600 transition p-1 shrink-0 cursor-pointer"
                    title="Copy Transaction ID"
                    aria-label="Copy Transaction ID"
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </button>
                </div>
              </div>

              {/* 2. Date & Time */}
              <div className="flex items-center justify-between py-2 sm:py-2.5 print:py-2 gap-3">
                <span className="text-slate-600 font-semibold shrink-0 print:text-[13px]">Date &amp; Time</span>
                <span className="font-bold text-slate-900 text-right truncate print:text-[13px]">
                  {completedDate}
                </span>
              </div>

              {/* 3. Transfer Type / Transaction Type */}
              <div className="flex items-center justify-between py-2 sm:py-2.5 print:py-2 gap-3">
                <span className="text-slate-600 font-semibold shrink-0 print:text-[13px]">
                  {isDeposit || isWithdrawal ? "Transaction Type" : "Transfer Type"}
                </span>
                <span className="font-bold text-slate-900 text-right truncate print:text-[13px]">
                  {statusConfig.transferTypeLabel}
                </span>
              </div>

              {/* 4. Direction (Transfers only) */}
              {!isDeposit && !isWithdrawal && (
                <div className="flex items-center justify-between py-2 sm:py-2.5 print:py-2 gap-3">
                  <span className="text-slate-600 font-semibold shrink-0 print:text-[13px]">Direction</span>
                  <span className="font-bold text-slate-900 text-right truncate print:text-[13px]">
                    {directionLabel}
                  </span>
                </div>
              )}

              {/* 5. Transfer Amount / Deposit Amount / Withdrawal Amount */}
              <div className="flex items-center justify-between py-2 sm:py-2.5 print:py-2 gap-3">
                <span className="text-slate-600 font-semibold shrink-0 print:text-[13px]">
                  {isDeposit ? "Deposit Amount" : isWithdrawal ? "Withdrawal Amount" : "Transfer Amount"}
                </span>
                <span className="font-bold text-slate-900 text-right truncate print:text-[13px]">
                  {Number(data.amount).toLocaleString()} {data.currency || "MMK"}
                </span>
              </div>

              {/* 6. Service Fee: Only shown for sender, completely hidden for recipient */}
              {data.direction !== "IN" && !data.badgeLabel?.toUpperCase().includes("RECEIVED") && (
                <div className="flex items-center justify-between py-2 sm:py-2.5 print:py-2 gap-3">
                  <span className="text-slate-600 font-semibold shrink-0 print:text-[13px]">Service Fee</span>
                  <span className="font-bold text-emerald-600 text-right truncate print:text-[13px]">
                    {Number(data.serviceFee || 0) === 0
                      ? "0.00 MMK"
                      : `${Number(data.serviceFee).toLocaleString()} ${data.currency || "MMK"}`}
                  </span>
                </div>
              )}

              {/* 7. Total Debited / Credited */}
              <div className="flex items-center justify-between py-2 sm:py-2.5 print:py-2 gap-3">
                <span className="text-slate-800 font-bold shrink-0 print:text-[13.5px]">
                  {isDeposit || data.direction === "IN" ? "Total Credited" : "Total Debited"}
                </span>
                <span className="font-black text-slate-900 text-sm sm:text-base print:text-[15px] text-right truncate">
                  {Number(
                    data.totalDebitedAmount != null ? data.totalDebitedAmount : data.amount
                  ).toLocaleString()}{" "}
                  {data.currency || "MMK"}
                </span>
              </div>

              {/* 8. Status */}
              <div className="flex items-center justify-between py-2 sm:py-2.5 print:py-2 gap-3">
                <span className="text-slate-600 font-semibold shrink-0 print:text-[13px]">Status</span>
                <span
                  className={`inline-flex items-center gap-1.5 font-black text-white px-3 py-0.5 rounded-full shadow-xs text-xs print:text-[11px] print:px-3 print:py-0.5 shrink-0 tracking-wide ${
                    statusConfig.theme === "failed"
                      ? "bg-rose-500 shadow-rose-500/30"
                      : statusConfig.theme === "pending"
                      ? "bg-amber-500 shadow-amber-500/30"
                      : "bg-emerald-500 shadow-emerald-500/30"
                  }`}
                >
                  {statusConfig.theme === "failed" ? (
                    <AlertOctagon className="w-3 h-3 stroke-[2.5]" />
                  ) : statusConfig.theme === "pending" ? (
                    <Clock className="w-3 h-3 stroke-[2.5]" />
                  ) : (
                    <Check className="w-3 h-3 stroke-[3]" />
                  )}
                  {statusConfig.badgeLabel}
                </span>
              </div>

              {/* 9. Memo */}
              <div className="flex items-center justify-between py-2 sm:py-2.5 print:py-2 gap-3">
                <span className="text-slate-600 font-semibold shrink-0 print:text-[13px]">Memo</span>
                <span className="font-semibold text-slate-900 italic text-right truncate max-w-[65%] print:text-[13px]">
                  {formattedMemo}
                </span>
              </div>
            </div>
          </div>

          {/* Compact Integrated Transaction QR Section */}
          {showQr && (
            <div className="receipt-qr-section py-2.5 px-6 border-b border-slate-100 print:border-b-0 flex flex-col print:flex-row print:items-center print:justify-between items-center justify-center text-center print:text-left relative z-10 bg-slate-50/50 print:bg-slate-50/30 print:px-8 print:py-3.5 print:break-inside-avoid">
              {/* Left side in print: Official bank footer notes */}
              <div className="hidden print:block space-y-1 text-slate-500 max-w-sm">
                <p className="text-[10px] print:text-[11px] font-bold text-slate-800 tracking-wider uppercase">
                  Official Electronic Advice • EKARAJ BANK
                </p>
                <p className="text-[9px] print:text-[10px] leading-relaxed text-slate-500">
                  This transaction receipt is electronically generated and authenticated by the EKARAJ Core Banking System. No physical signature is required.
                </p>
                <p className="text-[9px] print:text-[10px] font-mono text-slate-400">
                  Ref: {data.transactionRef}
                </p>
              </div>

              {/* QR block */}
              <div className="flex flex-col items-center justify-center gap-1 shrink-0">
                <div className="flex items-center justify-center gap-1 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                  <QrCode className="w-3 h-3 text-[#00A3C4]" />
                  <span>Transaction QR</span>
                </div>

                <div
                  onClick={() => setShowQrModal(true)}
                  className="cursor-pointer transition transform hover:scale-105 p-1 bg-white rounded-lg border border-slate-200/90 shadow-2xs my-0.5 print:p-0.5"
                  title="Click to enlarge QR"
                >
                  <div className="hidden print:block">
                    <QRCodeView value={qrPayload} size={82} />
                  </div>
                  <div className="print:hidden">
                    <QRCodeView value={qrPayload} size={76} />
                  </div>
                </div>

                <p className="text-[9px] font-medium text-slate-400 leading-none">
                  Scan to view encoded transaction details.
                </p>
              </div>
            </div>
          )}

          {/* Official Bank Sign-off Footer */}
          <div className="receipt-signoff-section px-6 py-3 bg-slate-50/70 text-center border-t border-slate-100 relative z-10">
            <p className="font-black text-slate-800 text-xs tracking-wider uppercase">
              EKARAJ BANK
            </p>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
              Thank you for banking with us.
            </p>
          </div>
        </div>

        {/* Action Toolbar */}
        {actions && (
          <div className="no-print px-6 pt-3 pb-5 bg-white space-y-2 relative z-10">
            {actions}
          </div>
        )}
      </div>
    </>
  );
}
