package com.corebanking.service;

import com.corebanking.dto.CusRefreshTokenRequest;
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
import io.jsonwebtoken.JwtParserBuilder;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.MockedStatic;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Base64;
import java.util.Date;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * No Spring context or database connections. Real Individual validation and
 * refresh orchestration use mocked repositories and a controlled static clock.
 * Repository updates below mutate synthetic in-memory fixtures only; these tests
 * do not establish JPQL execution, transaction isolation, or HTTP filter wiring.
 */
class CusAbsoluteSessionExpirationTest {
    private static final LocalDateTime ISSUED = LocalDateTime.of(2030, 1, 1, 10, 0);
    private static final LocalDateTime DEADLINE = ISSUED.plusHours(24);
    private static final UUID CUSTOMER_ID = UUID.fromString("11111111-1111-4111-8111-111111111111");
    private static final String SID = "22222222-2222-4222-8222-222222222222";
    // Synthetic test-only signing material; no application configuration is read.
    private static final byte[] TEST_KEY = new byte[32];

    private final AtomicReference<LocalDateTime> now = new AtomicReference<>(ISSUED);
    private MockedStatic<LocalDateTime> clock;
    private CusAuthSessionsRepository sessions;
    private CusCredentialsRepository credentials;
    private CusCorporateCredentialRepository corporate;
    private CusAuditLogsRepository audit;
    private CusJwtService jwt;
    private CusSessionService validator;
    private CusCustomerSessionService rotation;
    private AuthSession session;

    @BeforeEach
    void isolatedFixtures() {
        sessions = mock(CusAuthSessionsRepository.class);
        credentials = mock(CusCredentialsRepository.class);
        corporate = mock(CusCorporateCredentialRepository.class);
        audit = mock(CusAuditLogsRepository.class);
        jwt = mock(CusJwtService.class);
        validator = new CusSessionService(sessions, credentials, audit, corporate);
        rotation = new CusCustomerSessionService(credentials, sessions, jwt, validator,
                mock(CusJwtRevokedTokensRepository.class), audit);
        Customers customer = Customers.builder().customerId(CUSTOMER_ID)
                .customerType(CustomerType.PERSONAL).status(CustomerStatus.ACTIVE).build();
        session = AuthSession.builder().sessionUuid(SID).customer(customer)
                .subjectType(SessionSubjectType.CUSTOMER).tokenVersionAtIssue(7L)
                .issuedAt(ISSUED).refreshExpiresAt(DEADLINE).lastSeenAt(ISSUED)
                .idleTimeoutMinutes(5).refreshTokenHash(validator.hashRefreshToken("fixture-refresh-0")).build();
        when(sessions.findBySessionUuid(SID)).thenAnswer(call -> Optional.of(session));
        when(credentials.findById(CUSTOMER_ID)).thenReturn(Optional.of(
                CustomerCredentials.builder().customerId(CUSTOMER_ID).customer(customer).tokenVersion(7L).build()));
        CusSessionActivityTestSupport.wire(validator, sessions, () -> session);
        when(sessions.revokeIfActive(eq(SID), anyString(), any(), any(), any(), any())).thenReturn(1);
        clock = mockStatic(LocalDateTime.class, CALLS_REAL_METHODS);
        clock.when(LocalDateTime::now).thenAnswer(call -> now.get());
    }

    @AfterEach
    void closeClock() {
        try {
            verifyNoInteractions(corporate);
        } finally {
            if (clock != null) clock.close();
        }
    }

    @ParameterizedTest(name = "{0}: elapsed={1}s allowed={2}")
    @CsvSource({
            "ACCESS,86399,true", "REFRESH,86399,true",
            "ACCESS,86400,false", "REFRESH,86400,false",
            "ACCESS,86401,false", "REFRESH,86401,false"
    })
    void aBcfAbsoluteBoundaryWithRecentActivity(String path, long elapsed, boolean allowed) {
        now.set(ISSUED.plusSeconds(elapsed));
        session.setLastSeenAt(now.get().minusSeconds(1));
        // Deliberately later than issuedAt+24h to prove the absolute check itself.
        session.setRefreshExpiresAt(DEADLINE.plusDays(1));
        if (allowed) {
            assertSame(session, validate(path));
            verify(sessions, never()).revokeIfActive(anyString(), anyString(), any(), any(), any(), any());
        } else {
            assertThrows(CusSessionExpiredException.class, () -> validate(path));
            assertRevoked("SESSION_EXPIRED");
            verify(sessions, never()).save(any());
        }
        assertEquals(ISSUED, session.getIssuedAt());
    }

