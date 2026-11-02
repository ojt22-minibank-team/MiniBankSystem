package com.corebanking.util;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Production-grade Sensitive Data Masking Utility for Core Banking.
 * <p>
 * Masks personally identifiable information (PII) including NRC, bank account numbers,
 * phone numbers, and email addresses for secure logging and display.
 * Pure, thread-safe, and defensive against null, empty, or irregularly formatted inputs.
 * </p>
 */
public final class DataMaskingUtil {

    private static final String MASK_CHAR = "*";
    private static final Pattern EMAIL_PATTERN = Pattern.compile("^(.)(.*)(.@.*)$");

    private DataMaskingUtil() {
        // Prevent instantiation of utility class
    }

    /**
     * Masks National Registration Card (NRC) numbers while preserving region/prefix and the last 4 characters.
     * Example: "12/OUKAMA(N)123456" -> "12/OUKAMA(N)**3456"
     *
     * @param nrc input NRC string
     * @return masked NRC string or empty/sanitized string if invalid
     */
    public static String maskNrc(String nrc) {
        if (nrc == null || nrc.isBlank()) {
            return "";
        }
        String trimmed = nrc.trim();
        int len = trimmed.length();
        if (len <= 6) {
            return MASK_CHAR.repeat(len);
        }

        int visiblePrefix = Math.max(2, len - 6);
        int visibleSuffix = 4;

        if (visiblePrefix + visibleSuffix >= len) {
            return trimmed.substring(0, 2) + MASK_CHAR.repeat(len - 4) + trimmed.substring(len - 2);
        }

        String prefix = trimmed.substring(0, visiblePrefix);
        String suffix = trimmed.substring(len - visibleSuffix);
        int maskLength = len - visiblePrefix - visibleSuffix;

        return prefix + MASK_CHAR.repeat(maskLength) + suffix;
    }

    /**
     * Masks bank account numbers by concealing all except the last 4 digits.
     * Example: "1009876543" -> "******6543"
     *
     * @param accountNumber input account number
     * @return masked account number
     */
    public static String maskAccountNumber(String accountNumber) {
        if (accountNumber == null || accountNumber.isBlank()) {
            return "";
        }
        String trimmed = accountNumber.trim();
        int len = trimmed.length();
        if (len <= 4) {
            return MASK_CHAR.repeat(len);
        }
        String suffix = trimmed.substring(len - 4);
        return MASK_CHAR.repeat(len - 4) + suffix;
    }

    /**
     * Masks phone numbers by retaining the telecommunication prefix (first 3-4 chars)
     * and the last 3-4 digits, while masking the middle digits.
     * Example: "09987654321" -> "099*****321" or "+95912345678" -> "+959****5678"
     *
     * @param phone input phone string
     * @return masked phone string
     */
    public static String maskPhone(String phone) {
        if (phone == null || phone.isBlank()) {
            return "";
        }
        String trimmed = phone.trim();
        int len = trimmed.length();
        if (len <= 6) {
            return MASK_CHAR.repeat(len);
        }

        int prefixLen = trimmed.startsWith("+") ? 4 : 3;
        int suffixLen = 4;

        if (prefixLen + suffixLen >= len) {
            prefixLen = 2;
            suffixLen = 2;
        }

        String prefix = trimmed.substring(0, prefixLen);
        String suffix = trimmed.substring(len - suffixLen);
        int maskLen = len - prefixLen - suffixLen;

        return prefix + MASK_CHAR.repeat(maskLen) + suffix;
    }

    /**
     * Masks email addresses preserving the first character of the username and the full domain.
     * Example: "john.doe@gmail.com" -> "j******e@gmail.com"
     *
     * @param email input email address
     * @return masked email string
     */
    public static String maskEmail(String email) {
        if (email == null || email.isBlank()) {
            return "";
        }
        String trimmed = email.trim();
        int atIndex = trimmed.indexOf('@');
        if (atIndex <= 1) {
            return trimmed; // Invalid or single-letter email, return as-is
        }

        String username = trimmed.substring(0, atIndex);
        String domain = trimmed.substring(atIndex);

        if (username.length() <= 2) {
            return username.charAt(0) + "*" + domain;
        }

        char firstChar = username.charAt(0);
        char lastChar = username.charAt(username.length() - 1);
        int maskLength = username.length() - 2;

        return firstChar + MASK_CHAR.repeat(maskLength) + lastChar + domain;
    }
}
