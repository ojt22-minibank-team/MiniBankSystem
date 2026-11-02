package com.corebanking.controller;

import com.corebanking.dto.CusRefreshTokenRequest;
import com.corebanking.dto.CusSessionClientMetadata;
import com.corebanking.dto.CusTokenResponse;
import com.corebanking.entity.*;
import com.corebanking.entity.enums.*;
import com.corebanking.exception.CusAuthenticationException;
import com.corebanking.exception.GlobalExceptionHandler;
import com.corebanking.repository.*;
import com.corebanking.service.*;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.IncorrectClaimException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.MissingClaimException;
import io.jsonwebtoken.PrematureJwtException;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.UnsupportedJwtException;
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.security.SignatureException;
import io.jsonwebtoken.security.WeakKeyException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.EnumSource;
import org.mockito.ArgumentCaptor;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import tools.jackson.databind.ObjectMapper;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Refresh error regression: client parsing failures must be safe HTTP 401 errors,
 * while server signing-key failures remain HTTP 500 errors.
 * Corporate missing-issuer, future-nbf and unsigned-token cases characterize
 * the remaining undesired HTTP 500/message exposure; Individual cases require 401.
 * Real controllers, facades, session validators and JWT parser; only repositories
 * and unrelated facade collaborators are mocked. No Boot context, filters,
 * transaction proxies, database, application secrets, SMTP or external services.
 * HTTP results exercise the explicitly selected existing GlobalExceptionHandler;
 * they do not establish full-application advice ordering or deployed behavior.
 */
class CusRefreshTokenErrorRegressionTest {
    private static final String ISSUER = "cus-refresh-regression.example.test";
    private static final String SUBJECT = "11111111-1111-4111-8111-111111111111";
    private static final String SID = "22222222-2222-4222-8222-222222222222";
    // Public synthetic fixture keys, never application configuration or credentials.
    private static final byte[] KEY = "cus-test-signing-key-0123456789ABC".getBytes(StandardCharsets.US_ASCII);
    private static final byte[] OTHER_KEY = "cus-other-signing-key-0123456789AB".getBytes(StandardCharsets.US_ASCII);
    private static final ObjectMapper JSON = new ObjectMapper();

    private enum Flow {
        INDIVIDUAL("customer", "CUSTOMER"), CORPORATE("corporate", "CORPORATE_USER");
        final String route;
        final String subjectType;
        Flow(String route, String subjectType) {
            this.route = route;
            this.subjectType = subjectType;
        }
    }

    private enum Scenario {
        MALFORMED(MalformedJwtException.class, 401),
        EXPIRED(ExpiredJwtException.class, 401),
        INVALID_SIGNATURE(SignatureException.class, 401),
        WRONG_ISSUER(IncorrectClaimException.class, 401),
        MISSING_ISSUER(MissingClaimException.class, 500),
        FUTURE_NOT_BEFORE(PrematureJwtException.class, 500),
        UNSIGNED_CLAIMS_JWT(UnsupportedJwtException.class, 500),
        ACCESS_TOKEN(CusAuthenticationException.class, 401),
        OTHER_SUBJECT_TYPE(CusAuthenticationException.class, 401),
        MISSING_SESSION(CusAuthenticationException.class, 401),
        WEAK_SERVER_KEY(WeakKeyException.class, 500),
        BLANK_TOKEN(CusAuthenticationException.class, 401);

        final Class<? extends RuntimeException> exceptionType;
        final int status;
        Scenario(Class<? extends RuntimeException> exceptionType, int status) {
            this.exceptionType = exceptionType;
            this.status = status;
        }

        boolean clientParsingFailure(Flow flow) {
            return this == MALFORMED || this == EXPIRED
                    || this == INVALID_SIGNATURE || this == WRONG_ISSUER
                    || (flow == Flow.INDIVIDUAL && additionalClientParsingFailure());
        }

        boolean additionalClientParsingFailure() {
            return this == MISSING_ISSUER || this == FUTURE_NOT_BEFORE
                    || this == UNSIGNED_CLAIMS_JWT;
        }

