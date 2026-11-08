/**
 * Format a number as a currency string.
 * Safe fallback for null, undefined, or unsupported currency codes.
 */
export function formatCurrency(
  amount: number | string | null | undefined,
  currency = 'MMK',
  locale = 'en-US',
): string {
  const num = typeof amount === 'number' ? amount : Number(amount) || 0;
  const safeCurrency =
    currency && typeof currency === 'string' && currency.trim().length === 3
      ? currency.trim().toUpperCase()
      : 'MMK';

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: safeCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  } catch {
    return `${safeCurrency} ${num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
}

/**
 * Formats a raw numeric parameter string or number with thousand separators (e.g., 100000 -> "100,000").
 * Preserves non-numeric strings as-is (e.g. "MMK" -> "MMK").
 */
export function formatParameterValue(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return '—';
  const str = String(val).trim();
  if (str === '') return '—';
  if (/^-?\d+(\.\d+)?$/.test(str)) {
    const parts = str.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  }
  return str;
}
