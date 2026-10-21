package com.corebanking.security;

import com.corebanking.dto.CoreApiResponse;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import tools.jackson.databind.ObjectMapper;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MerchantApiAuthFilterTest {

    @Mock
    private MerchantSecretService merchantSecretService;

    @Mock
    private FilterChain filterChain;

    private MerchantApiAuthFilter filter;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final String MERCHANT_ID = "GW-PAYMENT-001";
    private static final String SECRET_KEY = "test_merchant_secret_key";
    private static final String ENDPOINT = "/api/v1/payments/ecommerce/checkout";

    @BeforeEach
    void setUp() {
        SecurityContextHolder.clearContext();
        filter = new MerchantApiAuthFilter(merchantSecretService, objectMapper);
    }

    private String calculateHmac(String data, String secret) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        SecretKeySpec keySpec = new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
        mac.init(keySpec);
        return HexFormat.of().formatHex(mac.doFinal(data.getBytes(StandardCharsets.UTF_8)));
    }

    @Test
    @DisplayName("shouldNotFilter returns true for non-ecommerce endpoints")
    void testShouldNotFilterNonEcommerce() {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/accounts");
        assertThat(filter.shouldNotFilter(request)).isTrue();
    }

    @Test
    @DisplayName("shouldNotFilter returns false for ecommerce endpoints")
    void testShouldFilterEcommerce() {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/payments/ecommerce/checkout");
        assertThat(filter.shouldNotFilter(request)).isFalse();
    }

    @Test
    @DisplayName("Returns 401 when required headers are missing")
    void testMissingHeaders() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", ENDPOINT);
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, filterChain);

        assertThat(response.getStatus()).isEqualTo(HttpServletResponse.SC_UNAUTHORIZED);
        verify(filterChain, never()).doFilter(any(), any());
    }

    @Test
    @DisplayName("Returns 401 when timestamp is outside the 5-minute replay window")
    void testExpiredTimestamp() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", ENDPOINT);
        long expiredEpoch = Instant.now().getEpochSecond() - 301;
        request.addHeader(MerchantApiAuthFilter.HEADER_MERCHANT_ID, MERCHANT_ID);
        request.addHeader(MerchantApiAuthFilter.HEADER_TIMESTAMP, String.valueOf(expiredEpoch));
        request.addHeader(MerchantApiAuthFilter.HEADER_SIGNATURE, "dummy_sig");

        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, filterChain);

        assertThat(response.getStatus()).isEqualTo(HttpServletResponse.SC_UNAUTHORIZED);
        verify(filterChain, never()).doFilter(any(), any());
    }

    @Test
    @DisplayName("Returns 403 when signature is invalid")
    void testInvalidSignature() throws Exception {
        String body = "{\"orderId\":\"ORD-12345\"}";
        long currentEpoch = Instant.now().getEpochSecond();

        when(merchantSecretService.getSecretKeyByMerchantId(MERCHANT_ID)).thenReturn(Optional.of(SECRET_KEY));

        MockHttpServletRequest request = new MockHttpServletRequest("POST", ENDPOINT);
        request.setContent(body.getBytes(StandardCharsets.UTF_8));
        request.addHeader(MerchantApiAuthFilter.HEADER_MERCHANT_ID, MERCHANT_ID);
        request.addHeader(MerchantApiAuthFilter.HEADER_TIMESTAMP, String.valueOf(currentEpoch));
        request.addHeader(MerchantApiAuthFilter.HEADER_SIGNATURE, "invalid_signature_hex");

        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, filterChain);

        assertThat(response.getStatus()).isEqualTo(HttpServletResponse.SC_FORBIDDEN);
        verify(filterChain, never()).doFilter(any(), any());
    }

    @Test
    @DisplayName("Authenticates successfully and continues filter chain when HMAC signature matches")
    void testSuccessfulAuthentication() throws Exception {
        String body = "{\"orderId\":\"ORD-12345\",\"amount\":1000}";
        long currentEpoch = Instant.now().getEpochSecond();

        String canonicalPayload = "POST\n" + ENDPOINT + "\n" + currentEpoch + "\n" + body;
        String validSignature = calculateHmac(canonicalPayload, SECRET_KEY);

        when(merchantSecretService.getSecretKeyByMerchantId(MERCHANT_ID)).thenReturn(Optional.of(SECRET_KEY));

        MockHttpServletRequest request = new MockHttpServletRequest("POST", ENDPOINT);
        request.setContent(body.getBytes(StandardCharsets.UTF_8));
        request.addHeader(MerchantApiAuthFilter.HEADER_MERCHANT_ID, MERCHANT_ID);
        request.addHeader(MerchantApiAuthFilter.HEADER_TIMESTAMP, String.valueOf(currentEpoch));
        request.addHeader(MerchantApiAuthFilter.HEADER_SIGNATURE, validSignature);

        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, filterChain);

        assertThat(response.getStatus()).isEqualTo(HttpServletResponse.SC_OK);
        verify(filterChain, times(1)).doFilter(any(CachedBodyHttpServletRequest.class), eq(response));

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        assertThat(auth).isNotNull();
        assertThat(auth.getName()).isEqualTo(MERCHANT_ID);
        assertThat(auth.getAuthorities()).anyMatch(a -> a.getAuthority().equals("ROLE_MERCHANT_GATEWAY"));
    }
}
