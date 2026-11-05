import { useState, useMemo } from "react";
import {
  AlertOctagon,
  AlertCircle,
  ArrowRight,
  Copy,
  Check,
  RotateCcw,
  Home,
  X,
  ShieldAlert,
} from "lucide-react";
import { EkarajCrown } from "../../../components/common/EkarajLogo";

export interface TransferFailedSlipProps {
  amount: number;
  currency?: string;
  sourceAccountNumber?: string;
  sourceDisplayName?: string;
  destinationAccountNumber?: string;
  destinationDisplayName?: string;
  errorReason: string;
  errorCode?: string;
  referenceId?: string;
  timestamp?: string;
  description?: string;
  onTryAgain: () => void;
  onGoDashboard: () => void;
  onClose?: () => void;
  className?: string;
}

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

/**
 * Categorize error messages into user-friendly banking failure titles & explanations
 */
function resolveFailureDetails(reason: string, code?: string): { title: string; explanation: string } {
  const lower = (reason || "").toLowerCase();
  const codeLower = (code || "").toLowerCase();

  if (lower.includes("timeout") || lower.includes("timed out") || codeLower.includes("timeout")) {
    return {
      title: "Network Timeout",
      explanation: "The connection to the payment processing network timed out. No funds were debited from your account.",
    };
  }

  if (lower.includes("insufficient") || lower.includes("balance") || codeLower.includes("insufficient")) {
    return {
      title: "Insufficient Available Funds",
      explanation: "Your account does not have enough available balance to cover this transfer and required reserve.",
    };
  }

  if (lower.includes("offline") || lower.includes("down") || lower.includes("unavailable") || lower.includes("503")) {
    return {
      title: "System Temporarily Offline",
      explanation: "Banking core services are currently undergoing maintenance. Please retry in a few moments.",
    };
  }

  if (lower.includes("limit") || codeLower.includes("limit")) {
    return {
      title: "Transfer Limit Exceeded",
      explanation: reason || "The requested amount exceeds your one-time or remaining daily transaction limit.",
    };
  }

  if (lower.includes("pin") || codeLower.includes("pin") || lower.includes("credentials")) {
    return {
      title: "Invalid Transaction PIN",
      explanation: "The security PIN entered did not match. Please verify your PIN and try again.",
    };
  }

  return {
    title: code ? `Transaction Unsuccessful (${code})` : "Transfer Failed",
    explanation: reason || "The transaction could not be completed by the banking network. No funds were deducted.",
  };
}

