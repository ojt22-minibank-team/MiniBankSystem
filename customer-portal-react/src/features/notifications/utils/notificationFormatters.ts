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

export interface NotificationMetaInput {
  title?: string | null;
  message?: string | null;
  transactionRef?: string | null;
  counterpartyName?: string | null;
  counterpartyAccountNumber?: string | null;
  transferDirection?: "SENT" | "RECEIVED" | string | null;
  destinationAccountNumber?: string | null;
  sourceAccountNumber?: string | null;
  notificationType?: string | null;
}

export interface NotificationMetaOutput {
  isDeposit: boolean;
  isWithdrawal: boolean;
  isPayment: boolean;
  isFailed: boolean;
  isItemReceived: boolean;
  displayTitle: string;
  targetAccount: string;
}

export const resolveNotificationMeta = (item: NotificationMetaInput): NotificationMetaOutput => {
  const itemTitle = item.title || "";
  const itemTitleLower = itemTitle.toLowerCase();
  const msgLower = (item.message || "").toLowerCase();
  const refLower = (item.transactionRef || "").toLowerCase();
  const counterpartyAcc = item.counterpartyAccountNumber || "";
  const counterpartyNameLower = (item.counterpartyName || "").toLowerCase();

  const isDeposit =
    itemTitleLower.includes("deposit") ||
    msgLower.includes("bank counter deposit") ||
    msgLower.includes("cash deposit") ||
    refLower.includes("otc-dep") ||
    (counterpartyAcc === "BANK-OTC" && item.transferDirection === "RECEIVED") ||
    (counterpartyNameLower.includes("bank counter") && item.transferDirection === "RECEIVED");

  const isWithdrawal =
    itemTitleLower.includes("withdraw") ||
    (msgLower.includes("bank counter") && msgLower.includes("withdrawn")) ||
    refLower.includes("otc-wdl") ||
    (counterpartyAcc === "BANK-OTC" && item.transferDirection === "SENT") ||
    (counterpartyNameLower.includes("bank counter") && item.transferDirection === "SENT");

  const isPayment =
    item.notificationType === "PAYMENT" ||
    itemTitleLower.includes("payment");

  const isFailed =
    itemTitleLower.includes("fail") ||
    itemTitleLower.includes("reject") ||
    itemTitleLower.includes("decline");

  const isItemReceived =
    item.transferDirection === "RECEIVED" ||
    itemTitleLower.includes("received") ||
    itemTitleLower.includes("funds received") ||
    isDeposit;

  // Real-world Customer-facing Display Title
  let displayTitle = itemTitle;
  if (isDeposit) {
    displayTitle = "Deposit Successful";
  } else if (isWithdrawal) {
    displayTitle = "Withdrawal Successful";
  } else if (isItemReceived) {
    displayTitle = "Money Received";
  } else if (item.transferDirection === "SENT" || itemTitleLower.includes("sent")) {
    displayTitle = "Transfer Successful";
  }

  // Account resolution for deposit/withdrawal
  let targetAccount = "";
  if (isDeposit) {
    targetAccount = item.destinationAccountNumber || "";
    if (!targetAccount || targetAccount === "BANK-OTC") {
      const match = item.message?.match(/(?:to\s+account\s+|account\s+)(\d+)/i);
      if (match) targetAccount = match[1];
    }
    if (!targetAccount && item.counterpartyName?.toLowerCase().startsWith("account ")) {
      targetAccount = item.counterpartyName.replace(/\D/g, "");
    }
  } else if (isWithdrawal) {
    targetAccount = item.sourceAccountNumber || "";
    if (!targetAccount || targetAccount === "BANK-OTC") {
      const match = item.message?.match(/(?:from\s+account\s+|account\s+)(\d+)/i);
      if (match) targetAccount = match[1];
    }
    if (!targetAccount && item.counterpartyName?.toLowerCase().startsWith("account ")) {
      targetAccount = item.counterpartyName.replace(/\D/g, "");
    }
  }

  return {
    isDeposit,
    isWithdrawal,
    isPayment,
    isFailed,
    isItemReceived,
    displayTitle,
    targetAccount,
  };
};

export interface NotificationMessageTarget {
  message?: string | null;
  amount?: number | string | null;
  currency?: string | null;
  transferDirection?: "SENT" | "RECEIVED" | string | null;
  title?: string | null;
  destinationAccountNumber?: string | null;
  sourceAccountNumber?: string | null;
  transactionRef?: string | null;
  counterpartyName?: string | null;
  counterpartyAccountNumber?: string | null;
  notificationType?: string | null;
}

export const formatNotificationMessage = (item: NotificationMessageTarget): string => {
  const original = (item.message || "").trim();
  const meta = resolveNotificationMeta(item);
  const currency = item.currency || "MMK";

  // Case 0: Cash Deposit via Bank Counter
  if (meta.isDeposit) {
    let amtStr = "";
    if (item.amount !== null && item.amount !== undefined && item.amount !== "") {
      amtStr = formatAmountValue(item.amount);
    } else {
      const match = original.match(/(?:deposit|received)\s+([\d,.]+)/i);
      if (match) amtStr = formatAmountValue(match[1]);
    }

    const accStr = meta.targetAccount ? ` to account ${maskAccountNumber(meta.targetAccount)}` : "";

    if (amtStr) {
      return `Your cash deposit of ${amtStr} ${currency}${accStr} was successful.`;
    }
    return "Your cash deposit was successful.";
  }

  // Case 0.1: Cash Withdrawal via Bank Counter
  if (meta.isWithdrawal) {
    let amtStr = "";
    if (item.amount !== null && item.amount !== undefined && item.amount !== "") {
      amtStr = formatAmountValue(item.amount);
    } else {
      const match = original.match(/(?:withdrawn|withdrew)\s+([\d,.]+)/i);
      if (match) amtStr = formatAmountValue(match[1]);
    }

    const accStr = meta.targetAccount ? ` from account ${maskAccountNumber(meta.targetAccount)}` : "";

    if (amtStr) {
      return `Your cash withdrawal of ${amtStr} ${currency}${accStr} was successful.`;
    }
    return "Your cash withdrawal was successful.";
  }

  const isReceived = meta.isItemReceived;
  const isSent = !isReceived && (
    item.transferDirection === "SENT" ||
    (item.title || "").toLowerCase().includes("transfer sent") ||
    (item.title || "").toLowerCase().includes("sent") ||
    original.toLowerCase().startsWith("you have transferred") ||
    original.toLowerCase().startsWith("you have successfully transferred")
  );

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
