/**
 * Utility functions for notification presentation:
 * - Masking account numbers for privacy (e.g. 2006382479 -> **** 2479)
 * - Formatting amounts with thousands separator (e.g. 10000.0000 MMK -> 10,000 MMK)
 * - Removing redundancy from message body for clean readability
 */

export const maskAccountNumber = (acc?: string | null): string => {
  if (!acc) return "";
  const cleaned = acc.trim();
  if (cleaned.startsWith("****")) {
    return cleaned.replace(/^\*{4}\s*/, "**** ");
  }
  const digits = cleaned.replace(/\D/g, "");
  if (digits.length >= 4) {
    return `**** ${digits.slice(-4)}`;
  }
  if (digits.length > 0) {
    return `**** ${digits}`;
  }
  return cleaned;
};

export const formatAmountValue = (num: number | string | null | undefined): string => {
  if (num === null || num === undefined || num === "") return "0";
  const val = typeof num === "number" ? num : parseFloat(String(num).replace(/,/g, ""));
  if (isNaN(val)) return String(num);
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(val);
};

export interface NotificationMessageTarget {
  message?: string | null;
  amount?: number | string | null;
  currency?: string | null;
  transferDirection?: "SENT" | "RECEIVED" | string | null;
  title?: string | null;
}

export const formatNotificationMessage = (item: NotificationMessageTarget): string => {
  const original = (item.message || "").trim();
  const titleLower = (item.title || "").toLowerCase();
  const originalLower = original.toLowerCase();

  const isSent =
    item.transferDirection === "SENT" ||
    titleLower.includes("transfer sent") ||
    titleLower.includes("sent") ||
    originalLower.startsWith("you have transferred") ||
    originalLower.startsWith("you have successfully transferred");

  const isReceived =
    item.transferDirection === "RECEIVED" ||
    titleLower.includes("received") ||
    titleLower.includes("funds received") ||
    originalLower.startsWith("you received") ||
    originalLower.startsWith("you have successfully received");

  const currency = item.currency || "MMK";

  // Case 1: Transfer Sent - eliminate redundancy and format amount cleanly
  if (isSent) {
    let amtStr = "";
    if (item.amount !== null && item.amount !== undefined && item.amount !== "") {
      amtStr = formatAmountValue(item.amount);
    } else {
      const match = original.match(/(?:transferred|paid)\s+([\d,.]+)/i);
      if (match) {
        amtStr = formatAmountValue(match[1]);
      }
    }
    if (amtStr) {
      return `You have successfully transferred ${amtStr} ${currency}.`;
    }
    return "You have successfully transferred funds.";
  }

  // Case 2: Funds Received - eliminate redundancy and format amount cleanly
  if (isReceived) {
    let amtStr = "";
    if (item.amount !== null && item.amount !== undefined && item.amount !== "") {
      amtStr = formatAmountValue(item.amount);
    } else {
      const match = original.match(/received\s+([\d,.]+)/i);
      if (match) {
        amtStr = formatAmountValue(match[1]);
      }
    }
    if (amtStr) {
      return `You have successfully received ${amtStr} ${currency}.`;
    }
    return "You have successfully received funds.";
  }

  // Case 3: Other notifications (e.g. Failed, Payment, System)
  let formatted = original;
  // Remove reference numbers from notification text
  formatted = formatted.replace(/\s*\.?\s*Ref:\s*[^\s,;.]+/gi, "").trim();
  // Format unformatted amounts with 1 to 4 decimals: e.g. 10000.0000 MMK -> 10,000 MMK
  formatted = formatted.replace(/\b(\d+(?:\.\d{1,4})?)\s*(MMK|USD|EUR)\b/g, (_match, num, curr) => {
    return `${formatAmountValue(num)} ${curr}`;
  });
  // Mask 10-digit account numbers: e.g. 2006382479 -> **** 2479
  formatted = formatted.replace(/\b\d{6}(\d{4})\b/g, "**** $1");

  return formatted;
};