    @Test
    void dKeepAliveEveryMinuteDoesNotExtendOriginalDeadline() {
        for (int minute = 1; minute < 24 * 60; minute++) {
            now.set(ISSUED.plusMinutes(minute));
            // This is the real validator invoked by protected keep-alive requests.
            assertSame(session, validator.validateAccessSession(claims("ACCESS")));
            assertEquals(now.get(), session.getLastSeenAt());
            assertEquals(ISSUED, session.getIssuedAt());
            assertEquals(DEADLINE, session.getRefreshExpiresAt());
        }
        now.set(DEADLINE.minusSeconds(1));
        validator.validateAccessSession(claims("ACCESS"));
        now.set(DEADLINE);
        assertThrows(CusSessionExpiredException.class, () -> validator.validateAccessSession(claims("ACCESS")));
        assertRevoked("SESSION_EXPIRED");
    }

    @Test
    void eRepeatedRefreshRotationCannotExtendDeadlineAndFRejectsRefreshAfterIt() {
        configureRotation();
        String token = "fixture-refresh-0";
        for (int minute = 4; minute < 24 * 60; minute += 4) {
            now.set(ISSUED.plusMinutes(minute));
            token = rotation.refreshToken(request(token)).getRefreshToken();
            assertEquals(ISSUED, session.getIssuedAt());
            assertEquals(DEADLINE, session.getRefreshExpiresAt());
        }
        now.set(DEADLINE.minusSeconds(1));
        token = rotation.refreshToken(request(token)).getRefreshToken();
        assertEquals(DEADLINE, session.getRefreshExpiresAt());
        now.set(DEADLINE.plusSeconds(1));
        session.setLastSeenAt(DEADLINE); // Excludes idle expiry as the cause.
        String lastToken = token;
        assertThrows(CusSessionExpiredException.class, () -> rotation.refreshToken(request(lastToken)));
        assertRevoked("SESSION_EXPIRED");
        verify(sessions, times(360)).rotateRefreshTokenIfMatch(eq(SID), anyString(), anyString(),
                eq(DEADLINE), any(), eq(UpdatedByType.CUSTOMER), eq(CUSTOMER_ID));
        assertEquals(ISSUED, session.getIssuedAt());
    }

    @Test
    void refreshOrchestrationCapsLegacyLaterStoredExpiryAtOriginalDeadline() {
        configureRotation();
        now.set(DEADLINE.minusSeconds(1));
        session.setLastSeenAt(now.get().minusSeconds(1));
        session.setRefreshExpiresAt(DEADLINE.plusDays(2));
        rotation.refreshToken(request("fixture-refresh-0"));
        assertEquals(DEADLINE, session.getRefreshExpiresAt());
        verify(jwt).generateRefreshToken(CUSTOMER_ID, SID, 7L, date(DEADLINE));
    }

    @ParameterizedTest
    @CsvSource({"ACCESS,300", "REFRESH,300", "ACCESS,301", "REFRESH,301"})
    void gFiveMinuteIdleDeadlineExpiresWellBeforeAbsoluteDeadline(String path, long idleSeconds) {
        now.set(ISSUED.plusHours(1));
        session.setLastSeenAt(now.get().minusSeconds(idleSeconds));
        assertThrows(CusSessionExpiredException.class, () -> validate(path));
        assertRevoked("IDLE_TIMEOUT");
        assertEquals(DEADLINE, session.getRefreshExpiresAt());
    }

