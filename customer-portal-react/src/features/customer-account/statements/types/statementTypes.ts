export type StatementAccountType = "CURRENT" | "SAVINGS";
export type StatementStep = "form" | "verify" | "download";

export interface StatementFilterForm {
  accountType: StatementAccountType;
  accountNumber: string;
  fromDate: string; // ISO date: YYYY-MM-DD
  toDate: string;   // ISO date: YYYY-MM-DD
}

// Convert YYYY-MM-DD (ISO) -> DD-MM-YYYY (Display)
export function isoToDisplay(iso: string): string {
  if (!iso) return "";
  const parts = iso.split("-");
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return iso;
}

// Convert DD-MM-YYYY (Display) -> YYYY-MM-DD (ISO)
export function displayToIso(display: string): string {
  if (!display) return "";
  const parts = display.split("-");
  if (parts.length === 3 && parts[2].length === 4) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return "";
}

// Get current local calendar date in YYYY-MM-DD
export function getTodayLocalIso(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Normalize openedAt timestamp to canonical YYYY-MM-DD date string
export function normalizeAccountOpeningDate(openedAt?: string | null): string | null {
  if (!openedAt) return null;
  const trimmed = openedAt.trim();
  if (trimmed.length >= 10) {
    const candidate = trimmed.substring(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(candidate)) {
      return candidate;
    }
  }
  return null;
}

export interface MinimalAccountOpeningInfo {
  openedAt?: string | null;
}

/**
 * Validates Statement filter form against strict priority order rules (1 to 7).
 * Stops and returns the first error message encountered, or null if all pass.
 */
export function validateStatementForm(
  form: StatementFilterForm,
  selectedAccount?: MinimalAccountOpeningInfo | null,
  todayIso: string = getTodayLocalIso()
): string | null {
  // Rule 1: Account Number missing
  if (!form.accountNumber || form.accountNumber.trim() === "") {
    return "Please select an account number.";
  }

  // Rule 2: From Date missing
  if (!form.fromDate || form.fromDate.trim() === "") {
    return "Please select a From Date.";
  }

  // Rule 3: To Date missing
  if (!form.toDate || form.toDate.trim() === "") {
    return "Please select a To Date.";
  }

  // Rule 4: From Date > current date
  if (form.fromDate > todayIso) {
    return "From Date cannot be in the future.";
  }

  // Rule 5: To Date > current date
  if (form.toDate > todayIso) {
    return "To Date cannot be in the future.";
  }

  // Rule 6: From Date > To Date
  if (form.fromDate > form.toDate) {
    return "From Date cannot be later than To Date.";
  }

  // Rule 7: From Date < selected account opening date
  if (selectedAccount?.openedAt) {
    const openingDate = normalizeAccountOpeningDate(selectedAccount.openedAt);
    if (openingDate && form.fromDate < openingDate) {
      return "From Date cannot be earlier than the account opening date.";
    }
  }

  return null;
}

