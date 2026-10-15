package com.corebanking.util;

import com.corebanking.entity.enums.ActorType;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.Optional;
import java.util.UUID;

/**
 * Thread-safe Context Extraction Utility for Core Banking Auditing.
 * <p>
 * Extracts HTTP headers, client IP addresses, correlation IDs, and authenticated
 * actor details without throwing exceptions when executed within asynchronous,
 * batch, or unauthenticated contexts.
 * </p>
 */
@Slf4j
public final class AuditContextUtil {

    private static final String UNKNOWN = "UNKNOWN";
    private static final String SYSTEM = "SYSTEM";
    private static final String LOCALHOST_IPV6 = "0:0:0:0:0:0:0:1";
    private static final String LOCALHOST_IPV4 = "127.0.0.1";

    private static final String[] IP_HEADER_CANDIDATES = {
            "X-Forwarded-For",
            "Proxy-Client-IP",
            "WL-Proxy-Client-IP",
            "HTTP_X_FORWARDED_FOR",
            "HTTP_X_FORWARDED",
            "HTTP_X_CLUSTER_CLIENT_IP",
            "HTTP_CLIENT_IP",
            "HTTP_FORWARDED_FOR",
            "HTTP_FORWARDED",
            "X-Real-IP"
    };

    private AuditContextUtil() {
        // Utility class private constructor
    }

    /**
     * Safely resolve the current HTTP servlet request from the Spring web context.
     *
     * @return Optional containing the active HttpServletRequest, or empty if out-of-scope
     */
    public static Optional<HttpServletRequest> getCurrentHttpRequest() {
        try {
            RequestAttributes attributes = RequestContextHolder.getRequestAttributes();
            if (attributes instanceof ServletRequestAttributes servletRequestAttributes) {
                return Optional.ofNullable(servletRequestAttributes.getRequest());
            }
        } catch (Exception e) {
            log.trace("Unable to retrieve HttpServletRequest from RequestContextHolder: {}", e.getMessage());
        }
        return Optional.empty();
    }

    /**
     * Safely extract the client's IPv4/IPv6 address.
     * Evaluates reverse proxy headers (e.g. X-Forwarded-For) before falling back to getRemoteAddr().
     *
     * @return resolved IP address string (maximum 45 characters)
     */
    public static String getClientIpAddress() {
        Optional<HttpServletRequest> requestOpt = getCurrentHttpRequest();
        if (requestOpt.isEmpty()) {
            return LOCALHOST_IPV4;
        }

        HttpServletRequest request = requestOpt.get();
        for (String header : IP_HEADER_CANDIDATES) {
            String ipList = request.getHeader(header);
            if (ipList != null && !ipList.isBlank() && !UNKNOWN.equalsIgnoreCase(ipList)) {
                // Return first hop IP in multi-proxy forwarding chains
                String clientIp = ipList.split(",")[0].trim();
                return sanitizeIpAddress(clientIp);
            }
        }

        return sanitizeIpAddress(request.getRemoteAddr());
    }

    /**
     * Safely extract the User-Agent header from the active HTTP request.
     *
     * @return User-Agent string truncated to 255 characters, or "SYSTEM" if absent
     */
    public static String getUserAgent() {
        Optional<HttpServletRequest> requestOpt = getCurrentHttpRequest();
        if (requestOpt.isEmpty()) {
            return SYSTEM;
        }

        String userAgent = requestOpt.get().getHeader("User-Agent");
        if (userAgent == null || userAgent.isBlank()) {
            return UNKNOWN;
        }

        return userAgent.length() > 255 ? userAgent.substring(0, 255) : userAgent;
    }

    /**
     * Safely extract the request URL and HTTP method.
     *
     * @return formatted HTTP method + request URI, or "SYSTEM_TASK"
     */
    public static String getRequestUrl() {
        Optional<HttpServletRequest> requestOpt = getCurrentHttpRequest();
        if (requestOpt.isEmpty()) {
            return "SYSTEM_TASK";
        }

        HttpServletRequest req = requestOpt.get();
        String fullUrl = req.getMethod() + " " + req.getRequestURI();
        return fullUrl.length() > 255 ? fullUrl.substring(0, 255) : fullUrl;
    }

