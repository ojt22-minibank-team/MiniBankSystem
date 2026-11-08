package com.corebanking.util;

public class StaffPasswordValidator {

    /**
     * Enforces the Core Banking staff password security policy:
     * 1. Length between 6 and 16 characters
     * 2. At least 1 uppercase letter (A-Z)
     * 3. At least 1 special character
     * 4. Must not contain the staff's username
     * 5. Must not contain "gmail" or the staff's email address
     */
    public static void validate(String password, String username, String email) {
        if (password == null || password.isBlank()) {
            throw new IllegalArgumentException("Password is required");
        }

        // 1. Length check: between 6 and 16 characters
        if (password.length() < 6 || password.length() > 16) {
            throw new IllegalArgumentException("Password must be between 6 and 16 characters");
        }

        // 2. Uppercase letter check: at least 1 uppercase (A-Z)
        if (!password.matches(".*[A-Z].*")) {
            throw new IllegalArgumentException("Password must contain at least one uppercase letter (A-Z)");
        }

        // 3. Special character check: at least 1 special character
        if (!password.matches(".*[!@#$%^&*()_+\\-=\\[\\]{};':\"\\\\|,.<>\\/?`~].*")) {
            throw new IllegalArgumentException("Password must contain at least one special character");
        }

        String lowerPwd = password.toLowerCase();

        // 4. Username check: must not contain username
        if (username != null && username.trim().length() >= 2) {
            String cleanUsername = username.trim().toLowerCase();
            if (lowerPwd.contains(cleanUsername)) {
                throw new IllegalArgumentException("Password cannot contain your username");
            }
        }

        // 5. Gmail check: must not contain "gmail"
        if (lowerPwd.contains("gmail")) {
            throw new IllegalArgumentException("Password cannot contain 'gmail'");
        }

        // 6. Email check: must not contain email or email prefix
        if (email != null && email.trim().length() >= 3) {
            String cleanEmail = email.trim().toLowerCase();
            String prefix = cleanEmail.split("@")[0];
            if (lowerPwd.contains(cleanEmail) || (prefix.length() >= 3 && lowerPwd.contains(prefix))) {
                throw new IllegalArgumentException("Password cannot contain your email address");
            }
        }
    }
}
