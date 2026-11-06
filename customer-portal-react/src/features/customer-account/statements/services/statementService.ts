import api from "../../../../config/api";

export interface StatementDownloadParams {
  accountNumber: string;
  fromDate: string; // ISO date format: YYYY-MM-DD
  toDate: string;   // ISO date format: YYYY-MM-DD
}

export interface StatementDownloadResult {
  filename: string;
  blob: Blob;
}

/**
 * Parses Content-Disposition header to extract the filename.
 * Supports standard filename="..." and RFC 5987 / RFC 6266 filename*=UTF-8''...
 * Falls back to fallbackFilename if absent or unparseable.
 */
export function extractFilenameFromContentDisposition(
  contentDisposition?: string | null,
  fallbackFilename: string = "account-statement"
): string {
  if (!contentDisposition) return fallbackFilename;

  // RFC 5987 / RFC 6266: filename*=UTF-8''filename.ext
  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match && utf8Match[1]) {
    try {
      return decodeURIComponent(utf8Match[1].trim());
    } catch {
      // ignore decoding error and proceed to standard match
    }
  }

  // Standard: filename="foo.pdf" or filename=foo.pdf
  const standardMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
  if (standardMatch && standardMatch[1]) {
    return standardMatch[1].trim();
  }

  return fallbackFilename;
}

/**
 * Builds a deterministic fallback filename when Content-Disposition is missing.
 */
export function buildFallbackFilename(
  accountNumber: string,
  fromDate: string,
  toDate: string,
  extension: "pdf" | "csv"
): string {
  const safeAccount = accountNumber ? accountNumber.replace(/[^a-zA-Z0-9_-]/g, "") : "account";
  return `account-statement-${safeAccount || "account"}-${fromDate}-to-${toDate}.${extension}`;
}

/**
 * Triggers safe browser file download using temporary anchor and revoking object URL.
 */
export function triggerBrowserDownload(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
}

/**
 * Extracts a user-friendly error message from a failed Axios response.
 * When responseType: "blob" is used, Axios returns error response data as a Blob.
 */
export async function parseBlobErrorMessage(
  error: unknown,
  fallbackMessage: string
): Promise<string> {
  if (!error || typeof error !== "object") {
    return fallbackMessage;
  }

  const err = error as { response?: { data?: unknown } };
  const data = err.response?.data;

  // If response error data is a Blob containing JSON
  if (data instanceof Blob) {
    try {
      const text = await data.text();
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed.message === "string" && parsed.message.trim().length > 0) {
        const msg = parsed.message.trim();
        // Guard: Do not display stack traces, SQL errors, or internal Java exceptions
        if (!/(Exception|SQLException|HibernateException|NullPointer|org\.springframework|com\.mysql)/i.test(msg)) {
          return msg;
        }
      }
    } catch {
      // Non-JSON blob, fall back
    }
  } else if (data && typeof data === "object") {
    const parsed = data as { message?: unknown };
    if (typeof parsed.message === "string" && parsed.message.trim().length > 0) {
      const msg = parsed.message.trim();
      if (!/(Exception|SQLException|HibernateException|NullPointer|org\.springframework|com\.mysql)/i.test(msg)) {
        return msg;
      }
    }
  }

  return fallbackMessage;
}

/**
 * Downloads customer account statement in PDF format.
 * Endpoint: GET /account-statements/pdf (relative to /api/customer)
 */
export const downloadAccountStatementPdf = async (
  params: StatementDownloadParams
): Promise<StatementDownloadResult> => {
  const response = await api.get<Blob>("/account-statements/pdf", {
    params: {
      accountNumber: params.accountNumber,
      fromDate: params.fromDate,
      toDate: params.toDate,
    },
    responseType: "blob",
  });

  const blob = response.data;
  if (!blob || blob.size === 0) {
    throw new Error("Empty PDF statement received.");
  }

  const fallback = buildFallbackFilename(params.accountNumber, params.fromDate, params.toDate, "pdf");
  const filename = extractFilenameFromContentDisposition(
    (response.headers["content-disposition"] as string | undefined) ||
      (response.headers["Content-Disposition"] as string | undefined),
    fallback
  );

  triggerBrowserDownload(blob, filename);
  return { filename, blob };
};

/**
 * Downloads customer account statement in CSV format.
 * Endpoint: GET /account-statements/csv (relative to /api/customer)
 */
export const downloadAccountStatementCsv = async (
  params: StatementDownloadParams
): Promise<StatementDownloadResult> => {
  const response = await api.get<Blob>("/account-statements/csv", {
    params: {
      accountNumber: params.accountNumber,
      fromDate: params.fromDate,
      toDate: params.toDate,
    },
    responseType: "blob",
  });

  const blob = response.data;
  if (!blob || blob.size === 0) {
    throw new Error("Empty CSV statement received.");
  }

  const fallback = buildFallbackFilename(params.accountNumber, params.fromDate, params.toDate, "csv");
  const filename = extractFilenameFromContentDisposition(
    (response.headers["content-disposition"] as string | undefined) ||
      (response.headers["Content-Disposition"] as string | undefined),
    fallback
  );

  triggerBrowserDownload(blob, filename);
  return { filename, blob };
};
