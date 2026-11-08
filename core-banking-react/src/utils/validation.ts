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
export function isValidPassword(password: string, minLength = 6): boolean {
  return password.length >= minLength;
}

export interface PasswordPolicyOptions {
  username?: string;
  email?: string;
}

/**
 * Password Policy Validator:
 * 1. Length between 6 and 12 characters
 * 2. At least 1 uppercase letter (A-Z)
 * 3. At least 1 special character
 * 4. Cannot contain username
 * 5. Cannot contain "gmail" or the user's email address
 */
export function validatePasswordPolicy(password: string, options: PasswordPolicyOptions = {}): string | undefined {
  if (!password) {
    return 'Password is required.';
  }

  // 1. Length rule: between 6 and 12 characters
  if (password.length < 6 || password.length > 12) {
    return 'Password must be between 6 and 12 characters.';
  }

  // 2. Uppercase letter rule: at least 1 uppercase
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter (A-Z).';
  }

  // 3. Special character rule: at least 1 special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)) {
    return 'Password must contain at least one special character.';
  }

  const lowerPwd = password.toLowerCase();

  // 4. Username rule: cannot contain username
  if (options.username && options.username.trim().length >= 2) {
    const cleanUsername = options.username.trim().toLowerCase();
    if (lowerPwd.includes(cleanUsername)) {
      return 'Password cannot contain your username.';
    }
  }

  // 5. Gmail rule: cannot contain "gmail"
  if (lowerPwd.includes('gmail')) {
    return 'Password cannot contain "gmail".';
  }

  // 6. Email address rule: cannot contain email or email prefix
  if (options.email && options.email.trim().length >= 3) {
    const cleanEmail = options.email.trim().toLowerCase();
    const emailPrefix = cleanEmail.split('@')[0];
    if (lowerPwd.includes(cleanEmail) || (emailPrefix && emailPrefix.length >= 3 && lowerPwd.includes(emailPrefix))) {
      return 'Password cannot contain your email address.';
    }
  }

  return undefined;
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