    /**
     * Safely resolve or generate a distributed trace / request correlation identifier.
     *
     * @return request ID string (maximum 64 characters)
     */
    public static String getRequestId() {
        Optional<HttpServletRequest> requestOpt = getCurrentHttpRequest();
        if (requestOpt.isPresent()) {
            HttpServletRequest req = requestOpt.get();
            String reqId = req.getHeader("X-Request-Id");
            if (reqId == null || reqId.isBlank()) {
                reqId = req.getHeader("X-Correlation-Id");
            }
            if (reqId != null && !reqId.isBlank()) {
                return reqId.length() > 64 ? reqId.substring(0, 64) : reqId;
            }
        }
        return UUID.randomUUID().toString();
    }

    /**
     * Safely retrieve the current active Spring Security authentication.
     *
     * @return Optional containing authenticated principal, or empty if anonymous/null
     */
    public static Optional<Authentication> getAuthentication() {
        try {
            SecurityContext context = SecurityContextHolder.getContext();
            if (context == null) {
                return Optional.empty();
            }
            Authentication auth = context.getAuthentication();
            if (auth == null || !auth.isAuthenticated() || "anonymousUser".equalsIgnoreCase(auth.getName())) {
                return Optional.empty();
            }
            return Optional.of(auth);
        } catch (Exception e) {
            log.trace("Error retrieving SecurityContext authentication: {}", e.getMessage());
            return Optional.empty();
        }
    }

    /**
     * Determine the ActorType based on active authentication and authority markers.
     *
     * @return ActorType classification (STAFF, CUSTOMER, SYSTEM, GUEST)
     */
    public static ActorType resolveActorType() {
        Optional<Authentication> authOpt = getAuthentication();
        if (authOpt.isEmpty()) {
            return getCurrentHttpRequest().isPresent() ? ActorType.GUEST : ActorType.SYSTEM;
        }

        Authentication auth = authOpt.get();
        boolean hasCustomerRole = auth.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch(role -> "ROLE_CUSTOMER".equalsIgnoreCase(role));

        if (hasCustomerRole) {
            return ActorType.CUSTOMER;
        }

        // Check if principal is formatted as customer UUID
        try {
            UUID.fromString(auth.getName());
            return ActorType.CUSTOMER;
        } catch (Exception ignored) {
            // Not a UUID format, treat as staff user
        }

        return ActorType.STAFF;
    }

    /**
     * Safely extract the Staff Username if currently authenticated as a Staff actor.
     *
     * @return Optional containing the staff username
     */
    public static Optional<String> getCurrentStaffUsername() {
        Optional<Authentication> authOpt = getAuthentication();
        if (authOpt.isEmpty()) {
            return Optional.empty();
        }

        if (resolveActorType() == ActorType.STAFF) {
            return Optional.ofNullable(authOpt.get().getName());
        }

        return Optional.empty();
    }

    /**
     * Safely extract the Customer UUID if currently authenticated as a Customer actor.
     *
     * @return Optional containing the Customer UUID
     */
    public static Optional<UUID> getCurrentCustomerUuid() {
        Optional<Authentication> authOpt = getAuthentication();
        if (authOpt.isEmpty()) {
            return Optional.empty();
        }

        if (resolveActorType() == ActorType.CUSTOMER) {
            try {
                return Optional.of(UUID.fromString(authOpt.get().getName()));
            } catch (IllegalArgumentException e) {
                log.trace("Failed to parse customer UUID from authentication principal: {}", authOpt.get().getName());
            }
        }

        return Optional.empty();
    }

    private static String sanitizeIpAddress(String ip) {
        if (ip == null || ip.isBlank() || UNKNOWN.equalsIgnoreCase(ip)) {
            return LOCALHOST_IPV4;
        }
        if (LOCALHOST_IPV6.equals(ip)) {
            return LOCALHOST_IPV4;
        }
        return ip.length() > 45 ? ip.substring(0, 45) : ip;
    }
}
