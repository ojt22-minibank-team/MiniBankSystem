package com.corebanking.security;

import com.corebanking.config.CusSecurityConfig;
import com.corebanking.controller.CusAuthController;
import com.corebanking.entity.AuthSession;
import com.corebanking.entity.CustomerCredentials;
import com.corebanking.entity.Customers;
import com.corebanking.entity.enums.CustomerStatus;
import com.corebanking.entity.enums.CustomerType;
import com.corebanking.entity.enums.SessionSubjectType;
import com.corebanking.repository.*;
import com.corebanking.service.CusAuthService;
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
 * Actual production Individual SecurityFilterChain + JWT filter + JWT/session
 * services + controller in Spring MVC. Only repositories and the unused facade
 * are mocked. No Boot application, component scan, datasource, real database,
 * credential files, mock authenticated users, Staff or Corporate security chain.
 */
class CusKeepAliveSecurityIntegrationTest {
    private static final String ENDPOINT = "/api/customer/auth/session/keep-alive";
    private static final String ISSUER = "isolated-http-test";
    private static final byte[] KEY = "test-only-http-individual-signing-key-0001".getBytes(StandardCharsets.UTF_8);
    private static final UUID CUSTOMER_ID = UUID.fromString("11111111-1111-4111-8111-111111111111");
    private static final String SID = "22222222-2222-4222-8222-222222222222";
    private AnnotationConfigWebApplicationContext context;
    private MockMvc mvc;
    private CusAuthSessionsRepository sessions;
    private CusCredentialsRepository credentials;
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
        context.addBeanFactoryPostProcessor(factory ->
                factory.registerSingleton("unusedControllerFacade", mock(CusAuthService.class)));
        context.register(HttpTestConfiguration.class);
        context.refresh();
        assertEquals(0, context.getBeanNamesForType(javax.sql.DataSource.class).length);
        assertEquals(0, context.getBeanNamesForType(jakarta.persistence.EntityManagerFactory.class).length);
        mvc = MockMvcBuilders.webAppContextSetup(context)
                .addFilters(context.getBean("springSecurityFilterChain", Filter.class)).build();
        sessions = context.getBean(CusAuthSessionsRepository.class);
        credentials = context.getBean(CusCredentialsRepository.class);
        revokedTokens = context.getBean(CusJwtRevokedTokensRepository.class);
        jwt = context.getBean(CusJwtService.class);
        now.set(LocalDateTime.now());
        Customers customer = Customers.builder().customerId(CUSTOMER_ID)
                .customerType(CustomerType.PERSONAL).status(CustomerStatus.ACTIVE).build();
        session = AuthSession.builder().sessionUuid(SID).subjectType(SessionSubjectType.CUSTOMER)
                .customer(customer).tokenVersionAtIssue(7L).issuedAt(now.get().minusHours(1))
                .refreshExpiresAt(now.get().plusHours(23)).lastSeenAt(now.get().minusMinutes(1))
                .idleTimeoutMinutes(5).build();
        when(sessions.findBySessionUuid(SID)).thenAnswer(call -> Optional.of(session));
        when(credentials.findById(CUSTOMER_ID)).thenReturn(Optional.of(
                CustomerCredentials.builder().customerId(CUSTOMER_ID).customer(customer).tokenVersion(7L).build()));
        com.corebanking.service.CusSessionActivityTestSupport.wire(context.getBean(CusSessionService.class), sessions, () -> session);
        when(sessions.revokeIfActive(eq(SID), anyString(), any(), any(), any(), any())).thenReturn(1);
        clock = mockStatic(LocalDateTime.class, CALLS_REAL_METHODS);
        clock.when(LocalDateTime::now).thenAnswer(call -> now.get());
    }

    @AfterEach
    void closeIsolatedContext() {
        try {
            if (context != null && context.isActive()) {
                verifyNoInteractions(context.getBean(CusCorporateCredentialRepository.class), context.getBean(CusAuthService.class));
            }
        } finally {
            if (clock != null) clock.close();
            SecurityContextHolder.clearContext();
            if (context != null) context.close();
        }
    }

    @Test
    void validIndividualJwtReachesControllerAndUpdatesActivityThroughProductionChain() throws Exception {
        LocalDateTime issued = session.getIssuedAt();
        LocalDateTime deadline = session.getRefreshExpiresAt();
        mvc.perform(get(ENDPOINT).header("Authorization", "Bearer " + accessToken()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Session is active."));
        assertEquals(now.get(), session.getLastSeenAt());
        assertEquals(issued, session.getIssuedAt());
        assertEquals(deadline, session.getRefreshExpiresAt());
        verify(sessions).touchIfValid(eq(SID), eq(SessionSubjectType.CUSTOMER), eq(CUSTOMER_ID), eq(7L), any(), any());
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
        String token = otherSigner.generateAccessToken(CUSTOMER_ID, SID, 7L);
        mvc.perform(get(ENDPOINT).header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.message").value("Invalid authentication token."));
        verifyNoInteractions(sessions, credentials, revokedTokens);
    }

    @Test
    void expiredRealGeneratedAccessJwtIsRejectedBeforeSessionLookup() throws Exception {
        CusJwtService expiredSigner = syntheticSigner(new String(KEY, StandardCharsets.UTF_8), -60_000L);
        String token = expiredSigner.generateAccessToken(CUSTOMER_ID, SID, 7L);
        mvc.perform(get(ENDPOINT).header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.message").value("Access token has expired."));
        verifyNoInteractions(sessions, credentials, revokedTokens);
    }

    @Test
    void revokedCustomerSessionIsRejectedEvenWithValidSignature() throws Exception {
        session.setRevokedAt(now.get().minusSeconds(1));
        mvc.perform(get(ENDPOINT).header("Authorization", "Bearer " + accessToken()))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.message").value("Authentication session has been revoked."));
        verify(sessions, never()).save(any());
    }

    @ParameterizedTest
    @ValueSource(ints = {300, 301})
    void idleSessionAtOrBeyondFiveMinutesIsRejectedThroughFilter(int idleSeconds) throws Exception {
        session.setLastSeenAt(now.get().minusSeconds(idleSeconds));
        mvc.perform(get(ENDPOINT).header("Authorization", "Bearer " + accessToken()))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("SESSION_EXPIRED"))
                .andExpect(jsonPath("$.message").value("Session expired due to inactivity."));
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
        verify(sessions, times(1)).touchIfValid(eq(SID), eq(SessionSubjectType.CUSTOMER), eq(CUSTOMER_ID), eq(7L), any(), any());
        verify(sessions, never()).save(any());
        assertEquals(deadline, session.getRefreshExpiresAt());
    }

    @Test
    void refreshJwtCannotBeUsedAsKeepAliveAccessJwt() throws Exception {
        String token = jwt.generateRefreshToken(CUSTOMER_ID, SID, 7L,
                new java.util.Date(System.currentTimeMillis() + 60_000));
        mvc.perform(get(ENDPOINT).header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.message").value("Access token is required."));
        verifyNoInteractions(sessions, credentials, revokedTokens);
    }

    private String accessToken() { return jwt.generateAccessToken(CUSTOMER_ID, SID, 7L); }

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
    @Import({CusSecurityConfig.class, CusAuthController.class})
    static class HttpTestConfiguration {
        @Bean CusJwtService jwtService() { return new CusJwtService(); }
        @Bean CusAuthSessionsRepository sessions() { return mock(CusAuthSessionsRepository.class); }
        @Bean CusCredentialsRepository credentials() { return mock(CusCredentialsRepository.class); }
        @Bean CusAuditLogsRepository audit() { return mock(CusAuditLogsRepository.class); }
        @Bean CusCorporateCredentialRepository corporate() { return mock(CusCorporateCredentialRepository.class); }
        @Bean CusJwtRevokedTokensRepository revokedTokens() { return mock(CusJwtRevokedTokensRepository.class); }
        @Bean jakarta.persistence.EntityManager entityManager() { return mock(jakarta.persistence.EntityManager.class); }
        @Bean CusSessionService sessionService(CusAuthSessionsRepository sessions, CusCredentialsRepository credentials,
                CusAuditLogsRepository audit, CusCorporateCredentialRepository corporate) {
            return new CusSessionService(sessions, credentials, audit, corporate);
        }
        @Bean CusJwtAuthenticationFilter jwtFilter(CusJwtService jwt, CusSessionService sessions,
                CusJwtRevokedTokensRepository revoked) {
            return new CusJwtAuthenticationFilter(jwt, sessions, revoked);
        }
    }
}
