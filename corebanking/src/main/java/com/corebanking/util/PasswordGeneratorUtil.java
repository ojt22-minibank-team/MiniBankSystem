package com.corebanking.util;

import java.util.concurrent.ThreadLocalRandom;

public class PasswordGeneratorUtil {

    private static final String SAFE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

    /**
     * Default method: generates an 8-character temporary password.
     */
    public static String generateTemporaryPassword() {
        return generateTemporaryPassword(8);
    }

    /**
     * Overloaded method: accepts length (e.g., 8, 10, 12).
     */
    public static String generateTemporaryPassword(int length) {
        return generateSafeTemporaryPassword(length);
    }

    /**
     * Safe Alphanumeric Temporary Password Generation.
     * Uses only unambiguous alphanumeric characters (A-Z, a-z, 2-9), completely omitting special symbols.
     */
    public static String generateSafeTemporaryPassword(int length) {
        if (length < 8) {
            length = 8;
        }
        String chars = SAFE_CHARS;
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < length; i++) {
            int index = ThreadLocalRandom.current().nextInt(chars.length());
            sb.append(chars.charAt(index));
        }
        return sb.toString();
    }
}