        Class<? extends RuntimeException> serviceExceptionType(Flow flow) {
            return clientParsingFailure(flow) ? CusAuthenticationException.class : exceptionType;
        }

        int httpStatus(Flow flow) {
            return flow == Flow.INDIVIDUAL && additionalClientParsingFailure() ? 401 : status;
        }
    }

    private final List<Object> dependencies = new ArrayList<>();
    private CusJwtService jwt;
    private CusAuthService individual;
    private CusCorporateAuthService corporate;
    private CusCustomerSessionService customerSessions;
    private CusCorporateSessionService corporateSessions;
    private CusCorporateFirstLoginService firstLogin;
    private CusAuthSessionsRepository sessions;
    private CusCredentialsRepository credentials;
    private CusCorporateCredentialRepository corporateCredentials;
    private CusAuditLogsRepository audit;
    private CusSessionService validator;

    @BeforeEach
    void setUp() {
        credentials = dependency(CusCredentialsRepository.class);
        sessions = dependency(CusAuthSessionsRepository.class);
        audit = dependency(CusAuditLogsRepository.class);
        corporateCredentials = dependency(CusCorporateCredentialRepository.class);
        var revoked = dependency(CusJwtRevokedTokensRepository.class);
        var otp = dependency(CusOtpChallengesRepository.class);
        var attempts = dependency(CusLoginAttemptsRepository.class);
        validator = spy(new CusSessionService(sessions, credentials, audit, corporateCredentials));
        var realJwt = new CusJwtService();
        ReflectionTestUtils.setField(realJwt, "jwtSecret", Base64.getEncoder().encodeToString(KEY));
        ReflectionTestUtils.setField(realJwt, "jwtIssuer", ISSUER);
        ReflectionTestUtils.setField(realJwt, "accessTokenExpiration", 900_000L);
        jwt = spy(realJwt);
        customerSessions = new CusCustomerSessionService(credentials, sessions, jwt, validator, revoked, audit);
        corporateSessions = new CusCorporateSessionService(validator, jwt, otp, corporateCredentials,
                sessions, attempts, audit, revoked, dependency(CusCorporateSessionActivityRepository.class));
        individual = new CusAuthService(dependency(CusCustomerRepository.class),
                dependency(CusAccountsRepository.class), credentials,
                dependency(CusCustomerLoginAttemptService.class), otp, dependency(PasswordEncoder.class),
                sessions, jwt, validator, revoked, dependency(CusEmailService.class), audit,
                dependency(CusCustomerPasswordResetService.class), dependency(CusCustomerPinResetService.class),
                customerSessions, dependency(CusCustomerSessionIssuanceService.class));
        corporate = new CusCorporateAuthService(dependency(CusCorporateCredentialService.class),
                dependency(CusCorporateOtpService.class), corporateSessions, corporateCredentials);
        firstLogin = dependency(CusCorporateFirstLoginService.class);
    }

    static Stream<Arguments> cases() {
        return Stream.of(Flow.values()).flatMap(flow -> Stream.of(Scenario.values())
                .map(scenario -> Arguments.of(flow, scenario)));
    }

    @ParameterizedTest(name = "{0}: {1} service exception")
    @MethodSource("cases")
    void realSessionServiceRejectsWithoutIssuanceOrPersistence(Flow flow, Scenario scenario) {
        String token = token(flow, scenario);
        var request = request(token);
        var failure = assertThrowsExactly(scenario.serviceExceptionType(flow), () -> refreshService(flow, request));
        if (scenario.clientParsingFailure(flow)) {
            assertEquals("Invalid or expired refresh token.", failure.getMessage());
        }
        assertAdditionalParsingDetails(flow, scenario, failure);
        assertOnlyExpectedReads(scenario, token);
    }

