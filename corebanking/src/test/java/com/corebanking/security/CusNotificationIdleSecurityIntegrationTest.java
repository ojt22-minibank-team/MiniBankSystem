package com.corebanking.security;

import com.corebanking.config.CusSecurityConfig;
import com.corebanking.controller.CusAuthController;
import com.corebanking.controller.CusNotificationController;
import com.corebanking.dto.NotificationResponseDto;
import com.corebanking.service.CusNotificationService;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Actual production Individual SecurityFilterChain + JWT filter + JWT/session
 * services + controllers in Spring MVC. Repositories, notification business service,
 * and the unused facade are mocked. No application properties or Boot context.
 * The explicitly gated JDBC test verifies transaction advice with isolated MySQL,
 * not Hibernate mappings. Other tests have no datasource or real customer records.
 */
class CusNotificationIdleSecurityIntegrationTest {
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
    private CusNotificationService notifications;
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
        notifications = context.getBean(CusNotificationService.class);
        when(notifications.getUnreadCount(CUSTOMER_ID.toString())).thenReturn(7L);
        when(notifications.getMyNotifications(CUSTOMER_ID.toString())).thenReturn(java.util.List.of(
                NotificationResponseDto.builder().notificationId(1L).title("Synthetic notification").build()));
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
        // Model a subsequent DB read observing the atomic revocation, not a JPA entity write.
        when(sessions.revokeIfActive(eq(SID), anyString(), any(), any(), any(), any())).thenAnswer(call -> {
            if (session.getRevokedAt() != null) return 0;
            session.setRevokedAt(call.getArgument(2));
            session.setRevokeReason(call.getArgument(1));
            return 1;
        });
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

    @ParameterizedTest
    @ValueSource(strings = {"/api/customer/notifications", "/api/customer/notifications/unread-count"})
    void validNotificationReadReturnsDataAndDoesNotWriteActivity(String path) throws Exception {
        LocalDateTime lastSeen = session.getLastSeenAt();
        LocalDateTime issued = session.getIssuedAt();
        LocalDateTime deadline = session.getRefreshExpiresAt();
        var result = mvc.perform(get(path).header("Authorization", "Bearer " + accessToken()))
                .andExpect(status().isOk());
        if (path.endsWith("unread-count")) {
            result.andExpect(jsonPath("$.unreadCount").value(7));
            verify(notifications).getUnreadCount(CUSTOMER_ID.toString());
        } else {
            result.andExpect(jsonPath("$[0].title").value("Synthetic notification"));
            verify(notifications).getMyNotifications(CUSTOMER_ID.toString());
        }
        assertEquals(lastSeen, session.getLastSeenAt());
        assertEquals(issued, session.getIssuedAt());
        assertEquals(deadline, session.getRefreshExpiresAt());
        assertNull(session.getUpdatedById());
        verify(sessions, never()).save(any());
        verify(sessions, never()).touchIfValid(anyString(), any(), any(), anyLong(), any(), any());
        verify(sessions, never()).revokeIfActive(anyString(), anyString(), any(), any(), any(), any());
    }

    @ParameterizedTest
    @ValueSource(strings = {"/api/customer/notifications", "/api/customer/notifications/unread-count"})
    void repeatedPollingCannotMoveTheFiveMinuteBoundaryOrReviveTheSession(String path) throws Exception {
        LocalDateTime start = now.get();
        session.setLastSeenAt(start);
        String token = accessToken();
        for (int seconds = 0; seconds < 300; seconds += 20) {
            now.set(start.plusSeconds(seconds));
            mvc.perform(get(path).header("Authorization", "Bearer " + token)).andExpect(status().isOk());
            assertEquals(start, session.getLastSeenAt());
        }
        now.set(start.plusSeconds(299));
        mvc.perform(get(path).header("Authorization", "Bearer " + token)).andExpect(status().isOk());
        now.set(start.plusSeconds(300));
        mvc.perform(get(path).header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("SESSION_EXPIRED"));
        verify(sessions).revokeIfActive(eq(SID), eq("IDLE_TIMEOUT"), eq(now.get()), any(), any(), eq(now.get()));
        assertEquals(start, session.getLastSeenAt());
        assertNotNull(session.getRevokedAt());
        now.set(start.plusSeconds(320));
        mvc.perform(get(path).header("Authorization", "Bearer " + token)).andExpect(status().isUnauthorized());
        assertEquals(start, session.getLastSeenAt());
        verify(sessions, never()).save(any());
        verify(sessions, never()).touchIfValid(anyString(), any(), any(), anyLong(), any(), any());
    }

