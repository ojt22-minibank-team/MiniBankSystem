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
