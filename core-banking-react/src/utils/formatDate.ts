/**
 * Parses an ISO date string or date value safely, accounting for server timezone shifts.
 * Handles:
 * 1. Strings with explicit timezone (e.g. "Z", "+06:30", "-08:00")
 * 2. Naive strings from remote Windows server (42.156.32.114) operating in Pacific Time (UTC-8)
 * 3. Naive strings from local server operating in Myanmar Time (UTC+6:30)
 */
export function parseSafeDate(date: string | Date | null | undefined): Date {
  if (!date) return new Date();
  if (date instanceof Date) return isNaN(date.getTime()) ? new Date() : date;

  const dateStr = String(date).trim();
  if (!dateStr) return new Date();

  // 1. Explicit timezone check (e.g. ends with Z, +HH:MM, -HH:MM)
  const hasTimezone = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(dateStr);
  if (hasTimezone) {
    const parsed = new Date(dateStr);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  }

  // 2. Normalize space separator to 'T'
  const normalizedStr = dateStr.includes("T") ? dateStr : dateStr.replace(" ", "T");
  const now = new Date();

  const localDate = new Date(normalizedStr);
  if (isNaN(localDate.getTime())) return now;

  // 3. Check for remote server timezone shift:
  // The remote Windows server (42.156.32.114) operates in US Pacific Time (UTC-8).
  // In Myanmar (UTC+6:30), localDate appears ~14 to 15 hours in the past!
  const isRemoteServer =
    (typeof window !== "undefined" && window.location.hostname.includes("42.156.32.114")) ||
    (typeof import.meta !== "undefined" && Boolean(import.meta.env?.VITE_API_BASE_URL?.includes("42.156.32.114")));

  const pacificDate = new Date(`${normalizedStr}-08:00`);
  if (isRemoteServer && !isNaN(pacificDate.getTime())) {
    return pacificDate;
  }

  const localDiffMs = now.getTime() - localDate.getTime();
  const pacificDiffMs = now.getTime() - pacificDate.getTime();

  // If interpreting as Pacific Time makes it fresh/recent (>= -60s and < 14h),
  // whereas localDiffMs is between 13h and 24h:
  if (
    !isNaN(pacificDate.getTime()) &&
    pacificDiffMs >= -60000 &&
    localDiffMs >= 13 * 3600 * 1000 &&
    localDiffMs <= 24 * 3600 * 1000
  ) {
    return pacificDate;
  }

  // 4. Try parsing as UTC (Z) if server operates in UTC (6.5h difference from Myanmar):
  const utcDate = new Date(`${normalizedStr}Z`);
  const utcDiffMs = now.getTime() - utcDate.getTime();
  if (
    !isNaN(utcDate.getTime()) &&
    utcDiffMs >= -60000 &&
    localDiffMs >= 5.5 * 3600 * 1000 &&
    localDiffMs <= 8 * 3600 * 1000
  ) {
    return utcDate;
  }

  return localDate;
}

/**
 * Format an ISO date string or Date to Day Month Year format (DD/MM/YYYY).
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '—';
  const d = parseSafeDate(date);
  if (isNaN(d.getTime())) return '—';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/**
 * Format an ISO date string or Date to Day Month Year + Time string (DD/MM/YYYY, hh:mm A).
 */
export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '—';
  const d = parseSafeDate(date);
  if (isNaN(d.getTime())) return '—';
  const pad = (n: number) => String(n).padStart(2, '0');
  const datePart = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  const hours = d.getHours();
  const minutes = pad(d.getMinutes());
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const formattedHours = pad(hours % 12 || 12);
  return `${datePart}, ${formattedHours}:${minutes} ${ampm}`;
}
