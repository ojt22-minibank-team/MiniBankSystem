import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { toBlob } from "html-to-image";
import {
  X,
  Share2,
  Download,
  Copy,
  Check,
  Home,
  History,
  Loader2,
  AlertCircle,
} from "lucide-react";
import TransferReceiptView from "../components/TransferReceiptView";
import type { TransferReceiptData } from "../types/transferReceiptTypes";
import type { NotificationItem } from "../../notifications/types/notificationTypes";
import { getMyNotifications } from "../../notifications/services/notificationService";
import { useAppSelector, useAppDispatch } from "../../../lib/redux";
import { fetchMyAccounts } from "../../customer-account/accounts/stores/accountsSlice";

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

function mapNotificationItemToReceipt(
  noti: NotificationItem | { [key: string]: unknown },
  fallbackAccountNumber?: string,
  fallbackDisplayName?: string
): TransferReceiptData {
  const isSent =
    noti.transferDirection === "SENT" ||
    (typeof noti.title === "string" && noti.title.toLowerCase().includes("sent"));
  const amount = Number(noti.amount || 0);
  const currency = (typeof noti.currency === "string" && noti.currency) || "MMK";
  const ref =
    (typeof noti.transactionRef === "string" && noti.transactionRef) ||
    `TXN-NOTI-${noti.notificationId || Date.now()}`;
  const counterpartyName = (typeof noti.counterpartyName === "string" && noti.counterpartyName) || "";
  const counterpartyAccount =
    (typeof noti.counterpartyAccountNumber === "string" && noti.counterpartyAccountNumber) || "";
  const notiSourceAcc =
    (typeof (noti as any).sourceAccountNumber === "string" && (noti as any).sourceAccountNumber) || "";
  const notiDestAcc =
    (typeof (noti as any).destinationAccountNumber === "string" && (noti as any).destinationAccountNumber) || "";
  const createdAt = (typeof noti.createdAt === "string" && noti.createdAt) || new Date().toISOString();
  const defaultMemo = isSent ? "Internal Transfer" : "Funds Received";

  const myAccount = fallbackAccountNumber || "";
  const myName = fallbackDisplayName || "My Account";

  const resolvedSourceAcc = isSent
    ? (notiSourceAcc || myAccount || "")
    : (notiSourceAcc || counterpartyAccount || "-");

  const resolvedSourceDisplay = isSent
    ? myName
    : (counterpartyName || "Sender");

  const resolvedDestAcc = isSent
    ? (notiDestAcc || counterpartyAccount || "-")
    : (notiDestAcc || myAccount || "");

  const resolvedDestDisplay = isSent
    ? (counterpartyName || "Recipient")
    : myName;

  return {
    transactionRef: ref,
    amount,
    currency,
    serviceFee: 0,
    totalDebitedAmount: isSent ? amount : null,
    completedAt: createdAt,
    sourceAccountNumber: resolvedSourceAcc,
    sourceDisplayName: resolvedSourceDisplay,
    destinationAccountNumber: resolvedDestAcc,
    destinationDisplayName: resolvedDestDisplay,
    direction: isSent ? "OUT" : "IN",
    isOwnAccount: false,
    description: defaultMemo,
    status: "COMPLETED",
    badgeLabel: isSent ? "TRANSFER SENT" : "FUNDS RECEIVED",
    transactionType: "TRANSFER",
  };
}

