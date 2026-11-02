package com.corebanking.service;

import com.corebanking.dto.CusRefreshTokenRequest;
import com.corebanking.dto.CusTokenResponse;
import com.corebanking.entity.AuthSession;
import com.corebanking.entity.CustomerCredentials;
import com.corebanking.entity.Customers;
import com.corebanking.entity.enums.CustomerStatus;
import com.corebanking.entity.enums.CustomerType;
import com.corebanking.entity.enums.SessionSubjectType;
import com.corebanking.entity.enums.UpdatedByType;
import com.corebanking.exception.CusSessionExpiredException;
import com.corebanking.repository.*;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.MockedStatic;
import org.springframework.test.util.ReflectionTestUtils;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Base64;
import java.util.Date;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** Real production signing/parsing/rotation, synthetic keys, mocked persistence only. */
class CusJwtGenerationSecurityTest {
    private static final byte[] KEY = "test-only-individual-jwt-signing-key-0001".getBytes(StandardCharsets.UTF_8);
    private static final String ISSUER = "isolated-generation-test";
    private static final UUID CUSTOMER_ID = UUID.fromString("11111111-1111-4111-8111-111111111111");
    private static final String SID = "22222222-2222-4222-8222-222222222222";
    private static final long ACCESS_TTL = 300_000L;
    private static final long DAY = 86_400_000L;
    private CusJwtService jwt;

    @BeforeEach
    void syntheticJwtConfiguration() {
        jwt = new CusJwtService();
        ReflectionTestUtils.setField(jwt, "jwtSecret", Base64.getEncoder().encodeToString(KEY));
        ReflectionTestUtils.setField(jwt, "jwtIssuer", ISSUER);
        ReflectionTestUtils.setField(jwt, "accessTokenExpiration", ACCESS_TTL);
    }

    @Test
    void realAccessGenerationSignsAllClaimsAndConfiguredExpiry() {
        long before = System.currentTimeMillis();
        String token = jwt.generateAccessToken(CUSTOMER_ID, SID, 7L);
        long after = System.currentTimeMillis();
        Claims claims = jwt.getClaims(token);
        assertClaims(claims, "ACCESS", before, after);
        assertEquals(ACCESS_TTL, claims.getExpiration().getTime() - claims.getIssuedAt().getTime());
        assertTrue(claims.getExpiration().getTime() >= seconds(before + ACCESS_TTL));
        assertTrue(claims.getExpiration().getTime() <= seconds(after + ACCESS_TTL));
        assertEquals("HS256", Jwts.parserBuilder().requireIssuer(ISSUER).setSigningKey(Keys.hmacShaKeyFor(KEY))
                .build().parseClaimsJws(token).getHeader().getAlgorithm());
    }

    @Test
    void realRefreshOverloadEncodesOriginalDeadlineAndAllClaims() {
        // A session issued 23h ago still has only 1h left, not a fresh 24h.
        long before = System.currentTimeMillis();
        Date originalDeadline = new Date(seconds(before) + 3_600_000L);
        String token = jwt.generateRefreshToken(CUSTOMER_ID, SID, 7L, originalDeadline);
        long after = System.currentTimeMillis();
        Claims claims = jwt.getClaims(token);
        assertClaims(claims, "REFRESH", before, after);
        assertEquals(originalDeadline, claims.getExpiration());
        assertTrue(claims.getExpiration().getTime() <= originalDeadline.getTime());
    }

    @Test
    void realRefreshGenerationAlsoEnforcesItsOwnTwentyFourHourMaximum() {
        long before = System.currentTimeMillis();
        Date requestedDeadline = new Date(before + 2 * DAY);
        String token = jwt.generateRefreshToken(CUSTOMER_ID, SID, 7L, requestedDeadline);
        long after = System.currentTimeMillis();
        Claims claims = jwt.getClaims(token);
        assertClaims(claims, "REFRESH", before, after);
        assertEquals(DAY, claims.getExpiration().getTime() - claims.getIssuedAt().getTime());
        assertTrue(claims.getExpiration().getTime() >= seconds(before + DAY));
        assertTrue(claims.getExpiration().getTime() <= seconds(after + DAY));
        assertTrue(claims.getExpiration().before(requestedDeadline));
    }

    @ParameterizedTest
    @ValueSource(longs = {0, 999})
    void realGeneratedRefreshHonorsNearDeadlineAndJwtSecondPrecision(long fractionalMillis) {
        Date deadline = new Date(seconds(System.currentTimeMillis()) + 30_000 + fractionalMillis);
        String token = jwt.generateRefreshToken(CUSTOMER_ID, SID, 7L, deadline);
        Claims claims = parseAt(token, new Date(seconds(deadline.getTime()) - 1));
        assertEquals(seconds(deadline.getTime()), claims.getExpiration().getTime());
        assertTrue(claims.getExpiration().getTime() <= deadline.getTime());
        assertThrows(ExpiredJwtException.class, () -> parseAt(token,
                new Date(claims.getExpiration().getTime() + 1)));
    }

    @Test
    void alreadyElapsedAbsoluteExpiryCannotProduceAnAcceptedRefreshJwt() {
        Date deadline = new Date(1_000L);
        String token = jwt.generateRefreshToken(CUSTOMER_ID, SID, 7L, deadline);
        ExpiredJwtException expired = assertThrows(ExpiredJwtException.class, () -> jwt.getClaims(token));
        assertEquals(deadline, expired.getClaims().getExpiration());
    }

    @Test
    void realGenerationRejectsMissingAbsoluteDeadline() {
        assertThrows(IllegalArgumentException.class,
                () -> jwt.generateRefreshToken(CUSTOMER_ID, SID, 7L, null));
    }

