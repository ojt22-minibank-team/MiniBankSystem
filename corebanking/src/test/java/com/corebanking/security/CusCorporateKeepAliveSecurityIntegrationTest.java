package com.corebanking.security;

import com.corebanking.config.CorporateSecurityConfig;
import com.corebanking.controller.CusCorporateAuthController;
import com.corebanking.entity.AuthSession;
import com.corebanking.entity.CorporateCredential;
import com.corebanking.entity.CorporateUser;
import com.corebanking.entity.CompanyInfo;
import com.corebanking.entity.enums.CorporateRole;
import com.corebanking.entity.enums.CorporateUserStatus;
import com.corebanking.service.CusCorporateFirstLoginService;
import com.corebanking.service.CusCorporateSessionService;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import com.corebanking.entity.Customers;
import com.corebanking.entity.enums.CustomerStatus;
import com.corebanking.entity.enums.CustomerType;
import com.corebanking.entity.enums.SessionSubjectType;
import com.corebanking.repository.*;
import com.corebanking.service.CusCorporateAuthService;
import com.corebanking.service.CusJwtService;
import com.corebanking.service.CusSessionService;
import jakarta.servlet.Filter;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.MockedStatic;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.core.env.MapPropertySource;
import org.springframework.mock.web.MockServletContext;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.support.AnnotationConfigWebApplicationContext;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Actual production Corporate SecurityFilterChain + JWT filter + JWT/session
 * services + controller in Spring MVC. Only repositories and unused facades
 * are mocked. No Boot application, component scan, datasource, real database,
 * credential files, mock authenticated users, Staff or Individual security chain.
 */
class CusCorporateKeepAliveSecurityIntegrationTest {
    private static final String ENDPOINT = "/api/corporate/auth/session/keep-alive";
    private static final String ISSUER = "isolated-http-test";
    private static final byte[] KEY = "test-only-http-corporate-signing-key-00001".getBytes(StandardCharsets.UTF_8);
    private static final UUID CUSTOMER_ID = UUID.fromString("11111111-1111-4111-8111-111111111111");
    private static final String SID = "22222222-2222-4222-8222-222222222222";
    private AnnotationConfigWebApplicationContext context;
    private MockMvc mvc;
    private CusAuthSessionsRepository sessions;
    private CusCorporateCredentialRepository credentials;
    private CusJwtRevokedTokensRepository revokedTokens;
    private CusJwtService jwt;
    private AuthSession session;
    private MockedStatic<LocalDateTime> clock;
    private final AtomicReference<LocalDateTime> now = new AtomicReference<>();