export default function TransactionReceiptPage() {
  const { transactionRef } = useParams<{ transactionRef: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const dispatch = useAppDispatch();
  const userAccounts = useAppSelector((state) => state.accounts.accounts);
  const profile = useAppSelector((state) => state.profile.profile);

  const myAccountNumber = userAccounts?.[0]?.accountNumber || "";
  const myDisplayName =
    (profile?.companyName ||
      `${profile?.firstName || ""} ${profile?.lastName || ""}`.trim()) ||
    "My Account";

  useEffect(() => {
    if (!userAccounts || userAccounts.length === 0) {
      dispatch(fetchMyAccounts());
    }
  }, [dispatch, userAccounts]);

  const [receiptData, setReceiptData] = useState<TransferReceiptData | null>(() => {
    if (location.state?.receiptData) {
      return location.state.receiptData as TransferReceiptData;
    }
    if (location.state?.notification) {
      return mapNotificationItemToReceipt(
        location.state.notification,
        myAccountNumber,
        myDisplayName
      );
    }
    return null;
  });

  // Synchronize receiptData with actual user account number once loaded
  useEffect(() => {
    if (!myAccountNumber) return;
    setReceiptData((prev) => {
      if (!prev) return null;
      let changed = false;
      let newSource = prev.sourceAccountNumber;
      let newDest = prev.destinationAccountNumber;

      if (prev.direction === "OUT") {
        if (!/\d/.test(newSource || "")) {
          newSource = myAccountNumber;
          changed = true;
        }
      } else if (prev.direction === "IN") {
        if (!/\d/.test(newDest || "")) {
          newDest = myAccountNumber;
          changed = true;
        }
      }

      if (!changed) return prev;
      return {
        ...prev,
        sourceAccountNumber: newSource,
        destinationAccountNumber: newDest,
      };
    });
  }, [myAccountNumber]);

  const [loading, setLoading] = useState<boolean>(!receiptData);
  const [error, setError] = useState<string | null>(null);

  // Action states
  const [copied, setCopied] = useState<boolean>(false);
  const [isSharing, setIsSharing] = useState<boolean>(false);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [shareImageBlob, setShareImageBlob] = useState<Blob | null>(null);
  const [shareImageUrl, setShareImageUrl] = useState<string | null>(null);
  const [imageCopied, setImageCopied] = useState<boolean>(false);

  // If receiptData wasn't passed in route state (e.g. direct URL / refresh), look up by transactionRef
  useEffect(() => {
    if (receiptData) return;
    let isCancelled = false;

    async function loadFallback() {
      try {
        setLoading(true);
        setError(null);

        // 1. Check existing notifications
        const notis = await getMyNotifications();
        if (isCancelled) return;

        const targetRef = transactionRef ? decodeURIComponent(transactionRef).trim() : "";
        const match = notis.find(
          (n) =>
            (n.transactionRef && n.transactionRef.trim() === targetRef) ||
            String(n.notificationId) === targetRef ||
            `NOTI-${n.notificationId}` === targetRef
        );

        if (match) {
          setReceiptData(mapNotificationItemToReceipt(match, myAccountNumber, myDisplayName));
          return;
        }

        // If not found in latest notifications, construct generic receipt if ref looks valid
        if (targetRef && targetRef.startsWith("TXN-")) {
          setReceiptData({
            transactionRef: targetRef,
            amount: 0,
            currency: "MMK",
            serviceFee: 0,
            completedAt: new Date().toISOString(),
            sourceAccountNumber: myAccountNumber,
            sourceDisplayName: myDisplayName || "My Account",
            destinationAccountNumber: "-",
            destinationDisplayName: "Recipient",
            direction: "OUT",
            status: "COMPLETED",
            description: "Internal Transfer",
            badgeLabel: "TRANSACTION SLIP",
          });
          return;
        }

        setError("Transaction receipt could not be found or has expired.");
      } catch {
        if (!isCancelled) {
          setError("Failed to load transaction receipt. Please check your network and try again.");
        }
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    void loadFallback();

    return () => {
      isCancelled = true;
    };
  }, [transactionRef, receiptData]);

  // Clean up object URL when component unmounts
  useEffect(() => {
    return () => {
      if (shareImageUrl) {
        URL.revokeObjectURL(shareImageUrl);
      }
    };
  }, [shareImageUrl]);

  // Back Navigation: return to previous page or /transaction or /dashboard
  const handleBack = useCallback(() => {
    const fromPath = (location.state as { from?: string } | null)?.from;
    if (fromPath && fromPath !== location.pathname && !fromPath.startsWith("/receipt")) {
      navigate(fromPath);
    } else if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/transaction");
    }
  }, [location, navigate]);

  // Keyboard dismiss (Escape key)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleBack();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleBack]);

  // Helper to capture receipt element as image Blob
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

  // 1. Share Receipt Action
  const handleShare = async () => {
    if (isSharing || !receiptData) return;
    setIsSharing(true);

    try {
      const receiptElement =
        (document.getElementById("receipt-capture-area") as HTMLElement) ||
        (document.querySelector(".print-receipt-container") as HTMLElement);

      if (!receiptElement) {
        throw new Error("Receipt element not found");
      }

      const blob = await getReceiptBlob(receiptElement);
      const filename = `ekaraj-receipt-${receiptData.transactionRef || Date.now()}.png`;
      const file = new File([blob], filename, { type: "image/png" });

      // Mobile Flow: If on mobile, invoke native OS Share sheet
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
            text: `Official EKARAJ BANK Transfer Receipt\nRef: ${receiptData.transactionRef}\nAmount: ${Number(receiptData.amount).toLocaleString()} ${receiptData.currency || "MMK"}`,
          });
          return;
        } catch (shareErr: unknown) {
          if ((shareErr as Error)?.name === "AbortError") {
            return;
          }
        }
      }

      // Desktop Flow: Copy image to system clipboard & open desktop share modal
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
      // Fallback text share
      if (typeof navigator !== "undefined" && navigator.share) {
        try {
          await navigator.share({
            title: "EKARAJ BANK Transfer Receipt",
            text: `EKARAJ BANK Transfer Receipt\nRef: ${receiptData.transactionRef}\nAmount: ${Number(receiptData.amount).toLocaleString()} ${receiptData.currency || "MMK"}`,
          });
        } catch {
          // User cancelled
        }
      }
    } finally {
      setIsSharing(false);
    }
  };

  // 2. Download PDF Action (Print / Save as PDF)
  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = "";
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  };

  // 3. Copy Ref Action
  const handleCopyRef = async () => {
    if (!receiptData) return;
    try {
      await navigator.clipboard.writeText(receiptData.transactionRef);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Ignore clipboard write failures gracefully
    }
  };

  // Chat app launchers
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

  return (
    <div className="min-h-screen bg-slate-50/70 py-8 sm:py-12 px-4 flex flex-col justify-center items-center print:p-0 print:m-0 print:min-h-0 print:h-full print:w-full print:bg-white print:overflow-hidden print:flex print:flex-col print:justify-center print:items-center">
      <div className="w-full max-w-xl print:max-w-[700px] print:w-[700px] mx-auto relative space-y-4 print:space-y-0 print:m-auto print:p-0">
        {/* Loading State */}
        {loading && (
          <div className="py-24 bg-white rounded-3xl border border-slate-200 text-center flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#00A3C4]" />
            <p className="text-sm font-bold text-slate-700">Loading transaction receipt...</p>
            <p className="text-xs text-slate-400">Verifying official banking record</p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="py-16 px-6 bg-white rounded-3xl border border-red-200 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Receipt Not Available</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">{error}</p>
            </div>
            <div className="flex items-center gap-3 mt-3">
              <button
                type="button"
                onClick={() => navigate("/transaction")}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition"
              >
                Go to Transactions
              </button>
              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                className="px-4 py-2 rounded-xl bg-[#00A3C4] hover:bg-[#0891B2] text-xs font-bold text-white transition"
              >
                Dashboard
              </button>
            </div>
          </div>
        )}

        {/* Main Official Receipt View */}
        {!loading && receiptData && (
          <>
            <TransferReceiptView
              data={receiptData}
              showQr={true}
              onClose={handleBack}
              actions={
                <div className="space-y-3 pt-1">
                  {/* Row of 3 Primary Action Buttons: [ Share Receipt ] [ Save Slip ] [ Copy Ref ] */}
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
                      className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-slate-200 bg-white font-bold text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition"
                    >
                      <Home className="w-3.5 h-3.5 text-slate-400" />
                      <span>Dashboard</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate("/transaction")}
                      className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-slate-200 bg-white font-bold text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition"
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
                      className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
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
          </>
        )}
      </div>
    </div>
  );
}