    @ParameterizedTest(name = "{0}: {1} HTTP {arguments}")
    @MethodSource("cases")
    void realControllerFacadeAndParserExposeCurrentHttpClassification(Flow flow, Scenario scenario) throws Exception {
        String token = token(flow, scenario);
        Object controller = flow == Flow.INDIVIDUAL
                ? new CusAuthController(individual)
                : new CusCorporateAuthController(corporate, firstLogin);
        var mvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler()).build();
        int expectedStatus = scenario.httpStatus(flow);
        var result = mvc.perform(post("/api/" + flow.route + "/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(JSON.writeValueAsBytes(Map.of("refreshToken", token))))
                .andExpect(status().is(expectedStatus))
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.status").value(expectedStatus))
                .andExpect(jsonPath("$.code").value(expectedStatus == 500
                        ? "INTERNAL_SERVER_ERROR" : "UNAUTHORIZED"))
                .andExpect(jsonPath("$.timestamp").isNotEmpty())
                .andExpect(jsonPath("$.message").isNotEmpty())
                .andExpect(jsonPath("$.accessToken").doesNotExist())
                .andExpect(jsonPath("$.refreshToken").doesNotExist())
                .andReturn();
        Exception resolved = result.getResolvedException();
        assertNotNull(resolved);
        assertEquals(scenario.serviceExceptionType(flow), resolved.getClass());
        var body = JSON.readTree(result.getResponse().getContentAsByteArray());
        assertEquals(4, body.size(), "Only the existing error envelope must be returned");
        assertEquals(scenario.clientParsingFailure(flow) ? "Invalid or expired refresh token." : resolved.getMessage(),
                body.get("message").asText(), "Verify translated messages or characterize remaining raw-message exposure");
        assertAdditionalParsingDetails(flow, scenario, resolved);
        if (flow == Flow.CORPORATE && scenario.additionalClientParsingFailure()) {
            assertNotEquals("Invalid or expired refresh token.", body.get("message").asText(),
                    "Current unhandled cases expose parser details instead of a safe credential error");
        }
        assertOnlyExpectedReads(scenario, token);
    }

    @ParameterizedTest(name = "{0}: successful service refresh")
    @EnumSource(Flow.class)
    void validRefreshStillValidatesSessionAndRotatesTokens(Flow flow) {
        String oldToken = token(flow, Scenario.MISSING_SESSION);
        LocalDateTime deadline = prepareValidSession(flow, oldToken);
        CusTokenResponse response = refreshService(flow, request(oldToken));
        assertTrue(response.isSuccess());
        assertEquals("Token refreshed successfully.", response.getMessage());
        assertSuccessfulRotation(flow, oldToken, response.getAccessToken(), response.getRefreshToken(), deadline);
    }

    @ParameterizedTest(name = "{0}: successful HTTP refresh")
    @EnumSource(Flow.class)
    void validRefreshStillReturnsSignedTokensThroughRealFacade(Flow flow) throws Exception {
        String oldToken = token(flow, Scenario.MISSING_SESSION);
        LocalDateTime deadline = prepareValidSession(flow, oldToken);
        Object controller = flow == Flow.INDIVIDUAL
                ? new CusAuthController(individual) : new CusCorporateAuthController(corporate, firstLogin);
        var mvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler()).build();
        var result = mvc.perform(post("/api/" + flow.route + "/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(JSON.writeValueAsBytes(Map.of("refreshToken", oldToken))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Token refreshed successfully."))
                .andReturn();
        assertNull(result.getResolvedException());
        var body = JSON.readTree(result.getResponse().getContentAsByteArray());
        assertEquals(4, body.size());
        assertSuccessfulRotation(flow, oldToken, body.get("accessToken").asText(),
                body.get("refreshToken").asText(), deadline);
    }

