/**
 * Generates an RFC 4122 version 4 compliant UUID string.
 * Works reliably across both Secure Contexts (HTTPS, localhost)
 * and Non-Secure Contexts (e.g. plain HTTP over remote IP).
 */
export function safeRandomUUID(): string {
  // 1. Native crypto.randomUUID (available in Secure Contexts)
  if (
    typeof window !== "undefined" &&
    window.crypto &&
    typeof window.crypto.randomUUID === "function"
  ) {
    try {
      return window.crypto.randomUUID();
    } catch {
      // Fallback if execution throws
    }
  }

  // 2. crypto.getRandomValues fallback
  if (
    typeof window !== "undefined" &&
    window.crypto &&
    typeof window.crypto.getRandomValues === "function"
  ) {
    try {
      const bytes = new Uint8Array(16);
      window.crypto.getRandomValues(bytes);
      bytes[6] = (bytes[6] & 0x0f) | 0x40; // RFC4122 variant 4
      bytes[8] = (bytes[8] & 0x3f) | 0x80; // RFC4122 variant 10xx
      const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    } catch {
      // Fallback if crypto.getRandomValues fails
    }
  }

  // 3. RFC4122 Math.random fallback (universal)
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