    @BeforeEach
    void isolatedProductionChain() {
        context = new AnnotationConfigWebApplicationContext();
        context.setServletContext(new MockServletContext());
        // These are test-context values only; application.properties is never loaded.
        context.getEnvironment().getPropertySources().addFirst(new MapPropertySource("synthetic-jwt", Map.of(
                "jwt.secret", Base64.getEncoder().encodeToString(KEY), "jwt.issuer", ISSUER, "jwt.expiration", "300000")));
        // Register the unused facade as a ready-made mock: processing its
        // @PersistenceContext field would otherwise demand an EntityManagerFactory.
        context.addBeanFactoryPostProcessor(factory -> {
            factory.registerSingleton("unusedControllerFacade", mock(CusCorporateAuthService.class));
            factory.registerSingleton("unusedSetupFacade", mock(CusCorporateFirstLoginService.class));
            CusSessionService shared = new CusSessionService(factory.getBean(CusAuthSessionsRepository.class),
                    factory.getBean(CusCredentialsRepository.class), factory.getBean(CusAuditLogsRepository.class),
                    factory.getBean(CusCorporateCredentialRepository.class));
            factory.registerSingleton("realCorporateSessions", new CusCorporateSessionService(shared, factory.getBean(CusJwtService.class),
                    mock(CusOtpChallengesRepository.class), factory.getBean(CusCorporateCredentialRepository.class),
                    factory.getBean(CusAuthSessionsRepository.class), mock(CusLoginAttemptsRepository.class),
                    factory.getBean(CusAuditLogsRepository.class), factory.getBean(CusJwtRevokedTokensRepository.class),
                    factory.getBean(CusCorporateSessionActivityRepository.class)));
        });
        context.register(HttpTestConfiguration.class);
        context.refresh();
        assertEquals(0, context.getBeanNamesForType(javax.sql.DataSource.class).length);
        assertEquals(0, context.getBeanNamesForType(jakarta.persistence.EntityManagerFactory.class).length);
        mvc = MockMvcBuilders.webAppContextSetup(context)
                .addFilters(context.getBean("springSecurityFilterChain", Filter.class)).build();
        sessions = context.getBean(CusAuthSessionsRepository.class);
        credentials = context.getBean(CusCorporateCredentialRepository.class);
        revokedTokens = context.getBean(CusJwtRevokedTokensRepository.class);
        jwt = context.getBean(CusJwtService.class);
        now.set(LocalDateTime.now());
        Customers customer = Customers.builder().customerId(CUSTOMER_ID)
                .customerType(CustomerType.COMPANY).status(CustomerStatus.ACTIVE).build();
        session = AuthSession.builder().sessionUuid(SID).subjectType(SessionSubjectType.CORPORATE_USER)
                .corporateUser(CorporateUser.builder().corporateUserId(CUSTOMER_ID)
                        .companyInfo(CompanyInfo.builder().customer(customer).build())
                        .corporateRole(CorporateRole.CEO).status(CorporateUserStatus.ACTIVE).build()).tokenVersionAtIssue(7L).issuedAt(now.get().minusHours(1))
                .refreshExpiresAt(now.get().plusHours(23)).lastSeenAt(now.get().minusMinutes(1))
                .idleTimeoutMinutes(5).build();
        when(sessions.findBySessionUuid(SID)).thenAnswer(call -> Optional.of(session));
        when(credentials.findById(CUSTOMER_ID)).thenReturn(Optional.of(
                CorporateCredential.builder().corporateUserId(CUSTOMER_ID).tokenVersion(7L).build()));
        when(context.getBean(CusCorporateSessionActivityRepository.class).touchIfActive(eq(SID), eq(7L)))
                .thenAnswer(call -> { session.setLastSeenAt(now.get()); return 1; });
        when(sessions.revokeIfActive(eq(SID), anyString(), any(), any(), any(), any())).thenReturn(1);
        clock = mockStatic(LocalDateTime.class, CALLS_REAL_METHODS);
        clock.when(LocalDateTime::now).thenAnswer(call -> now.get());
    }

    @AfterEach
    void closeIsolatedContext() {
        try {
            if (context != null && context.isActive()) {
                verifyNoInteractions(context.getBean(CusCredentialsRepository.class), context.getBean(CusCorporateAuthService.class), context.getBean(CusCorporateFirstLoginService.class));
            }
        } finally {
            if (clock != null) clock.close();
            SecurityContextHolder.clearContext();
            if (context != null) context.close();
        }
    }

