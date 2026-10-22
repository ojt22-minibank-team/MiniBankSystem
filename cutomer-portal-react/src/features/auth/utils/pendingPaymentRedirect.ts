const REDIRECT_KEY = "redirectUrl";
const PAYMENT_TOKEN_KEY = "paymentToken";

export const clearPendingPaymentRedirect = () => {
  sessionStorage.removeItem(REDIRECT_KEY);
  sessionStorage.removeItem(PAYMENT_TOKEN_KEY);
};

// PTKK captures this intent. It selects a confirmation screen, never authorizes payment.
export const consumePendingPaymentRedirect = (): string => {
  const redirectUrl = sessionStorage.getItem(REDIRECT_KEY);
  const paymentToken = sessionStorage.getItem(PAYMENT_TOKEN_KEY);
  clearPendingPaymentRedirect();

  // Match the backend token alphabet/maximum length; reject whitespace and encoding tricks.
  if (!paymentToken || paymentToken.length > 64 || /[^A-Za-z0-9_-]/.test(paymentToken)) {
    return "/dashboard";
  }

  // Exact canonical equality rejects external URLs, other routes, duplicate/extra params
  // and mismatched tokens. Build the destination rather than navigating to stored input.
  const destination = `/checkout?token=${encodeURIComponent(paymentToken)}`;
  return redirectUrl === destination ? destination : "/dashboard";
};