    private LocalDateTime prepareValidSession(Flow flow, String oldToken) {
        UUID id = UUID.fromString(SUBJECT);
        LocalDateTime now = LocalDateTime.now().withNano(0);
        LocalDateTime deadline = now.plusHours(1);
        var session = AuthSession.builder().sessionUuid(SID).tokenVersionAtIssue(7L)
                .issuedAt(now.minusHours(1)).lastSeenAt(now).refreshExpiresAt(deadline)
                .idleTimeoutMinutes(5).refreshTokenHash(validator.hashRefreshToken(oldToken));
        if (flow == Flow.INDIVIDUAL) {
            var customer = Customers.builder().customerId(id).status(CustomerStatus.ACTIVE)
                    .customerType(CustomerType.PERSONAL).build();
            session.subjectType(SessionSubjectType.CUSTOMER).customer(customer);
            when(credentials.findById(id)).thenReturn(Optional.of(CustomerCredentials.builder()
                    .customerId(id).customer(customer).tokenVersion(7L).build()));
        } else {
            var company = Customers.builder().customerId(UUID.fromString(SID))
                    .status(CustomerStatus.ACTIVE).customerType(CustomerType.COMPANY).build();
            var user = CorporateUser.builder().corporateUserId(id).status(CorporateUserStatus.ACTIVE)
                    .companyInfo(CompanyInfo.builder().customer(company).build()).build();
            session.subjectType(SessionSubjectType.CORPORATE_USER).corporateUser(user);
            when(corporateCredentials.findById(id)).thenReturn(Optional.of(CorporateCredential.builder()
                    .corporateUserId(id).corporateUser(user).tokenVersion(7L).build()));
        }
        when(sessions.findBySessionUuid(SID)).thenReturn(Optional.of(session.build()));
        String oldHash = validator.hashRefreshToken(oldToken);
        when(sessions.rotateRefreshTokenIfMatch(eq(SID), eq(oldHash),
                anyString(), eq(deadline), any(LocalDateTime.class), any(UpdatedByType.class), eq(id)))
                .thenReturn(1);
        return deadline;
    }

    private void assertSuccessfulRotation(Flow flow, String oldToken, String accessToken,
            String refreshToken, LocalDateTime deadline) {
        assertNotEquals(oldToken, refreshToken);
        assertNotEquals(accessToken, refreshToken);
        var access = jwt.getClaims(accessToken);
        var refresh = jwt.getClaims(refreshToken);
        for (var claims : List.of(access, refresh)) {
            assertEquals(SUBJECT, claims.getSubject());
            assertEquals(SID, claims.get("sid", String.class));
            assertEquals(flow.subjectType, claims.get("subjectType", String.class));
            assertEquals(7L, ((Number) claims.get("tokenVersion")).longValue());
            assertNotNull(claims.getId());
        }
        assertEquals("ACCESS", access.get("tokenType", String.class));
        assertEquals("REFRESH", refresh.get("tokenType", String.class));
        assertEquals(Date.from(deadline.atZone(ZoneId.systemDefault()).toInstant()), refresh.getExpiration());
        var actor = flow == Flow.INDIVIDUAL ? UpdatedByType.CUSTOMER : UpdatedByType.CORPORATE_USER;
        String oldHash = validator.hashRefreshToken(oldToken);
        String newHash = validator.hashRefreshToken(refreshToken);
        verify(sessions).findBySessionUuid(SID);
        verify(sessions).rotateRefreshTokenIfMatch(eq(SID), eq(oldHash),
                eq(newHash), eq(deadline), any(LocalDateTime.class),
                eq(actor), eq(UUID.fromString(SUBJECT)));
        var saved = ArgumentCaptor.forClass(AuditLogs.class);
        verify(audit).save(saved.capture());
        assertEquals("TOKEN_REFRESHED", saved.getValue().getActionType());
        assertEquals(SID, saved.getValue().getEntityId());
        if (flow == Flow.INDIVIDUAL) {
            verify(credentials, times(2)).findById(UUID.fromString(SUBJECT));
        } else {
            verify(corporateCredentials, times(2)).findById(UUID.fromString(SUBJECT));
        }
        // No session creation, revocation, credential mutation or extra persistence.
        verifyNoMoreInteractions(dependencies.toArray());
    }

    private CusTokenResponse refreshService(Flow flow, CusRefreshTokenRequest request) {
        return flow == Flow.INDIVIDUAL
                ? customerSessions.refreshToken(request, CusSessionClientMetadata.EMPTY)
                : corporateSessions.refreshToken(request, CusSessionClientMetadata.EMPTY);
    }