    @Test
    void realRefreshRotationSignsNewTokensWithoutExtendingOriginalSessionDeadline() {
        CusAuthSessionsRepository sessions = mock(CusAuthSessionsRepository.class);
        CusCredentialsRepository credentials = mock(CusCredentialsRepository.class);
        CusAuditLogsRepository audit = mock(CusAuditLogsRepository.class);
        CusCorporateCredentialRepository corporate = mock(CusCorporateCredentialRepository.class);
        CusSessionService validator = new CusSessionService(sessions, credentials, audit, corporate);
        CusCustomerSessionService rotation = new CusCustomerSessionService(credentials, sessions, jwt, validator,
                mock(CusJwtRevokedTokensRepository.class), audit);
        LocalDateTime start = LocalDateTime.now().withNano(0);
        LocalDateTime issued = start.minusHours(23);
        LocalDateTime deadline = issued.plusHours(24);
        Date deadlineDate = Date.from(deadline.atZone(ZoneId.systemDefault()).toInstant());
        Customers customer = Customers.builder().customerId(CUSTOMER_ID).customerType(CustomerType.PERSONAL)
                .status(CustomerStatus.ACTIVE).build();
        CustomerCredentials credential = CustomerCredentials.builder().customerId(CUSTOMER_ID)
                .customer(customer).tokenVersion(7L).build();
        String token = jwt.generateRefreshToken(CUSTOMER_ID, SID, 7L, deadlineDate);
        AuthSession session = AuthSession.builder().sessionUuid(SID).customer(customer)
                .subjectType(SessionSubjectType.CUSTOMER).tokenVersionAtIssue(7L).issuedAt(issued)
                // An overlong legacy stored expiry must also be clamped by orchestration.
                .refreshExpiresAt(deadline.plusDays(1)).lastSeenAt(start).idleTimeoutMinutes(5)
                .refreshTokenHash(validator.hashRefreshToken(token)).build();
        when(sessions.findBySessionUuid(SID)).thenReturn(Optional.of(session));
        when(credentials.findById(CUSTOMER_ID)).thenReturn(Optional.of(credential));
        when(sessions.rotateRefreshTokenIfMatch(eq(SID), anyString(), anyString(), any(), any(),
                eq(UpdatedByType.CUSTOMER), eq(CUSTOMER_ID))).thenAnswer(call -> {
            assertEquals(session.getRefreshTokenHash(), call.getArgument(1));
            assertEquals(deadline, call.getArgument(3));
            session.setRefreshTokenHash(call.getArgument(2));
            session.setRefreshExpiresAt(call.getArgument(3));
            session.setLastSeenAt(call.getArgument(4));
            return 1;
        });
        AtomicReference<LocalDateTime> now = new AtomicReference<>(start);
        // Signing uses the real wall clock; bound iat assertions around each call.
        // Only the service/session clock advances; no sleeping or real session writes.
        try (MockedStatic<LocalDateTime> time = mockStatic(LocalDateTime.class, CALLS_REAL_METHODS)) {
            time.when(LocalDateTime::now).thenAnswer(call -> now.get());
            for (int attempt = 0; attempt < 3; attempt++) {
                long before = System.currentTimeMillis();
                CusTokenResponse response = rotation.refreshToken(request(token));
                long after = System.currentTimeMillis();
                assertTrue(response.isSuccess());
                Claims access = jwt.getClaims(response.getAccessToken());
                Claims refresh = jwt.getClaims(response.getRefreshToken());
                assertClaims(access, "ACCESS", before, after);
                assertClaims(refresh, "REFRESH", before, after);
                assertEquals(deadlineDate, refresh.getExpiration());
                assertEquals(issued, session.getIssuedAt());
                assertEquals(deadline, session.getRefreshExpiresAt());
                assertNotEquals(token, response.getRefreshToken());
                token = response.getRefreshToken();
                now.set(now.get().plusMinutes(1));
            }
            // Still-valid JWT, but original session has reached exactly 24h.
            now.set(deadline);
            session.setLastSeenAt(deadline.minusSeconds(1));
            String latestToken = token;
            assertThrows(CusSessionExpiredException.class, () -> rotation.refreshToken(request(latestToken)));
            verify(sessions, times(3)).rotateRefreshTokenIfMatch(eq(SID), anyString(), anyString(),
                    eq(deadline), any(), eq(UpdatedByType.CUSTOMER), eq(CUSTOMER_ID));
        }
        verifyNoInteractions(corporate);
    }

    private Claims parseAt(String token, Date time) {
        return Jwts.parserBuilder().requireIssuer(ISSUER).setSigningKey(Keys.hmacShaKeyFor(KEY))
                .setClock(() -> time).build().parseClaimsJws(token).getBody();
    }

    private void assertClaims(Claims claims, String type, long before, long after) {
        assertEquals(CUSTOMER_ID.toString(), claims.getSubject());
        assertEquals("CUSTOMER", claims.get("subjectType"));
        assertEquals(type, claims.get("tokenType"));
        assertEquals(SID, claims.get("sid"));
        assertEquals(7L, ((Number) claims.get("tokenVersion")).longValue());
        assertEquals(ISSUER, claims.getIssuer());
        assertDoesNotThrow(() -> UUID.fromString(claims.getId()));
        assertTrue(claims.getIssuedAt().getTime() >= seconds(before));
        assertTrue(claims.getIssuedAt().getTime() <= seconds(after));
        assertNotNull(claims.getExpiration());
    }

    private long seconds(long millis) { return millis / 1000 * 1000; }

    private CusRefreshTokenRequest request(String token) {
        CusRefreshTokenRequest request = new CusRefreshTokenRequest();
        request.setRefreshToken(token);
        return request;
    }
}
