package com.corebanking.dto;

import jakarta.servlet.http.HttpServletRequest;

/** Creation-only metadata from the servlet request, never from a login DTO. */
public record CusSessionClientMetadata(String ipAddress, String userAgent) {
    public static final CusSessionClientMetadata EMPTY = new CusSessionClientMetadata(null, null);

    public CusSessionClientMetadata {
        ipAddress = bounded(ipAddress, 45);
        userAgent = bounded(userAgent, 255);
    }

    public static CusSessionClientMetadata from(HttpServletRequest request) {
        // Forwarded headers are intentionally ignored. Proxy trust belongs in the container.
        return new CusSessionClientMetadata(request.getRemoteAddr(), request.getHeader("User-Agent"));
    }

    private static String bounded(String value, int maximum) {
        if (value == null || value.length() <= maximum) return value;
        int end = maximum;
        if (Character.isHighSurrogate(value.charAt(end - 1))) end--;
        return value.substring(0, end);
    }
}