    @Test
    void jwtExpiryCalculationIsCappedWithDeterministicTimestamps() {
        CusJwtService realJwt = new CusJwtService();
        for (int hour : new int[]{0, 1, 12, 23}) {
            Date expiry = ReflectionTestUtils.invokeMethod(realJwt, "refreshExpiry", date(ISSUED.plusHours(hour)), date(DEADLINE));
            assertEquals(date(DEADLINE), expiry);
        }
        assertEquals(date(ISSUED.plusHours(20)), ReflectionTestUtils.invokeMethod(realJwt,
                "refreshExpiry", date(ISSUED.plusHours(19)), date(ISSUED.plusHours(20))));
    }

    @Test
    void fRealJwtParserRejectsSignedRefreshAfterAbsoluteExpiryWithControlledClock() {
        CusJwtService realJwt = new CusJwtService();
        ReflectionTestUtils.setField(realJwt, "jwtSecret", Base64.getEncoder().encodeToString(TEST_KEY));
        ReflectionTestUtils.setField(realJwt, "jwtIssuer", "isolated-session-test");
        String signed = Jwts.builder().setSubject(CUSTOMER_ID.toString()).setIssuer("isolated-session-test")
                .claim("sid", SID).claim("subjectType", "CUSTOMER").claim("tokenType", "REFRESH")
                .claim("tokenVersion", 7L).setIssuedAt(date(ISSUED)).setExpiration(date(DEADLINE))
                .signWith(Keys.hmacShaKeyFor(TEST_KEY), SignatureAlgorithm.HS256).compact();
        try (MockedStatic<Jwts> factory = mockStatic(Jwts.class, CALLS_REAL_METHODS)) {
            // Preserve the real signature/issuer/expiry parser; change its clock only.
            factory.when(Jwts::parserBuilder).thenAnswer(call -> {
                JwtParserBuilder builder = (JwtParserBuilder) call.callRealMethod();
                return builder.setClock(() -> date(now.get()));
            });
            now.set(DEADLINE.minusSeconds(1));
            assertEquals("REFRESH", realJwt.getClaims(signed).get("tokenType"));
            now.set(DEADLINE.plusSeconds(1));
            assertThrows(ExpiredJwtException.class, () -> realJwt.getClaims(signed));
        }
    }

    private void configureRotation() {
        AtomicInteger counter = new AtomicInteger();
        when(jwt.getClaims(anyString())).thenAnswer(call -> claims("REFRESH"));
        when(jwt.generateAccessToken(CUSTOMER_ID, SID, 7L)).thenReturn("fixture-access");
        when(jwt.generateRefreshToken(eq(CUSTOMER_ID), eq(SID), eq(7L), any(Date.class)))
                .thenAnswer(call -> {
                    assertEquals(date(DEADLINE), call.getArgument(3));
                    return "fixture-refresh-" + counter.incrementAndGet();
                });
        when(sessions.rotateRefreshTokenIfMatch(eq(SID), anyString(), anyString(), any(), any(),
                eq(UpdatedByType.CUSTOMER), eq(CUSTOMER_ID))).thenAnswer(call -> {
            assertEquals(session.getRefreshTokenHash(), call.getArgument(1));
            session.setRefreshTokenHash(call.getArgument(2));
            session.setRefreshExpiresAt(call.getArgument(3));
            session.setLastSeenAt(call.getArgument(4));
            return 1;
        });
    }

    private AuthSession validate(String path) {
        return path.equals("ACCESS") ? validator.validateAccessSession(claims("ACCESS"))
                : validator.validateRefreshSession(claims("REFRESH"), "fixture-refresh-0");
    }

    private Claims claims(String type) {
        Claims claims = Jwts.claims();
        claims.setSubject(CUSTOMER_ID.toString());
        claims.put("sid", SID);
        claims.put("subjectType", "CUSTOMER");
        claims.put("tokenType", type);
        claims.put("tokenVersion", 7L);
        return claims;
    }

    private void assertRevoked(String reason) {
        verify(sessions).revokeIfActive(eq(SID), eq(reason), eq(now.get()), any(), any(), eq(now.get()));
    }

    private CusRefreshTokenRequest request(String token) {
        CusRefreshTokenRequest request = new CusRefreshTokenRequest();
        request.setRefreshToken(token);
        return request;
    }

    private Date date(LocalDateTime value) {
        return Date.from(value.atZone(ZoneId.systemDefault()).toInstant());
    }
}
