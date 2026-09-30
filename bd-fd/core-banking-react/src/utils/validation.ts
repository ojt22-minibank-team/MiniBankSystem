/**
 * Validate that a string is non-empty after trimming.
 */
export function isRequired(value: string): boolean {
  return value.trim().length > 0;
}

/**
 * Validate email format.
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Validate minimum password length.
 */
export function isValidPassword(password: string, minLength = 8): boolean {
  return password.length >= minLength;
}

/**
 * Return validation error message or undefined if valid.
 */
export function validateRequired(value: string, fieldName: string): string | undefined {
  if (!isRequired(value)) return `${fieldName} is required.`;
  return undefined;
}

export function validateEmail(email: string): string | undefined {
  if (!isRequired(email)) return 'Email is required.';
  if (!isValidEmail(email)) return 'Please enter a valid email address.';
  return undefined;
}