export default function TransferFailedSlip({
  amount,
  currency = "MMK",
  sourceAccountNumber,
  sourceDisplayName,
  destinationAccountNumber,
  destinationDisplayName,
  errorReason,
  errorCode,
  referenceId,
  timestamp,
  description,
  onTryAgain,
  onGoDashboard,
  onClose,
  className = "",
}: TransferFailedSlipProps) {
  const [copied, setCopied] = useState(false);

  const failureDetails = useMemo(() => {
    return resolveFailureDetails(errorReason, errorCode);
  }, [errorReason, errorCode]);

  const displayTime = useMemo(() => {
    const d = timestamp ? new Date(timestamp) : new Date();
    return isNaN(d.getTime()) ? new Date().toLocaleString() : d.toLocaleString();
  }, [timestamp]);

  const fallbackRef = useMemo(() => {
    if (referenceId) return referenceId;
    return `FAIL-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
  }, [referenceId]);

  const handleCopyRef = async () => {
    try {
      await navigator.clipboard.writeText(fallbackRef);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div
      className={`max-w-xl mx-auto bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden relative ${className}`}
    >
      {/* Background Watermark */}
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden z-0 select-none"
        aria-hidden="true"
      >
        <img
          src="/ekaraj-crown-transparent.png"
          alt=""
          className="w-56 h-56 sm:w-64 sm:h-64 object-contain opacity-[0.05] grayscale contrast-125 select-none"
        />
      </div>

      {/* Official Bank Header: EKARAJ BANK with Failure Notice */}
      <div className="bg-[#08295C] px-5 sm:px-6 py-4 text-white flex items-center justify-between border-b border-blue-900/50 relative z-10">
        <div>
          <h2 className="text-base sm:text-lg font-black tracking-wide uppercase text-white leading-tight">
            EKARAJ BANK
          </h2>
          <p className="text-[10px] text-rose-300 font-semibold tracking-wider uppercase mt-0.5">
            Transaction Failure Advisory
          </p>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          <EkarajCrown size={34} className="drop-shadow-md" />
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="no-print p-1.5 -mr-1.5 sm:-mr-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 active:bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-white/40 cursor-pointer"
              aria-label="Close"
              title="Close"
            >
              <X className="w-5 h-5 stroke-[2.2]" />
            </button>
          )}
        </div>
      </div>

      {/* Hero Section: Red Failure Status & Amount */}
      <div className="bg-white/95 px-6 pt-6 pb-4 text-center relative z-10">
        <div className="inline-flex items-center justify-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 border border-rose-200/80 flex items-center justify-center shadow-xs shadow-rose-500/20 shrink-0">
            <AlertOctagon className="w-4 h-4 stroke-[2.5]" />
          </div>
          <span className="text-rose-600 font-black text-base sm:text-lg tracking-tight">
            {failureDetails.title}
          </span>
        </div>

        <div>
          <p className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
            {Number(amount || 0).toLocaleString()} {currency}
          </p>
          <span className="inline-block mt-1 text-[11px] font-bold text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-100">
            Status: FAILED
          </span>
        </div>
      </div>

      {/* Error Reason Dynamic Callout Card */}
      <div className="px-6 py-2 relative z-10">
        <div className="bg-rose-50/70 border border-rose-200/90 rounded-2xl p-4 text-left">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-rose-800 mb-1">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Reason for Failure</span>
          </div>
          <p className="text-xs text-rose-950 font-semibold leading-relaxed pl-6">
            {failureDetails.explanation}
          </p>
          <div className="mt-2.5 pt-2 border-t border-rose-200/60 flex items-center justify-between text-[11px] text-rose-800 font-medium pl-6">
            <span className="flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
              <strong>Account Protection:</strong> No funds debited.
            </span>
          </div>
        </div>
      </div>

      {/* FROM ➔ TO Transfer Pathway Card */}
      <div className="p-4 sm:p-5 bg-slate-50/70 border-b border-slate-100 relative z-10 mt-2">
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs">
          {/* Header: FROM → TO */}
          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2 mb-3">
            <span className="text-slate-500 font-extrabold">FROM</span>
            <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <span className="text-slate-500 font-extrabold">TO</span>
          </div>

          {/* Accounts Row */}
          <div className="grid grid-cols-2 gap-4 text-left items-start">
            {/* Sender */}
            <div className="space-y-0.5 min-w-0">
              <p className="text-xs sm:text-sm font-black text-slate-900 truncate">
                {sourceDisplayName || "My Account"}
              </p>
              <p className="text-xs font-bold text-slate-600 truncate">
                {maskAccount(sourceAccountNumber)}
              </p>
            </div>

            {/* Recipient */}
            <div className="text-right space-y-0.5 min-w-0">
              <p className="text-xs sm:text-sm font-black text-slate-900 truncate">
                {destinationDisplayName || "Recipient"}
              </p>
              <p className="text-xs font-bold text-slate-600 truncate">
                {maskAccount(destinationAccountNumber)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Structured Banking Metadata Details */}
      <div className="px-6 py-4 space-y-2 text-xs relative z-10 bg-white">
        {/* Reference Number */}
        <div className="flex items-center justify-between py-2 border-b border-slate-100 gap-3">
          <span className="text-slate-600 font-semibold shrink-0">Failure Reference</span>
          <div className="flex items-center gap-1.5 font-mono font-bold text-slate-900 shrink-0">
            <span className="text-[11px] sm:text-xs select-all text-rose-700">{fallbackRef}</span>
            <button
              type="button"
              onClick={handleCopyRef}
              className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition"
              title="Copy Reference"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Date & Time */}
        <div className="flex items-center justify-between py-2 border-b border-slate-100 gap-3">
          <span className="text-slate-600 font-semibold shrink-0">Attempted At</span>
          <span className="font-semibold text-slate-900 text-right">{displayTime}</span>
        </div>

        {/* Failure Code */}
        {errorCode && (
          <div className="flex items-center justify-between py-2 border-b border-slate-100 gap-3">
            <span className="text-slate-600 font-semibold shrink-0">Error Code</span>
            <span className="font-mono font-bold text-rose-700 text-right">{errorCode}</span>
          </div>
        )}

        {/* Memo */}
        {description && (
          <div className="flex items-center justify-between py-2 border-b border-slate-100 gap-3">
            <span className="text-slate-600 font-semibold shrink-0">Memo</span>
            <span className="font-semibold text-slate-900 italic text-right truncate max-w-[65%]">
              "{description}"
            </span>
          </div>
        )}
      </div>

      {/* Bottom Action Buttons: [ Try Again (Outline) ] [ Return to Dashboard (Solid) ] */}
      <div className="p-6 bg-slate-50/90 border-t border-slate-100 relative z-10">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Outline Button: Try Again */}
          <button
            type="button"
            onClick={onTryAgain}
            className="w-full sm:flex-1 py-3.5 px-4 rounded-2xl border-2 border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 text-slate-700 font-black text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
          >
            <RotateCcw className="w-4 h-4 text-slate-500" />
            <span>Try Again</span>
          </button>

          {/* Solid Button: Return to Dashboard */}
          <button
            type="button"
            onClick={onGoDashboard}
            className="w-full sm:flex-1 py-3.5 px-4 rounded-2xl text-white font-black text-xs sm:text-sm bg-gradient-to-r from-[#00A3C4] to-[#0284C7] hover:from-[#0891B2] hover:to-[#0369A1] transition flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-cyan-500/25"
          >
            <Home className="w-4 h-4 text-white" />
            <span>Return to Dashboard</span>
          </button>
        </div>
      </div>
    </div>
  );
}