    private void assertOnlyExpectedReads(Scenario scenario, String token) {
        if (scenario != Scenario.BLANK_TOKEN) {
            verify(jwt).getClaims(token);
        }
        // All rejection paths must stop before token generation/rotation or audit writes.
        verifyNoMoreInteractions(jwt);
        if (scenario.additionalClientParsingFailure()) {
            verifyNoInteractions(validator);
        }
        if (scenario == Scenario.MISSING_SESSION) {
            verify(sessions).findBySessionUuid(SID);
        }
        verifyNoMoreInteractions(dependencies.toArray());
    }

    private static void assertAdditionalParsingDetails(Flow flow, Scenario scenario, Exception failure) {
        if (flow == Flow.INDIVIDUAL && scenario.additionalClientParsingFailure()) {
            assertEquals("Invalid or expired refresh token.", failure.getMessage());
            return;
        }
        switch (scenario) {
            case MISSING_ISSUER -> {
                var missing = assertInstanceOf(MissingClaimException.class, failure);
                assertEquals("iss", missing.getClaimName());
                assertEquals(ISSUER, missing.getClaimValue());
                assertTrue(missing.getMessage().contains("iss"));
            }
            case FUTURE_NOT_BEFORE -> {
                var premature = assertInstanceOf(PrematureJwtException.class, failure);
                assertEquals(new Date(4070908800000L), premature.getClaims().getNotBefore());
                assertTrue(premature.getMessage().contains("JWT must not be accepted before"));
            }
            case UNSIGNED_CLAIMS_JWT -> assertEquals("Unsigned Claims JWTs are not supported.", failure.getMessage());
            default -> { }
        }
    }

    private String token(Flow flow, Scenario scenario) {
        if (scenario == Scenario.BLANK_TOKEN) {
            return "   ";
        }
        if (scenario == Scenario.MALFORMED) {
            return "synthetic-not-a-jwt";
        }
        if (scenario == Scenario.WEAK_SERVER_KEY) {
            ReflectionTestUtils.setField(jwt, "jwtSecret", Base64.getEncoder()
                    .encodeToString("weak-test-key".getBytes(StandardCharsets.US_ASCII)));
        }
        String subjectType = scenario == Scenario.OTHER_SUBJECT_TYPE
                ? (flow == Flow.INDIVIDUAL ? "CORPORATE_USER" : "CUSTOMER") : flow.subjectType;
        // Wide fixed dates avoid sleeps, expiry-boundary races and persisted test data.
        Date issued = new Date(946684800000L); // 2000-01-01
        Date expires = new Date(scenario == Scenario.EXPIRED ? 978307200000L : 4102444800000L);
        var builder = Jwts.builder().setIssuer(scenario == Scenario.MISSING_ISSUER
                        ? null : scenario == Scenario.WRONG_ISSUER ? "other.example.test" : ISSUER)
                .setSubject(SUBJECT).setId("synthetic-refresh-jti").setIssuedAt(issued).setExpiration(expires)
                .claim("sid", SID).claim("subjectType", subjectType).claim("tokenVersion", 7L)
                .claim("tokenType", scenario == Scenario.ACCESS_TOKEN ? "ACCESS" : "REFRESH");
        if (scenario == Scenario.FUTURE_NOT_BEFORE) {
            builder.setNotBefore(new Date(4070908800000L)); // 2099-01-01, before expiry
        }
        if (scenario != Scenario.UNSIGNED_CLAIMS_JWT) {
            builder.signWith(Keys.hmacShaKeyFor(scenario == Scenario.INVALID_SIGNATURE ? OTHER_KEY : KEY),
                    SignatureAlgorithm.HS256);
        }
        return builder.compact();
    }

    private static CusRefreshTokenRequest request(String token) {
        var request = new CusRefreshTokenRequest();
        request.setRefreshToken(token);
        return request;
    }

    private <T> T dependency(Class<T> type) {
        T mock = mock(type);
        dependencies.add(mock);
        return mock;
    }
}