    @ParameterizedTest
    @ValueSource(strings = {"/api/customer/notifications", "/api/customer/notifications/unread-count"})
    void sessionBeyondIdleDeadlineIsRejected(String path) throws Exception {
        session.setLastSeenAt(now.get().minusMinutes(5).minusSeconds(1));
        mvc.perform(get(path).header("Authorization", "Bearer " + accessToken()))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("SESSION_EXPIRED"));
        verifyNoInteractions(notifications);
        verify(sessions, never()).save(any());
        verify(sessions, never()).touchIfValid(anyString(), any(), any(), anyLong(), any(), any());
    }

    @ParameterizedTest
    @ValueSource(strings = {"/api/customer/notifications", "/api/customer/notifications/unread-count"})
    void missingAuthorizationIsRejected(String path) throws Exception {
        mvc.perform(get(path)).andExpect(status().isUnauthorized());
        verifyNoInteractions(notifications, sessions, credentials, revokedTokens);
    }

    @ParameterizedTest
    @ValueSource(strings = {"/api/customer/notifications", "/api/customer/notifications/unread-count"})
    void revokedJtiIsRejectedBeforeSessionLookup(String path) throws Exception {
        when(revokedTokens.existsByJti(anyString())).thenReturn(true);
        mvc.perform(get(path).header("Authorization", "Bearer " + accessToken()))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(sessions, credentials, notifications);
    }

    @ParameterizedTest
    @ValueSource(strings = {"/api/customer/notifications", "/api/customer/notifications/unread-count"})
    void revokedSessionIsRejected(String path) throws Exception {
        session.setRevokedAt(now.get().minusSeconds(1));
        mvc.perform(get(path).header("Authorization", "Bearer " + accessToken()))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(notifications);
        verify(sessions, never()).save(any());
        verify(sessions, never()).touchIfValid(anyString(), any(), any(), anyLong(), any(), any());
    }

    @ParameterizedTest
    @ValueSource(strings = {"/api/customer/notifications", "/api/customer/notifications/unread-count"})
    void expiredJwtIsRejectedBeforeSessionLookup(String path) throws Exception {
        String expired = syntheticSigner(new String(KEY, StandardCharsets.UTF_8), -60_000L)
                .generateAccessToken(CUSTOMER_ID, SID, 7L);
        mvc.perform(get(path).header("Authorization", "Bearer " + expired))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.message").value("Access token has expired."));
        verifyNoInteractions(sessions, credentials, notifications);
    }

    @ParameterizedTest
    @ValueSource(strings = {"/api/customer/notifications", "/api/customer/notifications/unread-count"})
    void wrongSignatureIsRejected(String path) throws Exception {
        String wrong = syntheticSigner("synthetic-other-notification-key-00000000000", 300_000L)
                .generateAccessToken(CUSTOMER_ID, SID, 7L);
        mvc.perform(get(path).header("Authorization", "Bearer " + wrong)).andExpect(status().isUnauthorized());
        verifyNoInteractions(sessions, credentials, notifications);
    }

    @ParameterizedTest
    @ValueSource(strings = {"/api/customer/notifications", "/api/customer/notifications/unread-count"})
    void refreshTokenCannotAccessNotifications(String path) throws Exception {
        String refresh = jwt.generateRefreshToken(CUSTOMER_ID, SID, 7L,
                new java.util.Date(System.currentTimeMillis() + 60_000));
        mvc.perform(get(path).header("Authorization", "Bearer " + refresh)).andExpect(status().isUnauthorized());
        verifyNoInteractions(sessions, credentials, notifications);
    }

    @ParameterizedTest
    @ValueSource(strings = {"/api/customer/notifications", "/api/customer/notifications/unread-count"})
    void corporateAccessTokenCannotAccessIndividualNotifications(String path) throws Exception {
        String corporate = jwt.generateCorporateAccessToken(CUSTOMER_ID, SID, 7L);
        mvc.perform(get(path).header("Authorization", "Bearer " + corporate)).andExpect(status().isUnauthorized());
        verifyNoInteractions(notifications, context.getBean(CusCorporateCredentialRepository.class));
    }

    @ParameterizedTest
    @ValueSource(strings = {"/api/customer/notifications", "/api/customer/notifications/unread-count"})
    void changedCredentialTokenVersionIsRejected(String path) throws Exception {
        when(credentials.findById(CUSTOMER_ID)).thenReturn(Optional.of(
                CustomerCredentials.builder().customerId(CUSTOMER_ID).customer(session.getCustomer()).tokenVersion(8L).build()));
        mvc.perform(get(path).header("Authorization", "Bearer " + accessToken())).andExpect(status().isUnauthorized());
        verifyNoInteractions(notifications);
        verify(sessions, never()).save(any());
        verify(sessions, never()).touchIfValid(anyString(), any(), any(), anyLong(), any(), any());
    }

    @ParameterizedTest
    @ValueSource(strings = {"/api/customer/notifications", "/api/customer/notifications/unread-count"})
    void absoluteExpiryIsEnforcedDespiteRecentActivity(String path) throws Exception {
        session.setIssuedAt(now.get().minusHours(24));
        session.setRefreshExpiresAt(now.get().plusHours(1));
        session.setLastSeenAt(now.get().minusSeconds(1));
        mvc.perform(get(path).header("Authorization", "Bearer " + accessToken()))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("SESSION_EXPIRED"));
        verify(sessions).revokeIfActive(eq(SID), eq("SESSION_EXPIRED"), eq(now.get()), any(), any(), eq(now.get()));
        verifyNoInteractions(notifications);
        verify(sessions, never()).save(any());
        verify(sessions, never()).touchIfValid(anyString(), any(), any(), anyLong(), any(), any());
    }

    @Test
    void realActivityKeepAliveStillMovesIdleDeadline() throws Exception {
        LocalDateTime start = now.get();
        session.setLastSeenAt(start);
        String token = accessToken();
        now.set(start.plusMinutes(4));
        mvc.perform(get("/api/customer/notifications").header("Authorization", "Bearer " + token)).andExpect(status().isOk());
        assertEquals(start, session.getLastSeenAt());
        mvc.perform(get(ENDPOINT).header("Authorization", "Bearer " + token)).andExpect(status().isOk());
        assertEquals(now.get(), session.getLastSeenAt());
        now.set(start.plusMinutes(6));
        mvc.perform(get("/api/customer/notifications/unread-count").header("Authorization", "Bearer " + token)).andExpect(status().isOk());
        assertEquals(start.plusMinutes(4), session.getLastSeenAt());
        verify(sessions, times(1)).touchIfValid(eq(SID), eq(SessionSubjectType.CUSTOMER), eq(CUSTOMER_ID), eq(7L), any(), any());
        verify(sessions, never()).save(any());
    }

    @Test
    void notificationReadMutationsRetainNormalActivityUpdatesAndResponse() throws Exception {
        when(notifications.markAsRead(CUSTOMER_ID.toString(), 42L)).thenReturn(true);
        when(notifications.markAllAsRead(CUSTOMER_ID.toString())).thenReturn(4);
        String token = accessToken();
        mvc.perform(patch("/api/customer/notifications/42/read").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andExpect(jsonPath("$.success").value(true));
        assertEquals(now.get(), session.getLastSeenAt());
        now.set(now.get().plusSeconds(30));
        mvc.perform(put("/api/customer/notifications/read-all").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andExpect(jsonPath("$.updatedCount").value(4));
        assertEquals(now.get(), session.getLastSeenAt());
        verify(sessions, times(2)).touchIfValid(eq(SID), eq(SessionSubjectType.CUSTOMER), eq(CUSTOMER_ID), eq(7L), any(), any());
        verify(sessions, never()).save(any());
        verify(notifications).markAsRead(CUSTOMER_ID.toString(), 42L);
        verify(notifications).markAllAsRead(CUSTOMER_ID.toString());
    }

    @Test
    void queryParametersDoNotTurnNotificationReadsIntoActivity() throws Exception {
        LocalDateTime lastSeen = session.getLastSeenAt();
        mvc.perform(get("/api/customer/notifications?poll=true").header("Authorization", "Bearer " + accessToken()))
                .andExpect(status().isOk());
        assertEquals(lastSeen, session.getLastSeenAt());
        verify(sessions, never()).save(any());
        verify(sessions, never()).touchIfValid(anyString(), any(), any(), anyLong(), any(), any());
    }

    @Test
    void onlyExactGetPathsSkipActivityAndClientHeadersCannotSelectIt() throws Exception {
        String token = accessToken();
        mvc.perform(head("/api/customer/notifications").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
        now.set(now.get().plusSeconds(1));
        mvc.perform(get("/api/customer/notifications-extra").header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
        now.set(now.get().plusSeconds(1));
        mvc.perform(get(ENDPOINT).header("Authorization", "Bearer " + token).header("X-No-Activity", "true"))
                .andExpect(status().isOk());
        assertEquals(now.get(), session.getLastSeenAt());
        verify(sessions, times(3)).touchIfValid(eq(SID), eq(SessionSubjectType.CUSTOMER), eq(CUSTOMER_ID), eq(7L), any(), any());
        verify(sessions, never()).save(any());
    }

    @Test
    void noActivityValidationKeepsWriteCapableTransactionAndExpirationCommitRule() throws Exception {
        var source = new org.springframework.transaction.annotation.AnnotationTransactionAttributeSource();
        var method = CusSessionService.class.getMethod("validateAccessSessionWithoutActivity", io.jsonwebtoken.Claims.class);
        var transaction = source.getTransactionAttribute(method, CusSessionService.class);
        assertNotNull(transaction);
        assertFalse(transaction.isReadOnly());
        assertFalse(transaction.rollbackOn(new com.corebanking.exception.CusSessionExpiredException("expiry")));
        assertTrue(transaction.rollbackOn(new IllegalStateException("persistence failure")));
    }

    @Test
    @org.junit.jupiter.api.condition.EnabledIfSystemProperty(named = "corporate.test.jdbcUrl",
            matches = "jdbc:mysql://127\\.0\\.0\\.1:[0-9]+/corporate_session_race_test\\?.*")
    void isolatedJdbcRevocationCommitsWhenNoActivityValidationThrowsExpiration() {
        var dataSource = new org.springframework.jdbc.datasource.DriverManagerDataSource(
                System.getProperty("corporate.test.jdbcUrl"), "root", "test-only-corporate-race");
        var jdbc = new org.springframework.jdbc.core.JdbcTemplate(dataSource);
        session.setLastSeenAt(session.getLastSeenAt().withNano(0));
        jdbc.execute("CREATE TABLE IF NOT EXISTS notification_idle_probe (sid VARCHAR(36) PRIMARY KEY, last_seen_at DATETIME(6), revoked_at DATETIME(6)) ENGINE=InnoDB");
        jdbc.update("DELETE FROM notification_idle_probe");
        jdbc.update("INSERT INTO notification_idle_probe VALUES (?, ?, NULL)", SID, session.getLastSeenAt());
        when(sessions.revokeIfActive(eq(SID), anyString(), any(), any(), any(), any())).thenAnswer(call ->
                jdbc.update("UPDATE notification_idle_probe SET revoked_at = ? WHERE sid = ? AND revoked_at IS NULL", call.getArgument(2), SID));
        var advice = new org.springframework.transaction.interceptor.TransactionInterceptor();
        advice.setTransactionManager(new org.springframework.jdbc.datasource.DataSourceTransactionManager(dataSource));
        advice.setTransactionAttributeSource(new org.springframework.transaction.annotation.AnnotationTransactionAttributeSource());
        var factory = new org.springframework.aop.framework.ProxyFactory(context.getBean(CusSessionService.class));
        factory.setProxyTargetClass(true);
        factory.addAdvice(advice);
        var proxy = (CusSessionService) factory.getProxy();
        var claims = jwt.getClaims(accessToken());
        assertSame(session, proxy.validateAccessSessionWithoutActivity(claims));
        assertEquals(session.getLastSeenAt(),
                jdbc.queryForObject("SELECT last_seen_at FROM notification_idle_probe", LocalDateTime.class));
        now.set(session.getLastSeenAt().plusMinutes(5));
        assertThrows(com.corebanking.exception.CusSessionExpiredException.class,
                () -> proxy.validateAccessSessionWithoutActivity(claims));
        assertNotNull(jdbc.queryForObject("SELECT revoked_at FROM notification_idle_probe", LocalDateTime.class),
                "Revocation must remain committed after the expiration exception crosses the Spring proxy");
        verify(sessions, never()).save(any());
        verify(sessions, never()).touchIfValid(anyString(), any(), any(), anyLong(), any(), any());
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
    @Import({CusSecurityConfig.class, CusAuthController.class, CusNotificationController.class})
    static class HttpTestConfiguration {
        @Bean CusNotificationService notifications() { return mock(CusNotificationService.class); }
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
