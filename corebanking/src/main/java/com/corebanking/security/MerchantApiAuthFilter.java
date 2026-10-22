package com.corebanking.security;

import com.corebanking.dto.CoreApiResponse;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;
import org.springframework.web.filter.OncePerRequestFilter;
import tools.jackson.databind.ObjectMapper;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;

/**
 * Filter responsible for validating HMAC-SHA256 signatures on Merchant and Payment Gateway requests.
 * Restricts exclusively to /api/v1/payments/ecommerce/**.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class MerchantApiAuthFilter extends OncePerRequestFilter {

    public static final String HEADER_MERCHANT_ID = "X-Merchant-Id";
    public static final String HEADER_TIMESTAMP = "X-Timestamp";
    public static final String HEADER_SIGNATURE = "X-Signature";

    private static final String HMAC_ALGORITHM = "HmacSHA256";
    private static final long TIMESTAMP_EXPIRY_SECONDS = 300L; // 5-minute replay window
    private static final String ECOMMERCE_PATH_PATTERN = "/api/v1/payments/ecommerce/**";

    private final MerchantSecretService merchantSecretService;
    private final ObjectMapper objectMapper;
    private final AntPathMatcher pathMatcher = new AntPathMatcher();

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String uri = request.getRequestURI();
        String contextPath = request.getContextPath();
        if (contextPath != null && !contextPath.isEmpty() && uri.startsWith(contextPath)) {
            uri = uri.substring(contextPath.length());
        }

        // Allow CORS preflight requests
        if (HttpMethod.OPTIONS.matches(request.getMethod())) {
            return true;
        }

        // Filter ONLY paths matching /api/v1/payments/ecommerce/**
        return !pathMatcher.match(ECOMMERCE_PATH_PATTERN, uri);
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        // 1. Wrap request in CachedBodyHttpServletRequest so body can be read multiple times
        CachedBodyHttpServletRequest cachedRequest;
        if (request instanceof CachedBodyHttpServletRequest) {
            cachedRequest = (CachedBodyHttpServletRequest) request;
        } else {
            cachedRequest = new CachedBodyHttpServletRequest(request);
        }

        String merchantId = cachedRequest.getHeader(HEADER_MERCHANT_ID);
        String timestampHeader = cachedRequest.getHeader(HEADER_TIMESTAMP);
        String signatureHeader = cachedRequest.getHeader(HEADER_SIGNATURE);

        // 2. Validate presence of required headers
        if (merchantId == null || merchantId.isBlank()
                || timestampHeader == null || timestampHeader.isBlank()
                || signatureHeader == null || signatureHeader.isBlank()) {
            log.warn("Missing required HMAC headers. X-Merchant-Id: {}, X-Timestamp: {}, X-Signature: {}",
                    merchantId, timestampHeader, signatureHeader != null ? "PRESENT" : "MISSING");
            sendJsonResponse(response, HttpServletResponse.SC_UNAUTHORIZED,
                    "Authentication failed: Missing required headers (X-Merchant-Id, X-Timestamp, X-Signature)");
            return;
        }

        // 3. Validate timestamp format and freshness (replay prevention)
        long requestEpoch;
        try {
            requestEpoch = Long.parseLong(timestampHeader.trim());
        } catch (NumberFormatException e) {
            log.warn("Invalid X-Timestamp header format: {}", timestampHeader);
            sendJsonResponse(response, HttpServletResponse.SC_UNAUTHORIZED,
                    "Authentication failed: Invalid X-Timestamp header format");
            return;
        }

        long currentEpoch = Instant.now().getEpochSecond();
        if (Math.abs(currentEpoch - requestEpoch) > TIMESTAMP_EXPIRY_SECONDS) {
            log.warn("Timestamp outside 5-minute replay window. Request epoch: {}, Current epoch: {}, Diff: {}s",
                    requestEpoch, currentEpoch, Math.abs(currentEpoch - requestEpoch));
            sendJsonResponse(response, HttpServletResponse.SC_UNAUTHORIZED,
                    "Authentication failed: Request timestamp is expired or outside allowable time window");
            return;
        }

        // 4. Look up merchant secret
        Optional<String> secretKeyOpt = merchantSecretService.getSecretKeyByMerchantId(merchantId.trim());
        if (secretKeyOpt.isEmpty()) {
            log.warn("Merchant secret not found for ID: {}", merchantId);
            sendJsonResponse(response, HttpServletResponse.SC_FORBIDDEN,
                    "Authentication failed: Invalid merchant credentials");
            return;
        }

        // 5. Canonical signing payload reconstruction: <HTTP_METHOD>\n<REQUEST_URI>\n<X-TIMESTAMP>\n<RAW_BODY>
        String method = cachedRequest.getMethod();
        String requestUri = cachedRequest.getRequestURI();
        byte[] rawBodyBytes = cachedRequest.getCachedBody();
        String rawBody = new String(rawBodyBytes, StandardCharsets.UTF_8);

        String canonicalPayload = method + "\n" + requestUri + "\n" + timestampHeader.trim() + "\n" + rawBody;

        // 6. Compute HMAC-SHA256 signature
        String expectedSignature;
        try {
            expectedSignature = calculateHmacSha256(canonicalPayload, secretKeyOpt.get());
        } catch (NoSuchAlgorithmException | InvalidKeyException e) {
            log.error("Failed to compute HMAC-SHA256 signature", e);
            sendJsonResponse(response, HttpServletResponse.SC_INTERNAL_SERVER_ERROR,
                    "Internal server error occurred during signature calculation");
            return;
        }

        // 7. Constant-time comparison to prevent timing attacks
        byte[] expectedSigBytes = expectedSignature.getBytes(StandardCharsets.UTF_8);
        byte[] providedSigBytes = signatureHeader.trim().getBytes(StandardCharsets.UTF_8);

        if (!MessageDigest.isEqual(expectedSigBytes, providedSigBytes)) {
            log.warn("HMAC signature mismatch for merchant: {}", merchantId);
            sendJsonResponse(response, HttpServletResponse.SC_FORBIDDEN,
                    "Access denied: Invalid request signature");
            return;
        }

        // 8. Authentication successful -> Set SecurityContext with ROLE_MERCHANT_GATEWAY
        List<SimpleGrantedAuthority> authorities = List.of(
                new SimpleGrantedAuthority("ROLE_MERCHANT_GATEWAY")
        );

        UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                merchantId,
                null,
                authorities
        );
        authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(cachedRequest));
        SecurityContextHolder.getContext().setAuthentication(authentication);

        log.debug("Merchant authenticated successfully: {}", merchantId);

        // Continue chain with the cached request
        filterChain.doFilter(cachedRequest, response);
    }

    private String calculateHmacSha256(String data, String secret)
            throws NoSuchAlgorithmException, InvalidKeyException {
        Mac mac = Mac.getInstance(HMAC_ALGORITHM);
        SecretKeySpec secretKeySpec = new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), HMAC_ALGORITHM);
        mac.init(secretKeySpec);
        byte[] hmacBytes = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
        return HexFormat.of().formatHex(hmacBytes);
    }

    private void sendJsonResponse(HttpServletResponse response, int status, String message) throws IOException {
        SecurityContextHolder.clearContext();
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");

        CoreApiResponse<Void> apiResponse = CoreApiResponse.<Void>builder()
                .success(false)
                .message(message)
                .data(null)
                .build();

        objectMapper.writeValue(response.getWriter(), apiResponse);
    }
}