    @Test
    void validCorporateJwtReachesControllerAndUpdatesActivityThroughProductionChain() throws Exception {
        LocalDateTime issued = session.getIssuedAt();
        LocalDateTime deadline = session.getRefreshExpiresAt();
        mvc.perform(get(ENDPOINT).header("Authorization", "Bearer " + accessToken()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Corporate session is active."));
        assertEquals(now.get(), session.getLastSeenAt());
        assertEquals(issued, session.getIssuedAt());
        assertEquals(deadline, session.getRefreshExpiresAt());
        verify(context.getBean(CusCorporateSessionActivityRepository.class)).touchIfActive(SID, 7L);
        verify(sessions, never()).save(any());
        verify(revokedTokens).existsByJti(anyString());
    }

    @Test
    void missingAuthorizationIsRejectedBeforeSessionLookup() throws Exception {
        mvc.perform(get(ENDPOINT)).andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Authentication token is required."));
        verifyNoInteractions(sessions, credentials, revokedTokens);
    }

    @Test
    void realJwtSignedWithDifferentSyntheticKeyIsRejected() throws Exception {
        CusJwtService otherSigner = syntheticSigner("test-only-wrong-signing-key-000000000000", 300_000L);
        String token = otherSigner.generateCorporateAccessToken(CUSTOMER_ID, SID, 7L);
        mvc.perform(get(ENDPOINT).header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.message").value("Invalid authentication token."));
        verifyNoInteractions(sessions, credentials, revokedTokens);
    }

    @Test
    void expiredRealGeneratedAccessJwtIsRejectedBeforeSessionLookup() throws Exception {
        CusJwtService expiredSigner = syntheticSigner(new String(KEY, StandardCharsets.UTF_8), -60_000L);
        String token = expiredSigner.generateCorporateAccessToken(CUSTOMER_ID, SID, 7L);
        mvc.perform(get(ENDPOINT).header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.message").value("Access token has expired."));
        verifyNoInteractions(sessions, credentials, revokedTokens);
    }

    @Test
    void revokedCorporateSessionIsRejectedEvenWithValidSignature() throws Exception {
        session.setRevokedAt(now.get().minusSeconds(1));
        mvc.perform(get(ENDPOINT).header("Authorization", "Bearer " + accessToken()))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.message").value("Invalid authentication token."));
        verify(sessions, never()).save(any());
    }

    @ParameterizedTest
    @ValueSource(ints = {300, 301})
    void idleSessionAtOrBeyondFiveMinutesIsRejectedThroughFilter(int idleSeconds) throws Exception {
        session.setLastSeenAt(now.get().minusSeconds(idleSeconds));
        mvc.perform(get(ENDPOINT).header("Authorization", "Bearer " + accessToken()))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("SESSION_EXPIRED"))
                .andExpect(jsonPath("$.message").value("Authentication session has expired."));
        verify(sessions).revokeIfActive(eq(SID), eq("IDLE_TIMEOUT"), eq(now.get()), any(), any(), eq(now.get()));
        verify(sessions, never()).save(any());
    }

    @ParameterizedTest
    @ValueSource(ints = {86400, 86401})
    void absoluteExpiredSessionRejectsFreshAccessJwtDespiteRecentActivity(int elapsedSeconds) throws Exception {
        session.setIssuedAt(now.get().minusSeconds(elapsedSeconds));
        session.setRefreshExpiresAt(now.get().plusHours(2));
        session.setLastSeenAt(now.get().minusSeconds(1));
        mvc.perform(get(ENDPOINT).header("Authorization", "Bearer " + accessToken()))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("SESSION_EXPIRED"))
                .andExpect(jsonPath("$.message").value("Authentication session has expired."));
        verify(sessions).revokeIfActive(eq(SID), eq("SESSION_EXPIRED"), eq(now.get()), any(), any(), eq(now.get()));
        verify(sessions, never()).save(any());
    }

    @Test
    void keepAliveOneSecondBeforeDeadlineSucceedsButCannotExtendIt() throws Exception {
        session.setIssuedAt(now.get().minusHours(24).plusSeconds(1));
        LocalDateTime deadline = session.getIssuedAt().plusHours(24);
        session.setRefreshExpiresAt(deadline);
        String token = accessToken();
        mvc.perform(get(ENDPOINT).header("Authorization", "Bearer " + token)).andExpect(status().isOk());
        assertEquals(deadline, session.getRefreshExpiresAt());
        assertEquals(now.get(), session.getLastSeenAt());
        now.set(now.get().plusSeconds(1));
        mvc.perform(get(ENDPOINT).header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("SESSION_EXPIRED"));
        verify(context.getBean(CusCorporateSessionActivityRepository.class), times(1)).touchIfActive(SID, 7L);
        verify(sessions, never()).save(any());
        assertEquals(deadline, session.getRefreshExpiresAt());
    }

    @Test
    void refreshJwtCannotBeUsedAsKeepAliveAccessJwt() throws Exception {
        String token = jwt.generateCorporateRefreshToken(CUSTOMER_ID, SID, 7L,
                new java.util.Date(System.currentTimeMillis() + 60_000));
        mvc.perform(get(ENDPOINT).header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.message").value("Invalid authentication token."));
        verifyNoInteractions(sessions, credentials, revokedTokens);
    }


    @Test
    void individualJwtCannotAuthenticateCorporateEndpoint() throws Exception {
        String token = jwt.generateAccessToken(CUSTOMER_ID, SID, 7L);
        mvc.perform(get(ENDPOINT).header("Authorization", "Bearer " + token)).andExpect(status().isUnauthorized());
        verifyNoInteractions(sessions, credentials, revokedTokens);
    }

    @Test
    void makerUsesTheSameSecurityAndActivityFlowAsCeo() throws Exception {
        session.getCorporateUser().setCorporateRole(CorporateRole.MAKER);
        mvc.perform(get(ENDPOINT).header("Authorization", "Bearer " + accessToken())).andExpect(status().isOk());
        assertEquals(now.get(), session.getLastSeenAt());
        verify(context.getBean(CusCorporateSessionActivityRepository.class)).touchIfActive(SID, 7L);
        verify(sessions, never()).save(any());
    }

    @Test
    void mismatchedCredentialVersionAndRevokedJwtAreRejected() throws Exception {
        when(credentials.findById(CUSTOMER_ID)).thenReturn(Optional.of(
                CorporateCredential.builder().corporateUserId(CUSTOMER_ID).tokenVersion(8L).build()));
        mvc.perform(get(ENDPOINT).header("Authorization", "Bearer " + accessToken())).andExpect(status().isUnauthorized());
        verify(sessions, never()).save(any());
        when(revokedTokens.existsByJti(anyString())).thenReturn(true);
        mvc.perform(get(ENDPOINT).header("Authorization", "Bearer " + accessToken())).andExpect(status().isUnauthorized());
    }

    @Test
    void repeatedKeepAliveCannotMoveOriginalAbsoluteDeadline() throws Exception {
        session.setIssuedAt(now.get().minusHours(24).plusMinutes(8));
        LocalDateTime deadline = session.getIssuedAt().plusHours(24);
        session.setRefreshExpiresAt(deadline);
        String token = accessToken();
        for (int i = 0; i < 3; i++) {
            mvc.perform(get(ENDPOINT).header("Authorization", "Bearer " + token)).andExpect(status().isOk());
            assertEquals(deadline, session.getRefreshExpiresAt());
            now.set(i == 0 ? deadline.minusMinutes(4) : deadline.minusSeconds(1));
        }
        now.set(deadline);
        mvc.perform(get(ENDPOINT).header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("SESSION_EXPIRED"));
        verify(context.getBean(CusCorporateSessionActivityRepository.class), times(3)).touchIfActive(SID, 7L);
        verify(sessions, never()).save(any());
        assertEquals(deadline, session.getRefreshExpiresAt());
    }

    @Test
    void realCorporateRefreshRotationKeepsOriginalDeadlineAndFailsAtThatDeadline() {
        CusCorporateSessionService service = context.getBean(CusCorporateSessionService.class);
        session.setIssuedAt(now.get().minusHours(23));
        LocalDateTime issued = session.getIssuedAt();
        LocalDateTime deadline = issued.plusHours(24);
        session.setRefreshExpiresAt(deadline);
        java.util.Date jwtDeadline = java.util.Date.from(deadline.atZone(java.time.ZoneId.systemDefault()).toInstant());
        String original = jwt.generateCorporateRefreshToken(CUSTOMER_ID, SID, 7L, jwtDeadline);
        session.setRefreshTokenHash(service.hashRefreshToken(original));
        when(sessions.rotateRefreshTokenIfMatch(eq(SID), anyString(), anyString(), eq(deadline), any(), any(), eq(CUSTOMER_ID)))
                .thenAnswer(call -> {
                    assertEquals(session.getRefreshTokenHash(), call.getArgument(1));
                    session.setRefreshTokenHash(call.getArgument(2));
                    session.setLastSeenAt(call.getArgument(4));
                    return 1;
                });
        String current = original;
        for (int i = 0; i < 2; i++) {
            com.corebanking.dto.CusRefreshTokenRequest request = new com.corebanking.dto.CusRefreshTokenRequest();
            request.setRefreshToken(current);
            com.corebanking.dto.CusTokenResponse response = service.refreshToken(request);
            current = response.getRefreshToken();
            io.jsonwebtoken.Claims claims = jwt.getClaims(current);
            assertEquals("CORPORATE_USER", claims.get("subjectType"));
            assertEquals("REFRESH", claims.get("tokenType"));
            assertFalse(claims.getExpiration().after(jwtDeadline));
            assertEquals(issued, session.getIssuedAt());
            assertEquals(deadline, session.getRefreshExpiresAt());
            now.set(now.get().plusMinutes(1));
        }
        now.set(deadline);
        session.setLastSeenAt(deadline.minusSeconds(1));
        com.corebanking.dto.CusRefreshTokenRequest expired = new com.corebanking.dto.CusRefreshTokenRequest();
        expired.setRefreshToken(current);
        assertThrows(com.corebanking.exception.CusSessionExpiredException.class, () -> service.refreshToken(expired));
        verify(sessions, times(2)).rotateRefreshTokenIfMatch(eq(SID), anyString(), anyString(), eq(deadline), any(), any(), eq(CUSTOMER_ID));
    }

    @Test
    void concurrentRevocationOrExpiryRejectsAtomicTouchWithoutEntitySave() throws Exception {
        when(context.getBean(CusCorporateSessionActivityRepository.class).touchIfActive(SID, 7L)).thenReturn(0);
        mvc.perform(get(ENDPOINT).header("Authorization", "Bearer " + accessToken()))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("SESSION_EXPIRED"));
        verify(sessions, never()).save(any());
    }

    private String accessToken() { return jwt.generateCorporateAccessToken(CUSTOMER_ID, SID, 7L); }

    private CusJwtService syntheticSigner(String key, long ttl) {
        CusJwtService signer = new CusJwtService();
        ReflectionTestUtils.setField(signer, "jwtSecret", Base64.getEncoder().encodeToString(key.getBytes(StandardCharsets.UTF_8)));
        ReflectionTestUtils.setField(signer, "jwtIssuer", ISSUER);
        ReflectionTestUtils.setField(signer, "accessTokenExpiration", ttl);
        return signer;
    }

    @Configuration(proxyBeanMethods = false)
    @EnableWebMvc
    @EnableWebSecurity
    @Import({CorporateSecurityConfig.class, CusCorporateAuthController.class})
    static class HttpTestConfiguration {
        @Bean CusCorporateSessionActivityRepository activity() { return mock(CusCorporateSessionActivityRepository.class); }
        @Bean CusJwtService jwtService() {
            CusJwtService signer = new CusJwtService();
            ReflectionTestUtils.setField(signer, "jwtSecret", Base64.getEncoder().encodeToString(KEY));
            ReflectionTestUtils.setField(signer, "jwtIssuer", ISSUER);
            ReflectionTestUtils.setField(signer, "accessTokenExpiration", 300_000L);
            return signer;
        }
        @Bean CusAuthSessionsRepository sessions() { return mock(CusAuthSessionsRepository.class); }
        @Bean CusCorporateCredentialRepository credentials() { return mock(CusCorporateCredentialRepository.class); }
        @Bean CusCredentialsRepository individualCredentials() { return mock(CusCredentialsRepository.class); }
        @Bean CusAuditLogsRepository audit() { return mock(CusAuditLogsRepository.class); }
        @Bean CusJwtRevokedTokensRepository revokedTokens() { return mock(CusJwtRevokedTokensRepository.class); }
        @Bean CorsConfigurationSource corsConfigurationSource() {
            UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
            source.registerCorsConfiguration("/**", new CorsConfiguration());
            return source;
        }
        @Bean CusCorporateJwtAuthenticationFilter jwtFilter(CusJwtService jwt, CusCorporateSessionService sessions,
                CusJwtRevokedTokensRepository revoked) {
            return new CusCorporateJwtAuthenticationFilter(jwt, sessions, revoked);
        }
    }
}
